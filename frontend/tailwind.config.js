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
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        corpta: ['"Corpta"', 'sans-serif'],
        syncopate: ['"Syncopate"', 'sans-serif'],
        cinzel: ['"Cinzel"', 'serif'],
        syne: ['"Syne"', 'sans-serif'],
        marcellus: ['"Marcellus"', 'serif'],
        orbitron: ['"Orbitron"', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
      },
      colors: {
        // NetrIQ Industrial/Editorial Design System: Graphite + Warm White + Olive
        netriq: {
          bg: '#141516',         // App background (warm charcoal)
          sidebar: '#17191A',    // Sidebar
          card: '#1E2021',       // Cards (neutral surface)
          raised: '#252728',     // Raised card
          border: '#303334',     // Border (1px solid)
          primary: '#F1F0EA',    // Main text (warm white)
          secondary: '#A4A5A0',  // Secondary text
          muted: '#70736F',      // Muted text
          accent: '#9AAA78',     // NetrIQ accent (Olive)
          accentHover: '#A9B989',// Accent hover
          info: '#8CA4B8',       // Information / Steel blue
          healthy: '#9AAA78',    // Healthy state
          low: '#8CA4B8',        // Low risk
          medium: '#D0A05C',     // Medium risk (Amber)
          high: '#D27C62',       // High risk (Rust/Orange)
          critical: '#C95F5F',   // Critical state (Muted Crimson)
        },
        // Slate mapping: Neutralized to Graphite / Warm White
        slate: {
          50: '#F8F9FA',
          100: '#F1F0EA',  // Main text
          200: '#E4E3DC',
          300: '#C5C6BF',
          400: '#A4A5A0',  // Secondary text
          500: '#70736F',  // Muted text
          600: '#4D5051',
          700: '#303334',  // Active/hover borders
          800: '#303334',  // Standard border
          850: '#252728',  // Raised card surface
          900: '#1E2021',  // Card surface
          950: '#141516',  // App canvas background
        },
        // Brand Olive Palette
        olive: {
          DEFAULT: '#9AAA78',
          hover: '#A9B989',
          light: '#BDCBA0',
          dark: '#7A895A',
        },
        // Compatibility Aliases for Teal (mapped to Olive)
        teal: {
          DEFAULT: '#9AAA78',
          50: '#F4F6EE',
          100: '#E5EAD9',
          200: '#D0D9BD',
          300: '#B6C49E',
          400: '#9AAA78',
          500: '#9AAA78',
          600: '#839263',
          700: '#68754E',
          800: '#4F593A',
          900: '#2C3220',
          950: '#17191A',
        },
        // Compatibility Aliases for Cyan/Purple (mapped to Information/Steel #8CA4B8)
        cyan: {
          DEFAULT: '#8CA4B8',
          300: '#AFC3D3',
          400: '#8CA4B8',
          450: '#7993A8',
          500: '#8CA4B8',
          600: '#6B8398',
          950: '#17191A',
        },
        purple: {
          300: '#AFC3D3',
          400: '#8CA4B8',
          500: '#7993A8',
          900: '#1E2021',
          950: '#141516',
        },
        // SOC Functional Severity scale matching NetrIQ specifications
        risk: {
          healthy: '#9AAA78',
          low: '#8CA4B8',
          medium: '#D0A05C',
          high: '#D27C62',
          critical: '#C95F5F',
        },
        status: {
          healthy: '#9AAA78',
          low: '#8CA4B8',
          medium: '#D0A05C',
          high: '#D27C62',
          critical: '#C95F5F',
        }
      },
      boxShadow: {
        none: 'none',
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.25)',
        card: '0 2px 8px -2px rgba(0, 0, 0, 0.3)',
        'glow-cyan': 'none',
        'glow-teal': 'none',
        'glow-rose': 'none',
      }
    },
  },
  plugins: [],
}
