/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        t: {
          bg: '#05080F',
          surface: '#0C1322',
          card: '#111B2E',
          cardHover: '#162035',
          border: 'rgba(148,163,184,0.08)',
        },
        violencia: '#C084FC',
        mayor: '#38BDF8',
        nino: '#FBBF24',
        hogar: '#34D399',
        trabajo: '#F97316',
        danger: '#EF4444',
        success: '#22C55E',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'breathe': 'breathe 3s ease-in-out infinite',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.25s ease',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
