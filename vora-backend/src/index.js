import './config/preflightGuard.js';
import app from './app.js';
import env from './config/env.js';
import { startAnalyticsScheduler, stopAnalyticsScheduler } from './controllers/analyticsController.js';

// Bind network listener to the specified port
const server = app.listen(env.PORT, () => {
  console.log('================================================================================');
  console.log(`[Server] Project Vora Backend Engine booting up...`);
  console.log(`[Server] Environment: ${env.NODE_ENV}`);
  console.log(`[Server] Listening on Port: ${env.PORT}`);
  console.log(`[Server] Uptime Telemetry Target URL: http://localhost:${env.PORT}/`);
  console.log('================================================================================');
  startAnalyticsScheduler();
});

// Helper function to handle graceful shutdown
const gracefulShutdown = (signal, error) => {
  console.warn(`[Server] Received ${signal}. Starting graceful shutdown procedure...`);
  stopAnalyticsScheduler();
  
  if (error) {
    console.error('[Server] Critical Error Details:');
    console.error(error);
  }

  // Set a shutdown timeout threshold (e.g., 5 seconds) to force exit if requests hang
  const forceExitTimeout = setTimeout(() => {
    console.error('[Server] Forcefully terminating process. Open connections did not close in time.');
    process.exit(1);
  }, 5000);

  // Stop accepting new HTTP requests
  server.close(() => {
    console.log('[Server] Network listener stopped. Active requests completed.');
    clearTimeout(forceExitTimeout);
    console.log('[Server] Graceful exit complete.');
    process.exit(error ? 1 : 0);
  });
};

// --- Process Lifecycle Event Interceptors ---

// Capture synchronous syntax or operational exceptions in the global scope
process.on('uncaughtException', (error) => {
  console.error('[Server] CRITICAL: Uncaught Exception detected!');
  gracefulShutdown('uncaughtException', error);
});

// Capture unhandled asynchronous Promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] CRITICAL: Unhandled Promise Rejection detected!');
  gracefulShutdown('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
});

// Capture process termination signals from host environment (e.g. Docker, Heroku, OS)
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});
