/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Storefront accent — a deep, calm green.
        brand: {
          50: '#eefbf5',
          100: '#d6f5e6',
          200: '#b0e9d0',
          300: '#7cd7b4',
          400: '#46bd93',
          500: '#22a079',
          600: '#148162',
          700: '#106750',
          800: '#105241',
          900: '#0e4437',
          950: '#06261f',
        },
        ink: '#1c1917',
      },
      boxShadow: {
        card: '0 1px 2px rgb(28 25 23 / 0.04), 0 4px 16px rgb(28 25 23 / 0.06)',
        lift: '0 2px 4px rgb(28 25 23 / 0.04), 0 12px 32px rgb(28 25 23 / 0.10)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
