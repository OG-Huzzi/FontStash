/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#111111',
        'surface-hover': '#141414',
        'surface-lift': '#161616',
        border: '#1F1F1F',
        'border-hover': '#2A2A2A',
        accent: '#E8FF57',
        'text-primary': '#F2F2F2',
        'text-muted': '#666666',
        'text-subtle': '#333333',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '8px',
        input: '6px',
      },
      transitionTimingFunction: {
        'panel-in': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      animation: {
        'skeleton-pulse': 'skeleton-pulse 1.5s ease-in-out infinite',
        'slide-up': 'slide-up 200ms ease forwards',
        'slide-in-right': 'slide-in-right 300ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'slide-out-right': 'slide-out-right 200ms ease forwards',
        'fade-in': 'fade-in 150ms ease forwards',
      },
      keyframes: {
        'skeleton-pulse': {
          '0%, 100%': { backgroundColor: '#161616' },
          '50%': { backgroundColor: '#1E1E1E' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
