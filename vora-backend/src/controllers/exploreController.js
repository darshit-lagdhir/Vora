import pool from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';

// Global query cache map
const exploreCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Regular cache cleanup interval to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of exploreCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      exploreCache.delete(key);
    }
  }
}, 30000);

/**
 * Explore Published Events (GET /api/v1/explore/events)
 * Fully public, unauthenticated, optimized endpoint.
 */
export const exploreEvents = asyncHandler(async (req, res, next) => {
  const { search, tags, start_date, end_date, sort, page, limit } = req.query;

  // 1. Extraction and Sanitization
  const cleanSearch = search ? search.trim().replace(/[^a-zA-Z0-9\s-]/g, '') : '';
  
  let tagList = [];
  if (tags) {
    tagList = typeof tags === 'string' 
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : Array.isArray(tags) 
        ? tags.map(t => String(t).trim()).filter(Boolean)
        : [];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (parsedPage - 1) * parsedLimit;

  // Generate unique cache key based on sanitized input parameters
  const cacheKeyObj = {
    cleanSearch,
    tagList,
    start_date: start_date || '',
    end_date: end_date || '',
    sort: sort || '',
    page: parsedPage,
    limit: parsedLimit
  };
  const cacheKey = JSON.stringify(cacheKeyObj);

  // 2. Check Cache
  const now = Date.now();
  if (exploreCache.has(cacheKey)) {
    const cachedEntry = exploreCache.get(cacheKey);
    if (now - cachedEntry.timestamp < CACHE_TTL_MS) {
      return res.status(200).json(cachedEntry.payload);
    }
  }

  // 3. Build SQL Query
  const conditions = [
    "e.status IN ('published', 'active')",
    "e.start_timestamp >= NOW()"
  ];
  const queryParams = [];

  // Search filter (PostgreSQL Text Search Vector)
  let searchRankExpr = '';
  if (cleanSearch) {
    queryParams.push(cleanSearch.trim().split(/\s+/).join(' & '));
    const paramIndex = queryParams.length;
    conditions.push(`to_tsvector('english', e.title || ' ' || COALESCE(e.description, '')) @@ to_tsquery('english', $${paramIndex})`);
    searchRankExpr = `, ts_rank(to_tsvector('english', e.title || ' ' || COALESCE(e.description, '')), to_tsquery('english', $${paramIndex})) as search_rank`;
  }

  // Tags filter (Array Overlap)
  if (tagList.length > 0) {
    queryParams.push(tagList);
    const paramIndex = queryParams.length;
    conditions.push(`e.tags && $${paramIndex}`);
  }

  // Chronological limits
  if (start_date) {
    const startDateVal = new Date(start_date);
    if (!isNaN(startDateVal.getTime())) {
      queryParams.push(startDateVal.toISOString());
      conditions.push(`e.start_timestamp >= $${queryParams.length}`);
    }
  }

  if (end_date) {
    const endDateVal = new Date(end_date);
    if (!isNaN(endDateVal.getTime())) {
      queryParams.push(endDateVal.toISOString());
      conditions.push(`e.end_timestamp <= $${queryParams.length}`);
    }
  }

  // Compile conditions block
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Order logic (Ascending start date or Descending search relevancy ranking)
  let orderClause = 'ORDER BY e.start_timestamp ASC';
  if (sort === 'relevancy' && cleanSearch) {
    orderClause = 'ORDER BY search_rank DESC, e.start_timestamp ASC';
  } else if (sort === 'date_desc') {
    orderClause = 'ORDER BY e.start_timestamp DESC';
  }

  // Construct final queries
  // 1. Data Query (includes left joins and registrations count subquery)
  const dataQueryText = `
    SELECT e.id, e.title, e.description, e.start_timestamp, e.end_timestamp, e.status, 
           e.maximum_capacity, e.banner_image_url, e.tags, e.created_at,
           p.first_name as organizer_first_name, p.last_name as organizer_last_name, p.avatar_url as organizer_avatar_url,
           COALESCE(r.confirmed_count, 0)::integer as confirmed_attendees,
           (COALESCE(r.confirmed_count, 0)::integer >= e.maximum_capacity) as is_sold_out
           ${searchRankExpr}
    FROM events e
    LEFT JOIN profiles p ON e.organizer_id = p.id
    LEFT JOIN (
      SELECT event_id, COUNT(*)::integer as confirmed_count
      FROM registrations
      WHERE registration_status = 'confirmed'
      GROUP BY event_id
    ) r ON r.event_id = e.id
    ${whereClause}
    ${orderClause}
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  // 2. Count Query
  const countQueryText = `
    SELECT COUNT(*)::integer as total_count
    FROM events e
    ${whereClause}
  `;

  // Execute queries
  const dataParams = [...queryParams, parsedLimit, offset];
  const dataResult = await pool.query(dataQueryText, dataParams);
  const countResult = await pool.query(countQueryText, queryParams);

  const totalCount = countResult.rows[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / parsedLimit);

  // Payload structure
  const responsePayload = {
    success: true,
    meta: {
      total_items: totalCount,
      total_pages: totalPages,
      current_page: parsedPage,
      limit: parsedLimit
    },
    data: dataResult.rows
  };

  // Cache response payload
  exploreCache.set(cacheKey, {
    timestamp: Date.now(),
    payload: responsePayload
  });

  res.status(200).json(responsePayload);
});
