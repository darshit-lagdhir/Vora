import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  darkMode: 'class',
  content: [
    path.resolve(__dirname, "./index.html"),
    path.resolve(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        // Deep Zinc Color Matrix mapped to theme-dependent CSS variables
        zinc: {
          50: "rgb(var(--zinc-50-rgb) / <alpha-value>)",
          100: "rgb(var(--zinc-100-rgb) / <alpha-value>)",
          200: "rgb(var(--zinc-200-rgb) / <alpha-value>)",
          300: "rgb(var(--zinc-300-rgb) / <alpha-value>)",
          400: "rgb(var(--zinc-400-rgb) / <alpha-value>)",
          500: "rgb(var(--zinc-500-rgb) / <alpha-value>)",
          600: "rgb(var(--zinc-600-rgb) / <alpha-value>)",
          700: "rgb(var(--zinc-700-rgb) / <alpha-value>)",
          800: "rgb(var(--zinc-800-rgb) / <alpha-value>)",
          900: "rgb(var(--zinc-900-rgb) / <alpha-value>)",
          950: "rgb(var(--zinc-950-rgb) / <alpha-value>)",
        },
        background: {
          root: "rgb(var(--bg-root-rgb) / <alpha-value>)",   // Dynamic root backdrop
          elevated: "rgb(var(--bg-elevated-rgb) / <alpha-value>)", // Dynamic elevated cards, headers, panels
        },
        // Premium brand color aliases using the zinc theme
        brand: {
          dark: "rgb(var(--brand-dark-rgb) / <alpha-value>)",
          slate: "rgb(var(--brand-slate-rgb) / <alpha-value>)",
          card: "rgb(var(--brand-card-rgb) / <alpha-value>)", // Dynamic card bg
          muted: "rgb(var(--brand-muted-rgb) / <alpha-value>)",
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
          subtle: "rgb(var(--border-subtle-rgb) / <alpha-value>)",
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
