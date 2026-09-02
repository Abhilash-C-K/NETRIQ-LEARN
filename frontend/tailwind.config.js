/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        slate: {
          850: '#111827',
          950: '#030712',
        },
        cyan: {
          450: '#00b4d8',
        },
        risk: {
          low: '#10b981',      // Emerald
          medium: '#f59e0b',   // Amber
          high: '#f97316',     // Orange
          critical: '#f43f5e', // Rose
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.3)',
        'glow-rose': '0 0 15px -3px rgba(244, 63, 94, 0.3)',
      }
    },
  },
  plugins: [],
}
