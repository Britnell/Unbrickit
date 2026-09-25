/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app.html', './new.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: { 'menu-in': 'menu-in 0.25s ease-out' },
      keyframes: {
        'menu-in': {
          from: { opacity: '0', transform: 'translate(-50%, 12px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
    },
  },
  plugins: [],
};
