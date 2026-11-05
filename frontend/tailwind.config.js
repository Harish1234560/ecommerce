/** @type {import('tailwindcss').Config} */

// Every colour reads a CSS variable from src/styles/tokens.css, so the storefront can be rebranded
// by editing that one file. Status palettes keep Tailwind's familiar names (rose = error,
// amber = warning, emerald = success, sky = info) and are also exposed under semantic names.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const scale = (name, shades = SHADES) => Object.fromEntries(shades.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));
const status = (name) => scale(name, SHADES.slice(0, -1));
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans Variable"', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Type scale: display, h1–h3, body sizes and caption.
      fontSize: {
        display: ['2rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-lg': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '800' }],
        h1: ['1.625rem', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '700' }],
        h2: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        h3: ['1rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.65' }],
        body: ['0.875rem', { lineHeight: '1.55' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
      },
      colors: {
        brand: scale('brand'),
        accent: status('accent'),
        stone: scale('stone'),
        rose: status('error'),
        amber: status('warning'),
        emerald: status('success'),
        sky: status('info'),
        error: status('error'),
        warning: status('warning'),
        success: status('success'),
        info: status('info'),
        ink: token('color-ink'),
        surface: { DEFAULT: token('color-surface'), elevated: token('color-surface-elevated'), muted: token('color-surface-muted') },
        canvas: token('color-bg'),
        fg: { DEFAULT: token('color-fg'), secondary: token('color-fg-secondary'), muted: token('color-fg-muted') },
        line: token('color-line'),
        primary: { DEFAULT: token('color-primary'), hover: token('color-primary-hover'), soft: token('color-primary-soft') },
      },
      // Same steps as Tailwind's defaults (8 / 12 / 16 / 24px), but driven by tokens.
      borderRadius: {
        lg: 'var(--radius-sm)',
        xl: 'var(--radius-md)',
        '2xl': 'var(--radius-lg)',
        '3xl': 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        bar: 'var(--shadow-bar)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      zIndex: {
        sticky: 'var(--z-sticky)',
        header: 'var(--z-header)',
        nav: 'var(--z-nav)',
        overlay: 'var(--z-overlay)',
        toast: 'var(--z-toast)',
      },
      spacing: {
        'safe-b': 'var(--safe-bottom)',
        'bottom-nav': 'calc(var(--bottom-nav-height) + var(--safe-bottom))',
      },
      screens: {
        // Mobile first: base styles are phones; sm 640, md 768 (tablet), lg 1024 (desktop), xl 1280, 2xl 1536.
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.3)' }, '100%': { transform: 'scale(1)' } },
        'draw-check': { from: { strokeDashoffset: '24' }, to: { strokeDashoffset: '0' } },
        'scale-in': { from: { transform: 'scale(0.6)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        pop: 'pop 0.3s var(--ease-out)',
        'scale-in': 'scale-in 0.35s var(--ease-out) both',
        'draw-check': 'draw-check 0.35s 0.2s var(--ease-out) both',
      },
    },
  },
  plugins: [],
};
