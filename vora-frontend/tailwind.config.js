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
        // Deep Zinc Color Matrix
        zinc: {
          950: "#09090b",
          900: "#18181b",
        },
        background: {
          root: "#09090B",   // Zinc 950 for root backdrop
          elevated: "#18181B", // Zinc 900 for cards, headers, panels
        },
        // Premium brand color aliases using the zinc theme
        brand: {
          dark: "#09090B",
          slate: "#18181B",
          card: "#27272A", // Zinc 800 for nested components
          muted: "#A1A1AA", // Zinc 400
        },
        // Custom vibrant primary Violet color token scale
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed", // Vibrant peak primary accent (#7c3aed for primary-600)
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e0854",
        },
        // Legacy mappings mapped to primary violet to keep existing components happy
        accent: {
          violet: "#7c3aed",
          violetHover: "#6d28d9",
          blue: "#6366f1",
          blueHover: "#4f46e5",
        },
        // Subtle borders and dividers
        border: {
          subtle: "#27272A", // Zinc 800
        },
        // Semantic statuses
        status: {
          success: "#10B981", // Emerald 500
          danger: "#EF4444",  // Red 500
          warning: "#F59E0B", // Amber 500
        }
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        display: ['Panchang', 'sans-serif'],
        brutalist: ['Basement', 'monospace'],
        art: ['Syne', 'sans-serif'],
        elegant: ['Boska', 'serif'],
        murmure: ['Le Murmure', 'sans-serif'],
        technical: ['Basement', 'monospace'],
        accent: ['Panchang', 'sans-serif'],
        form: ['Syne', 'sans-serif'],
        'clean-sans': ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        // Ambient soft shadows
        soft: "0 4px 30px rgba(0, 0, 0, 0.4)",
        glow: "0 0 20px rgba(124, 58, 237, 0.15)",
        ambient: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      backdropBlur: {
        24: '24px',
      }
    },
  },
  plugins: [],
}
