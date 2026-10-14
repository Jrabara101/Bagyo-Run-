/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#031427',
        surface: {
          DEFAULT: '#031427',
          dim: '#031427',
          bright: '#2a3a4f',
          container: {
            lowest: '#000f21',
            low: '#0b1c30',
            DEFAULT: '#102034',
            high: '#1b2b3f',
            highest: '#26364a',
          },
        },
        primary: {
          DEFAULT: '#4cd7f6',
          container: '#06b6d4',
          fixed: '#acedff',
        },
        secondary: {
          DEFAULT: '#fbabff',
          container: '#ae05c6',
          fixed: '#ffd6fd',
        },
        tertiary: {
          DEFAULT: '#f7be1d',
          container: '#d19f00',
          fixed: '#ffdf9a',
        },
        error: {
          DEFAULT: '#ff5449',
          container: '#93000a',
        },
      },
      fontFamily: {
        headline: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(76,215,246,0.8))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 5px rgba(76,215,246,0.3))' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      }
    },
  },
  plugins: [],
};
