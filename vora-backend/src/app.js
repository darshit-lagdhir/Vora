import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://api.dicebear.com"],
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
const allowedOrigins = env.CORS_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // In development, allow requests with no origin (curl, Postman, mobile apps)
    if (!origin && env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Check origin against the whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Development fallback: allow any origin
    if (env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Production: mercilessly reject unlisted origins
    console.warn(`[CORS] Blocked unauthorized origin: ${origin}`);
    return callback(new Error('Cross-Origin Request Blocked: Origin not whitelisted.'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Idempotency-Key'],
  exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
  maxAge: 86400, // Cache preflight for 24 hours
};
app.use(cors(corsOptions));

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GLOBAL RATE LIMITER — Defensive bulwark against brute force and DDoS
// ═══════════════════════════════════════════════════════════════════════════════
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 150 : 500,
  standardHeaders: true,
  legacyHeaders: false,
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

// ═══════════════════════════════════════════════════════════════════════════════
// 5. REQUEST LOGGING — Environment-aware Morgan configuration
// ═══════════════════════════════════════════════════════════════════════════════
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production structured access log format
  app.use(
    morgan(
      ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. HEALTH CHECK ENDPOINTS — Cloud platform load balancer monitoring (Task 6)
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});

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

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ROUTE MOUNTING — API Version 1 Routing Registry
// ═══════════════════════════════════════════════════════════════════════════════
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/explore', exploreRouter);
app.use('/api/v1/registrations', registrationRouter);
app.use('/api/v1/resources', resourceRouter);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CENTRALIZED ERROR HANDLER — Must be placed at the absolute end
// ═══════════════════════════════════════════════════════════════════════════════
app.use(errorHandler);

export default app;
