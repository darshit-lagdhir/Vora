import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  content: [
    path.resolve(__dirname, "./index.html"),
    path.resolve(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        // Deep slate background color tokens
        brand: {
          dark: "#0b0f19",      // Main dark backdrop
          slate: "#0f172a",     // Standard card/header container slate
          card: "#1e293b",      // Inner panels/tables
          muted: "#94a3b8",     // Slate text muted color
        },
        // Accent indicators
        accent: {
          violet: "#8b5cf6",    // Main primary actions (purple/violet)
          violetHover: "#7c3aed",
          blue: "#3b82f6",      // Primary dashboard metrics (electric blue)
          blueHover: "#2563eb",
        },
        // Semantic statuses
        status: {
          success: "#10b981",   // Emerald green for active sessions/successes
          danger: "#ef4444",    // Crimson red for errors/warnings/limits
          warning: "#f59e0b",   // Amber yellow for pending actions
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
}
