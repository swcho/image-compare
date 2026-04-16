import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', './popup.html'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1e1e2e',
          raised: '#2a2a3e',
          overlay: '#313145',
        },
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.15s ease-out',
        slideDown: 'slideDown 0.2s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
