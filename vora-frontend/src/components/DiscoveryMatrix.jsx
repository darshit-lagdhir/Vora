import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  Compass, 
  CheckCircle, 
  AlertCircle, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient, { useRetryState } from '../services/apiClient.js';
import ProgressiveImage from './ui/ProgressiveImage.jsx';
import SEOMatrix from './ui/SEOMatrix.jsx';

// Available technical tags for filtering
const AVAILABLE_TAGS = [
  'React', 'Quantum', 'Kubernetes', 'Cybersecurity', 'Database',
  'Microservices', 'API Design', 'DevOps', 'Machine Learning', 'Serverless'
];

// Available event categories matching Phase 8 directives
const CATEGORIES = ['All Events', 'Upcoming', 'Technology', 'Design', 'Business'];

/**
 * Filter events client-side based on custom category logic.
 */
const getFilteredEvents = (eventsList, category) => {
  if (!category || category === 'All Events' || category === 'All') return eventsList;
  const cat = category.toLowerCase();
  
  if (cat === 'upcoming') {
    const now = new Date();
    return eventsList.filter(event => new Date(event.start_timestamp) >= now);
  }
  
  if (cat === 'technology') {
    return eventsList.filter(event => {
      const title = (event.title || '').toLowerCase();
      const desc = (event.description || '').toLowerCase();
      const tags = (event.tags || []).map(t => t.toLowerCase());
      return title.includes('tech') || title.includes('quantum') || title.includes('kubernetes') || 
             title.includes('cyber') || title.includes('database') || title.includes('api') || 
             title.includes('devops') || title.includes('serverless') || title.includes('learning') ||
             title.includes('react') || title.includes('code') || title.includes('programming') ||
             desc.includes('tech') || desc.includes('quantum') || desc.includes('kubernetes') || 
             desc.includes('cyber') || desc.includes('database') || desc.includes('api') || 
             desc.includes('devops') || desc.includes('serverless') || desc.includes('learning') ||
             desc.includes('react') || desc.includes('code') || desc.includes('programming') ||
             tags.some(t => t.includes('tech') || t.includes('react') || t.includes('quantum') || 
                            t.includes('kubernetes') || t.includes('cyber') || t.includes('database') || 
                            t.includes('api') || t.includes('devops') || t.includes('serverless') || 
                            t.includes('learning') || t.includes('machine learning'));
    });
  }
  
  if (cat === 'design') {
    return eventsList.filter(event => {
      const title = (event.title || '').toLowerCase();
      const desc = (event.description || '').toLowerCase();
      const tags = (event.tags || []).map(t => t.toLowerCase());
      return title.includes('design') || title.includes('ui') || title.includes('ux') || 
             title.includes('interface') || title.includes('art') || title.includes('creative') ||
             desc.includes('design') || desc.includes('ui') || desc.includes('ux') || 
             desc.includes('interface') || desc.includes('art') || desc.includes('creative') ||
             tags.some(t => t.includes('design') || t.includes('ui') || t.includes('ux') || 
                            t.includes('interface') || t.includes('creative'));
    });
  }
  
  if (cat === 'business') {
    return eventsList.filter(event => {
      const title = (event.title || '').toLowerCase();
      const desc = (event.description || '').toLowerCase();
      const tags = (event.tags || []).map(t => t.toLowerCase());
      return title.includes('business') || title.includes('market') || title.includes('startup') || 
             title.includes('finance') || title.includes('product') || title.includes('strategy') ||
             desc.includes('business') || desc.includes('market') || desc.includes('startup') || 
             desc.includes('finance') || desc.includes('product') || desc.includes('strategy') ||
             tags.some(t => t.includes('business') || t.includes('marketing') || t.includes('startup') || 
                            t.includes('finance') || t.includes('product') || t.includes('strategy'));
    });
  }
  
  return eventsList;
};

const formatEventDate = (timestampStr) => {
  if (!timestampStr) return '';
  const d = new Date(timestampStr);
  const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleDateString('en-US', options).toUpperCase();
};

const EventCard = React.memo(({ event, idx, isRegistered }) => {
  const isSoldOut = event.is_sold_out;

  const watermarkText = useMemo(() => {
    const title = (event.title || '').toLowerCase();
    const tags = (event.tags || []).map(t => t.toLowerCase());
    
    if (title.includes('design') || title.includes('ui') || title.includes('ux') || tags.includes('design')) {
      return 'D';
    }
    if (title.includes('tech') || title.includes('code') || tags.includes('react') || tags.includes('devops') || tags.includes('kubernetes')) {
      return 'T';
    }
    if (title.includes('business') || title.includes('market') || tags.includes('business') || tags.includes('finance')) {
      return 'B';
    }
    return (event.title || 'V').charAt(0).toUpperCase();
  }, [event]);

  return (
    <Link 
      to={`/event/${event.id}`}
      id={`event-card-${event.id}`}
      style={{ animationDelay: `${idx * 50}ms` }}
      className="event-card group overflow-hidden flex flex-col h-[420px] rounded-3xl relative select-none cursor-pointer animate-card-fade soft-glass"
    >
      {/* image header wrapper */}
      <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0 bg-zinc-950 border-b border-zinc-900 cursor-pointer">
        {event.banner_image_url ? (
          <ProgressiveImage 
            src={event.banner_image_url} 
            alt={event.title}
            aspectClass="aspect-[16/9]"
            className="w-full h-full"
            imgClassName="transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <>
            <div 
              className="procedural-bg absolute inset-0 transition-all duration-500"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 15% 20%, rgba(124, 58, 237, 0.15) 0%, transparent 40%),
                  radial-gradient(circle at 85% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 45%),
                  linear-gradient(135deg, #09090b 0%, #18181b 100%)
                `,
                backgroundSize: '150% 150%',
                backgroundPosition: 'center'
              }}
            />
            {/* Microscopic Dot Grid Pattern Overlay */}
            <div 
              className="absolute inset-0 opacity-[0.06] pointer-events-none" 
              style={{
                backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)`,
                backgroundSize: '10px 10px'
              }}
            />
            {/* SVG Line Arrays for Geometric Texture */}
            <svg className="absolute inset-0 w-full h-full stroke-white/[0.015] stroke-[0.75] pointer-events-none" fill="none">
              <line x1="0" y1="30%" x2="100%" y2="70%" />
              <line x1="0" y1="80%" x2="100%" y2="20%" />
            </svg>
          </>
        )}

        {/* Status Badge overlay */}
        <div className="absolute top-4 left-4 z-10">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] font-accent backdrop-blur-md ${
            isSoldOut 
              ? 'bg-zinc-950/60 text-zinc-500 border border-white/5' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isSoldOut ? 'bg-zinc-650' : 'bg-emerald-400 animate-pulse'}`} />
            {isSoldOut ? 'CAPACITY FULL' : 'UPCOMING'}
          </span>
        </div>
      </div>

      {/* Information / Metadata block */}
      <div className="p-5 flex-grow flex flex-col justify-between min-h-0 bg-gradient-to-b from-transparent to-white/[0.005] relative z-10">
        <div className="space-y-2.5 min-h-0 overflow-hidden text-left">
          
          {/* Chronological timestamp label */}
          <div className="text-[10px] font-clean-sans font-bold text-primary-500 tracking-wider flex items-center uppercase">
            <Clock className="w-3 h-3 mr-1.5 text-primary-500" />
            <span>{formatEventDate(event.start_timestamp)}</span>
          </div>

          {/* Event title clamped */}
          <h4 className="font-display font-bold text-xl sm:text-2xl text-zinc-100 group-hover:text-white leading-tight line-clamp-2" title={event.title}>
            {event.title}
          </h4>

          {/* Organizer profiles */}
          <div className="flex items-center space-x-2 text-zinc-400">
            {event.organizer_avatar_url ? (
              <img 
                src={event.organizer_avatar_url} 
                alt={`${event.organizer_first_name} avatar`} 
                className="w-4 h-4 rounded-full border border-zinc-800"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <User className="w-2.5 h-2.5 text-zinc-550" />
              </div>
            )}
            <span className="font-clean-sans text-[11px] font-medium text-zinc-400">
              By {event.organizer_first_name} {event.organizer_last_name}
            </span>
          </div>

          {/* Description block truncated */}
          <p className="font-sans text-xs text-zinc-450 leading-relaxed line-clamp-2">
            {event.description}
          </p>

          {/* Horizontal Tags layout */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {event.tags.slice(0, 3).map((t, i) => (
                <span key={i} className="text-[9px] bg-zinc-900/50 text-zinc-350 border border-zinc-850 px-2 py-0.5 rounded-md font-technical">
                  {t}
                </span>
              ))}
            </div>
          )}

        </div>

        {/* Symmetrical capacity and button footer row */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
          <span className="font-clean-sans text-zinc-550 text-xs font-semibold">
            {event.confirmed_attendees || 0}/{event.maximum_capacity || 250} Seats
          </span>
          <button 
            id={`btn-arrow-${event.id}`}
            className="arrow-button w-8 h-8 rounded-full bg-zinc-900/50 border border-white/5 flex items-center justify-center text-zinc-400 transition-all duration-300 shrink-0 cursor-pointer"
          >
            <ArrowRight className="arrow-icon w-4 h-4 transition-transform duration-300" />
          </button>
        </div>

      </div>

      {/* High-Fashion Watermark */}
      <span className="font-murmure absolute bottom-2 right-2 text-[140px] leading-none text-white opacity-5 select-none pointer-events-none z-0 transform translate-x-4 translate-y-6 rotate-[15deg]">
        {watermarkText}
      </span>
    </Link>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.confirmed_attendees === nextProps.event.confirmed_attendees &&
    prevProps.event.maximum_capacity === nextProps.event.maximum_capacity &&
    prevProps.event.title === nextProps.event.title &&
    prevProps.event.description === nextProps.event.description &&
    prevProps.event.is_sold_out === nextProps.event.is_sold_out &&
    prevProps.event.start_timestamp === nextProps.event.start_timestamp &&
    prevProps.isRegistered === nextProps.isRegistered &&
    prevProps.idx === nextProps.idx
  );
});

EventCard.displayName = 'EventCard';

export default function DiscoveryMatrix({ registeredEventIds = [], onRegister }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const retryState = useRetryState('/explore/events');

  // Read URL query states
  const searchParam = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || 'All Events';
  const tagsParam = searchParams.get('tags') || '';
  const pageParam = parseInt(searchParams.get('page'), 10) || 1;
  const activeTags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

  // Local state for search input (to allow fluid typing before debounce)
  const [searchInput, setSearchInput] = useState(searchParam);
  
  // Data states
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total_pages: 1, total_items: 0, current_page: 1, limit: 12 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Search Debouncer (400ms delay)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (searchInput.trim()) {
          next.set('search', searchInput);
        } else {
          next.delete('search');
        }
        next.set('page', '1');
        return next;
      });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchInput, setSearchParams]);

  // Fetch events list from the API server
  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        page: pageParam,
        limit: 12, // Symmetrical layout (3 cols x 4 rows is 12)
        search: searchParam,
        tags: tagsParam
      };
      
      const res = await apiClient.get('/api/v1/explore/events', { params: queryParams });
      if (res?.data?.success) {
        setEvents(res.data.data);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('[DiscoveryMatrix] API fetch failed:', err);
      setError(err.response?.data?.message || 'Failed to sync with the event discovery engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [searchParam, tagsParam, pageParam]);

  // Category filter click handler
  const handleCategoryChange = (category) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (category && category !== 'All Events') {
        next.set('category', category);
      } else {
        next.delete('category');
      }
      next.set('page', '1');
      return next;
    });
  };

  // Toggle taxonomy filters (Tech Tags)
  const handleToggleTag = (tag) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      let updatedTags = [...activeTags];
      
      if (updatedTags.includes(tag)) {
        updatedTags = updatedTags.filter(t => t !== tag);
      } else {
        updatedTags.push(tag);
      }

      if (updatedTags.length > 0) {
        next.set('tags', updatedTags.join(','));
      } else {
        next.delete('tags');
      }
      next.set('page', '1');
      return next;
    });
  };

  // Clear all search and filter conditions
  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  // Pagination page click trigger
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > meta.total_pages) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', newPage.toString());
      return next;
    });
    
    // Smooth scroll back to listings area top
    const gridEl = document.getElementById('discovery-matrix-container');
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Apply client-side category filter over API fetched events list (memoized to prevent search input typing lag)
  const filteredEvents = useMemo(() => {
    return getFilteredEvents(events, categoryParam);
  }, [events, categoryParam]);

  // Dynamically count category matches based on full fetched upcoming events (memoized)
  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach(cat => {
      counts[cat] = getFilteredEvents(events, cat).length;
    });
    return counts;
  }, [events]);

  const getEmptyStateText = () => {
    if (searchParam && categoryParam && categoryParam !== 'All Events') {
      return `We could not locate any upcoming events matching your search for '${searchParam}' in the '${categoryParam}' category. Please verify your spelling, or try removing specific category filters to broaden your discovery parameters.`;
    }
    if (searchParam) {
      return `We could not locate any upcoming events matching your search for '${searchParam}'. Please verify your spelling, or try removing specific search terms or filters to broaden your discovery parameters.`;
    }
    if (categoryParam && categoryParam !== 'All Events') {
      return `We could not locate any upcoming events matching the category '${categoryParam}'. Please try removing specific category filters to broaden your discovery parameters.`;
    }
    return `We could not find any upcoming events on the platform. Please check back later or modify your search criteria.`;
  };

  return (
    <div id="discovery-matrix-container" className="w-full space-y-8 select-none">
      <SEOMatrix 
        title="Explore Premium Events" 
        description="Discover and register for the world's leading technical conferences, developer summits, and design workshops on the Vora virtual event platform." 
      />
      
      {/* Inline styles block for hiding scrollbar and radar animation kinetics */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .radar-sweep-line {
          transform-origin: 50px 50px;
          animation: radarSweep 4s linear infinite;
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-card-fade {
          animation: cardFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* SECTION 1: CINEMATIC SEARCH CONSOLE */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Custom Search Box */}
          <div className="search-matrix flex items-center w-full max-w-2xl bg-zinc-900/40 border border-white/5 rounded-full px-5 py-3.5 transition-all duration-300 focus-within:border-primary-500/50 focus-within:shadow-[0_0_30px_rgba(124,58,237,0.15)] relative group">
            <span className="text-zinc-500 mr-3 shrink-0">
              <Search className="w-5 h-5 text-zinc-500 transition-colors group-focus-within:text-primary-400" />
            </span>
            <input
              id="input-cinematic-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search for events, topics, or organizers..."
              className="w-full bg-transparent border-none text-white placeholder-zinc-500 rounded-none text-base outline-none font-form"
            />
            <button
              id="btn-clear-search"
              onClick={() => setSearchInput('')}
              className={`p-1 rounded-full hover:bg-zinc-800/60 text-zinc-550 hover:text-white transition-all duration-200 cursor-pointer ${
                searchInput ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Event Telemetry Readout */}
          <div className="font-technical text-xs text-zinc-500 shrink-0 uppercase tracking-widest self-end md:self-center">
            {loading ? (
              <span className="inline-flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-ping" />
                <span>Syncing Database...</span>
              </span>
            ) : (
              <span>Found: {meta.total_items} Events ({filteredEvents.length} filtered)</span>
            )}
          </div>
        </div>

        {/* SECTION 2: SOFT-GLASS FILTER MATRIX (Pills Navigation) */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
          <div className="flex items-center justify-between gap-4">
            
            {/* Category flex container */}
            <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar pb-1.5">
              {CATEGORIES.map((cat) => {
                const isActive = (categoryParam === cat) || (cat === 'All Events' && categoryParam === 'All');
                const count = categoryCounts[cat] || 0;
                return (
                  <motion.button
                    key={cat}
                    id={`filter-pill-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleCategoryChange(cat)}
                    whileTap={{ scale: 0.98 }}
                    className={`font-brutalist uppercase tracking-wider text-xs rounded-full px-5 py-2.5 border transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white border-transparent text-black'
                        : 'bg-zinc-800/30 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-100'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] ${isActive ? 'text-black/60' : 'text-zinc-500'}`}>
                      ({count})
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Clear All CTA Button */}
            {(searchParam || categoryParam !== 'All Events' || activeTags.length > 0) && (
              <motion.button
                id="btn-reset-filters"
                onClick={handleClearFilters}
                whileTap={{ scale: 0.98 }}
                className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0"
              >
                <span>Reset Filters</span>
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}

          </div>

          {/* Technical Tags Filter Row */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[10px] uppercase tracking-[0.15em] font-technical text-zinc-550 mr-2 shrink-0">Filter Tags:</span>
            {AVAILABLE_TAGS.map((tag) => {
              const isActive = activeTags.includes(tag);
              return (
                <motion.button
                  key={tag}
                  id={`tag-pill-${tag.toLowerCase()}`}
                  onClick={() => handleToggleTag(tag)}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-technical transition-all border cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-600/15 border-primary-500/35 text-primary-400'
                      : 'bg-zinc-900/10 border-zinc-850 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {tag}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ERROR HANDLER SECTION */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/25 p-5 rounded-2xl flex items-start space-x-3 text-sm text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold">Sync Error</h5>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* SECTION 3: THE HIGH-FIDELITY GRID */}
      <div className="space-y-4">
        
        {/* Inline Reconnecting Reassurance status bar */}
        {retryState.status === 'retrying' && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl px-4 py-3 flex items-center justify-center space-x-2.5 text-zinc-300 font-technical text-xs transition-all duration-300">
            <svg className="animate-spin h-3.5 w-3.5 text-primary-500 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-semibold uppercase tracking-wider">
              Retrying Connection (Attempt {retryState.attempt}/3)
            </span>
          </div>
        )}

        {loading ? (
          /* Skeletons loader matrix matching card sizes */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[420px] animate-pulse"
              >
                <div className="w-full aspect-[16/9] bg-zinc-850/40 border-b border-zinc-900" />
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="h-3.5 w-1/3 bg-zinc-850/40 rounded-full" />
                    <div className="h-5 w-5/6 bg-zinc-850/40 rounded-full" />
                    <div className="h-5 w-2/3 bg-zinc-850/40 rounded-full" />
                    <div className="h-3.5 w-full bg-zinc-850/40 rounded-lg mt-3" />
                  </div>
                  <div className="h-9 w-full bg-zinc-850/40 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          
          /* SECTION 5: ASYNCHRONOUS EMPTY STATE */
          <div className="py-24 text-center max-w-md mx-auto space-y-6">
            
            {/* SVG Rotating Radar sweep illustration */}
            <svg 
              className="w-24 h-24 text-zinc-700 mx-auto opacity-80" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-zinc-800" />
              <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-zinc-800" />
              <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="1" className="text-zinc-900" />
              
              <line 
                x1="50" y1="50" x2="78" y2="22" 
                stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" 
                className="radar-sweep-line opacity-80" 
              />
              
              <circle cx="72" cy="32" r="3" fill="#7c3aed" className="animate-ping" />
              <circle cx="28" cy="62" r="2" fill="currentColor" className="text-zinc-650" />
            </svg>

            <div className="space-y-2">
              <h4 className="font-display font-extrabold text-white text-2xl tracking-tight leading-none">
                No Signals Detected
              </h4>
              <p className="font-sans text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
                {getEmptyStateText()}
              </p>
            </div>
            
            <button
              id="btn-empty-clear-filters"
              onClick={handleClearFilters}
              className="px-6 py-3 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-350 hover:text-white transition-colors cursor-pointer font-form uppercase tracking-wider"
            >
              Clear All Filters and Search
            </button>
          </div>
        ) : (
          
          /* SECTION 4: HIGH-FIDELITY EVENT GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, idx) => (
              <EventCard
                key={event.id}
                event={event}
                idx={idx}
                isRegistered={registeredEventIds.includes(event.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: PAGINATION MATRIX */}
      {!loading && meta.total_pages > 1 && (
        <div className="pt-10 pb-6 flex justify-center items-center space-x-3 shrink-0 border-t border-white/5 mt-12">
          
          {/* Previous Page */}
          <button
            id="btn-pag-prev"
            disabled={pageParam <= 1}
            onClick={() => handlePageChange(pageParam - 1)}
            className="px-4 py-2 rounded-xl bg-transparent border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:hover:text-zinc-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-1.5 font-form text-xs font-semibold cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Numeric Page Circles */}
          <div className="flex items-center space-x-1.5">
            {Array.from({ length: meta.total_pages }).map((_, i) => {
              const pNum = i + 1;
              const isActive = pageParam === pNum;
              return (
                <button
                  key={pNum}
                  id={`btn-pag-page-${pNum}`}
                  onClick={() => handlePageChange(pNum)}
                  className={`w-10 h-10 rounded-full font-technical text-xs font-bold border transition-colors flex items-center justify-center cursor-pointer ${
                    isActive 
                      ? 'bg-primary-600 border-transparent text-white shadow-[0_0_12px_rgba(124,58,237,0.35)]' 
                      : 'bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-650 hover:text-zinc-100 hover:bg-white/[0.02]'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            id="btn-pag-next"
            disabled={pageParam >= meta.total_pages}
            onClick={() => handlePageChange(pageParam + 1)}
            className="px-4 py-2 rounded-xl bg-transparent border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:hover:text-zinc-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-1.5 font-form text-xs font-semibold cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      )}

    </div>
  );
}
