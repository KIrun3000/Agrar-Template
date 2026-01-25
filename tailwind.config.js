import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import typographyPlugin from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--aw-color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--aw-color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--aw-color-accent) / <alpha-value>)',
        default: 'rgb(var(--aw-color-text-default) / <alpha-value>)',
        heading: 'rgb(var(--aw-color-text-heading) / <alpha-value>)',
        muted: 'rgb(var(--aw-color-muted) / <alpha-value>)',
        page: 'rgb(var(--aw-color-bg-page) / <alpha-value>)',
        surface: 'rgb(var(--aw-color-surface) / <alpha-value>)',
        border: 'rgb(var(--aw-color-border) / <alpha-value>)',
        ring: 'rgb(var(--aw-color-ring) / <alpha-value>)',
        success: 'rgb(var(--aw-color-success) / <alpha-value>)',
        warning: 'rgb(var(--aw-color-warning) / <alpha-value>)',
        danger: 'rgb(var(--aw-color-danger) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--aw-color-card) / <alpha-value>)',
          border: 'rgb(var(--aw-color-card-border) / <alpha-value>)',
        },
        'on-primary': 'rgb(var(--aw-color-on-primary) / <alpha-value>)',
        'on-secondary': 'rgb(var(--aw-color-on-secondary) / <alpha-value>)',
        'on-accent': 'rgb(var(--aw-color-on-accent) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--aw-font-sans, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--aw-font-serif, ui-serif)', ...defaultTheme.fontFamily.serif],
        heading: ['var(--aw-font-heading, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        sm: 'var(--aw-radius-sm, 0.25rem)',
        md: 'var(--aw-radius-md, 0.5rem)',
        lg: 'var(--aw-radius-lg, 0.75rem)',
        xl: 'var(--aw-radius-xl, 1rem)',
        '2xl': 'var(--aw-radius-2xl, 1.25rem)',
      },
      boxShadow: {
        sm: 'var(--aw-shadow-sm, 0 1px 2px 0 rgb(15 23 42 / 0.08))',
        md: 'var(--aw-shadow-md, 0 10px 30px rgb(15 23 42 / 0.12))',
        lg: 'var(--aw-shadow-lg, 0 25px 50px rgb(15 23 42 / 0.15))',
      },
      borderColor: {
        DEFAULT: 'rgb(var(--aw-color-border) / <alpha-value>)',
      },

      animation: {
        fade: 'fadeInUp 1s both',
      },

      keyframes: {
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(2rem)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    typographyPlugin,
    plugin(({ addVariant }) => {
      addVariant('intersect', '&:not([no-intersect])');
    }),
  ],
  darkMode: 'class',
};
