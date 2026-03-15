/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'food7-red': '#8B0000',
        'food7-black': '#0A0A0A',
        'food7-dark': '#111111',
        'food7-surface': '#181818',
        'food7-gold': '#C9A84C',
        'food7-amber': '#E8B84B',
        'food7-white': '#F0EDE8',
        'food7-muted': '#7A7570',
        'food7-red-light': '#A52A2A',
        'food7-red-dark': '#5C0000',
        'food7-border': 'rgba(201,168,76,0.15)',
      },
      fontFamily: {
        'heading': ['"Playfair Display"', 'Georgia', 'serif'],
        'body': ['"DM Sans"', 'system-ui', 'sans-serif'],
        'mono': ['"DM Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-ember': 'linear-gradient(135deg, #8B0000 0%, #3D0000 60%, #0A0A0A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)',
        'gradient-surface': 'linear-gradient(180deg, #181818 0%, #111111 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'ember': '0 0 40px rgba(139, 0, 0, 0.35), 0 0 80px rgba(139, 0, 0, 0.1)',
        'gold': '0 0 30px rgba(201, 168, 76, 0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.6)',
        'inset-gold': 'inset 0 1px 0 rgba(201,168,76,0.2)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'shimmer': 'shimmer 2.5s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139,0,0,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(139,0,0,0.6)' },
        },
      },
    },
  },
  plugins: [],
}
