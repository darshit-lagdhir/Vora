import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import v8 from 'v8';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import pool from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import eventsRouter from './routes/eventRoutes.js';
import authRouter from './routes/authRoutes.js';
import exploreRouter from './routes/exploreRoutes.js';
import registrationRouter from './routes/registrationRoutes.js';
import resourceRouter from './routes/resourceRoutes.js';
import analyticsRouter from './routes/analyticsRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import securityRouter from './routes/securityRoutes.js';
import healthRouter from './routes/healthRoutes.js';
import { authenticate, authorize } from './middleware/authMiddleware.js';
import { blacklistInterceptor } from './services/securityService.js';
import { correlationMiddleware } from './middleware/correlationMiddleware.js';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';

// ─── Auto-create uploads directory on boot ───────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`[Boot] Created uploads directory: ${uploadsDir}`);
}

// Instantiate the Express application
const app = express();

// ─── Trust proxy (required for rate limiting behind reverse proxies) ─────────
app.set('trust proxy', true);

// ─── Request Correlation & Metrics Observability ─────────────────────────────
app.use(correlationMiddleware);
app.use(metricsMiddleware);

// ─── Volumetric Ingress Quarantine Interceptor ─────────────────────────────────
app.use(blacklistInterceptor);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SECURITY HEADERS — Aggressive Helmet.js Configuration (Task 2)
//    - Content Security Policy (CSP)
//    - Strict-Transport-Security (HSTS) — 1 year
//    - X-Frame-Options: DENY
//    - X-Powered-By stripping
//    - Referrer-Policy: strict-origin-when-cross-origin
// ═══════════════════════════════════════════════════════════════════════════════
app.use(
  helmet({
    // Content Security Policy: restrict script/style/image/connect sources
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://api.dicebear.com'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },

    // Strict-Transport-Security: force HTTPS for 1 year (31536000 seconds)
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options: DENY — prevents clickjacking via iframe embedding
    frameguard: { action: 'deny' },

    // Strip the X-Powered-By header to prevent server fingerprinting
    hidePoweredBy: true,

    // Referrer-Policy: only send origin on cross-origin requests
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // X-Content-Type-Options: nosniff — prevent MIME type sniffing
    noSniff: true,

    // X-DNS-Prefetch-Control: off
    dnsPrefetchControl: { allow: false },

    // X-Download-Options: noopen (IE-specific)
    ieNoOpen: true,

    // X-Permitted-Cross-Domain-Policies: none
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CORS BOUNDARY — Strict Domain Whitelisting (Task 3)
//    Production: explicitly rejects unlisted origins with 403.
//    Development: permissive mode for localhost tooling.
// ═══════════════════════════════════════════════════════════════════════════════
const allowedOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // In development, allow requests with no origin (curl, Postman, mobile apps)
    if (!origin && (env.NODE_ENV === 'development' || env.NODE_ENV === 'test')) {
      return callback(null, true);
    }

    // Check origin against the whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Development fallback: allow any origin
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      return callback(null, true);
    }

    // Production: mercilessly reject unlisted origins
    console.warn(`[CORS] Blocked unauthorized origin: ${origin}`);
    return callback(new Error('Cross-Origin Request Blocked: Origin not whitelisted.'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Idempotency-Key',
  ],
  exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
  maxAge: 86400, // Cache preflight for 24 hours
};
app.use(cors(corsOptions));
app.use(
  compression({
    filter: (req, res) => {
      const acceptHeader = req.headers['accept'];
      if (acceptHeader && acceptHeader.includes('text/event-stream')) {
        return false;
      }
      const contentType = res.getHeader ? res.getHeader('content-type') : null;
      if (contentType && contentType.includes('text/event-stream')) {
        return false;
      }
      return compression.filter ? compression.filter(req, res) : true;
    },
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GLOBAL RATE LIMITER — Defensive bulwark against brute force and DDoS
// ═══════════════════════════════════════════════════════════════════════════════
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 150 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use(limiter);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BODY PARSING MIDDLEWARES — Strict payload limits
// ═══════════════════════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SYSTEM OVERLOAD DETECTION — Degradation Interceptor Mesh
//    Monitors heap memory usage and event loop lag. Returns 503 when thresholds
//    are exceeded to prevent cascading failures under heavy load.
// ═══════════════════════════════════════════════════════════════════════════════
const HEAP_THRESHOLD_PERCENT = 0.90;   // 90% of max heap
const EVENT_LOOP_LAG_THRESHOLD_MS = 500; // 500ms event loop lag
const REQUEST_TIMEOUT_MS = 30000;        // 30-second global request timeout

let lastEventLoopCheck = Date.now();
let eventLoopLag = 0;

// Event loop lag sampling (updates every 500ms)
setInterval(() => {
  const now = Date.now();
  const expectedInterval = 500;
  eventLoopLag = Math.max(0, (now - lastEventLoopCheck) - expectedInterval);
  lastEventLoopCheck = now;
}, 500).unref(); // .unref() prevents this timer from keeping the process alive

app.use((req, res, next) => {
  // Bypass overload checks for static assets and health check probes
  const isStaticAsset = req.url.startsWith('/assets/') || req.url.startsWith('/fonts/') || req.url === '/favicon.ico';
  const isHealthCheck = req.url.startsWith('/api/v1/health/') || req.url === '/health' || req.url === '/api/v1/system/health';
  
  if (isStaticAsset || isHealthCheck) {
    return next();
  }

  // Check heap memory usage relative to the V8 heap size limit
  const memUsage = process.memoryUsage();
  const heapLimit = v8.getHeapStatistics().heap_size_limit;
  const heapUsedRatio = memUsage.heapUsed / heapLimit;

  if (heapUsedRatio > HEAP_THRESHOLD_PERCENT || eventLoopLag > EVENT_LOOP_LAG_THRESHOLD_MS) {
    console.warn(
      `[OverloadGuard] System overload detected — ` +
      `Heap: ${(heapUsedRatio * 100).toFixed(1)}% of limit | ` +
      `Event Loop Lag: ${eventLoopLag}ms | ` +
      `Rejecting ${req.method} ${req.url}`
    );

    res.setHeader('Retry-After', '30');
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Service temporarily unavailable due to system overload. Please retry after 30 seconds.',
    });
  }

  // Apply per-request timeout sentinel
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      console.warn(`[TimeoutGuard] Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s: ${req.method} ${req.url}`);
      res.status(408).json({
        success: false,
        status: 408,
        message: `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
      });
    }
  });

  next();
});

if (env.NODE_ENV === 'production') {
  // Production structured access log format
  app.use(
    morgan(
      ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Resolve frontend path
const frontendDistPath = path.resolve(__dirname, '../../vora-frontend/dist');
const hasFrontend = fs.existsSync(frontendDistPath);

// 6. HEALTH CHECK ENDPOINTS — Cloud platform load balancer monitoring (Task 6)
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});

app.get('/api/v1/system/health', async (req, res) => {
  try {
    // 1. Check database connection pool status
    await pool.query('SELECT 1');

    // 2. Check process memory usage
    const memory = process.memoryUsage();

    res.status(200).json({
      status: 'ok',
      database: 'connected',
      memory: {
        rss: `${Math.round((memory.rss / 1024 / 1024) * 100) / 100} MB`,
        heapTotal: `${Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100} MB`,
        heapUsed: `${Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100} MB`,
        external: `${Math.round((memory.external / 1024 / 1024) * 100) / 100} MB`,
      },
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[HealthCheck] System health check failed:', err);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
});

if (!hasFrontend) {
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      status: 'operational',
      message: 'Project Vora API core engine is fully functional.',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ROUTE MOUNTING — API Version 1 Routing Registry
// ═══════════════════════════════════════════════════════════════════════════════
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/explore', exploreRouter);
app.use('/api/v1/registrations', registrationRouter);
app.use('/api/v1/resources', resourceRouter);
app.use('/api/v1/organizer/analytics', analyticsRouter);
app.use('/api/v1/tasks', taskRouter);
app.use('/api/v1/security', securityRouter);
app.use('/api/v1/health', healthRouter);

// ─── Organizer Metrics aggregation endpoint (CRUD readout) ────────
app.get(
  '/api/v1/organizer/stats',
  authenticate,
  authorize(['organizer']),
  async (req, res, next) => {
    try {
      const organizerId = req.user.id;

      // 1. Total Webinars (Events)
      const totalWebinarsResult = await pool.query(
        'SELECT COUNT(*) FROM events WHERE organizer_id = $1',
        [organizerId]
      );

      // 2. Total Registered Attendees
      const totalRegistrantsResult = await pool.query(
        `SELECT COUNT(r.id) FROM registrations r 
       JOIN events e ON r.event_id = e.id 
       WHERE e.organizer_id = $1`,
        [organizerId]
      );

      // 3. Upcoming Webinars
      const upcomingWebinarsResult = await pool.query(
        `SELECT COUNT(*) FROM events 
       WHERE organizer_id = $1 AND start_timestamp > NOW()`,
        [organizerId]
      );

      res.status(200).json({
        success: true,
        stats: {
          totalEvents: parseInt(totalWebinarsResult.rows[0].count, 10),
          totalAttendees: parseInt(totalRegistrantsResult.rows[0].count, 10),
          upcomingEvents: parseInt(upcomingWebinarsResult.rows[0].count, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Co-hosting Frontend Static Assets ───────────────────────────────────────
if (hasFrontend) {
  app.use(express.static(frontendDistPath));
  console.log(`[Static] Serving frontend production assets from: ${frontendDistPath}`);

  // Wildcard fallback for React Router SPA routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/v1') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CENTRALIZED ERROR HANDLER — Must be placed at the absolute end
// ═══════════════════════════════════════════════════════════════════════════════
app.use(errorHandler);

export default app;
