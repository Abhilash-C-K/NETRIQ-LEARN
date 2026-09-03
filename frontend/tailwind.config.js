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
        // Deep Space Blue-Black palette
        slate: {
          50: '#f8fafc',
          100: '#eef2f7',  // Primary warm off-white text
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#8896ab',  // Secondary metadata text
          500: '#64748b',
          600: '#475569',
          700: '#223046',  // Active/hover borders
          800: '#1a2436',  // Subtle dividers & borders
          850: '#0d1421',  // Card surface
          900: '#0d1421',  // Card surface
          950: '#050810',  // Canvas background
        },
        // Single cohesive Accent Family: Teal / Cyan (replaces cyan + purple clash)
        teal: {
          DEFAULT: '#14b8c4',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',  // Lighter glow variant
          400: '#2dd4bf',
          500: '#14b8c4',  // Primary teal-cyan
          600: '#0891a3',  // Deeper variant
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#042f2e',
        },
        cyan: {
          300: '#5eead4',  // Lighter glow variant
          400: '#14b8c4',  // Primary teal-cyan
          450: '#0891a3',  // Deeper variant
          500: '#14b8c4',  // Primary teal-cyan
          600: '#0891a3',  // Deeper variant
          950: '#042f2e',
        },
        // Harmonize legacy purple AI badges into the unified teal accent family
        purple: {
          300: '#5eead4',
          400: '#14b8c4',
          500: '#0891a3',
          900: '#082f38',
          950: '#041f24',
        },
        // Standard functional SOC Severity scale (preserved exactly)
        risk: {
          low: '#10b981',      // Emerald
          medium: '#f59e0b',   // Amber
          high: '#f97316',     // Orange
          critical: '#f43f5e', // Rose
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(20, 184, 196, 0.35)',
        'glow-teal': '0 0 15px -3px rgba(20, 184, 196, 0.35)',
        'glow-rose': '0 0 15px -3px rgba(244, 63, 94, 0.35)',
      }
    },
  },
  plugins: [],
}
