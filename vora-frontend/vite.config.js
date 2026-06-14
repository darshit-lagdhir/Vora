import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../',
  server: {
    port: 5173,
    host: true, // Enable listening on all local network addresses
  },
  build: {
    outDir: 'dist',

    // ─── Aggressive Minification ───────────────────────────────────────
    // Terser provides more aggressive dead-code elimination than esbuild
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Strip all console.log statements in production
        drop_debugger: true, // Strip all debugger statements
        pure_funcs: ['console.info', 'console.debug', 'console.warn'],
      },
      format: {
        comments: false, // Strip all comments
      },
    },

    // ─── Source Maps ───────────────────────────────────────────────────
    sourcemap: false, // Never expose source maps in production

    // ─── CSS Code Splitting ────────────────────────────────────────────
    cssCodeSplit: true,

    // ─── Asset Inlining Threshold ──────────────────────────────────────
    // Inline assets smaller than 4KB as base64 to reduce HTTP requests
    assetsInlineLimit: 4096,

    // ─── Intelligent Chunk Splitting ───────────────────────────────────
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const normalizedPath = id.replace(/\\/g, '/');
            if (
              normalizedPath.includes('node_modules/react/') ||
              normalizedPath.includes('node_modules/react-dom/') ||
              normalizedPath.includes('node_modules/react-router/') ||
              normalizedPath.includes('node_modules/react-router-dom/') ||
              normalizedPath.includes('node_modules/@remix-run/router/') ||
              normalizedPath.includes('node_modules/scheduler/')
            ) {
              return 'framework';
            }
            if (
              normalizedPath.includes('node_modules/lucide-react/') ||
              normalizedPath.includes('node_modules/axios/')
            ) {
              return 'libs';
            }
            return 'vendor';
          }
        },
      },
    },

    // ─── Chunk Size Warning Limit ──────────────────────────────────────
    chunkSizeWarningLimit: 600, // Warn if any chunk exceeds 600KB
  },
});
