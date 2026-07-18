/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        'radix-fade-in-fast': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'radix-fade-in-fast': 'radix-fade-in-fast 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
