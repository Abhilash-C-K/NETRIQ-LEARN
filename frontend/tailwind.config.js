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
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        lg: '8px',
        xl: '10px',
        '2xl': '14px',
      },
      colors: {
        // SOC Professional Theme: Dark Navy Sidebar + Crisp Light Interface
        soc: {
          navy: {
            950: '#060d1f',
            900: '#0a122c',  // Deep Navy Sidebar
            850: '#0f1738',  // Sidebar items
            800: '#142047',  // Sidebar hover
            700: '#1e2c5d',
            border: '#1a2650',
          },
          bg: '#f4f7fb',     // Light crisp workspace background
          surface: '#ffffff', // Card surface
          muted: '#f8fafc',
          border: '#e2e8f0',
          borderSubtle: '#edf2f7',
          text: {
            primary: '#0f172a',
            secondary: '#475569',
            muted: '#94a3b8',
          },
          normal: {
            DEFAULT: '#2563eb', // Blue for normal activity
            light: '#eff6ff',
            border: '#bfdbfe',
            text: '#1d4ed8',
          },
          suspicious: {
            DEFAULT: '#f97316', // Orange for suspicious activity
            light: '#fff7ed',
            border: '#fed7aa',
            text: '#c2410c',
          },
          threat: {
            DEFAULT: '#ef4444', // Red for confirmed threats
            light: '#fef2f2',
            border: '#fecaca',
            text: '#b91c1c',
          },
          quarantine: {
            DEFAULT: '#7c3aed',
            light: '#f5f3ff',
            border: '#ddd6fe',
            text: '#6d28d9',
          }
        },
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        card: '0 2px 6px -1px rgba(15, 23, 42, 0.06), 0 1px 4px -1px rgba(15, 23, 42, 0.04)',
        elevated: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
        'blue-glow': '0 0 12px 1px rgba(37, 99, 235, 0.25)',
        'red-glow': '0 0 12px 1px rgba(239, 68, 68, 0.25)',
        'orange-glow': '0 0 12px 1px rgba(249, 115, 22, 0.25)',
      }
    },
  },
  plugins: [],
}
