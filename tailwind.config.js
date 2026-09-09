/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#1A237E',       // Deep Navy Blue (Authority)
          navyDark: '#0D144A',   // Ultra Dark Navy
          blue: '#003366',       // Deep Blue
          blueLight: '#E8F0FE',  // Trust Blue Accent
          slate: '#334155',      // Slate Gray Text
          slateMuted: '#64748B', // Muted Slate
          slateLight: '#F1F5F9', // Surface Light
          surfaceDark: '#0F172A',// Dark mode surface
          cardDark: '#1E293B',   // Dark mode card
          borderLight: '#E2E8F0',// Border Light
          borderDark: '#334155', // Border Dark
          green: '#16A34A',      // Success Green
          greenLight: '#DCFCE7', // Success Green Background
          gold: '#FFCC00',       // Warning / Advisory Gold
          goldDark: '#D97706',   // Gold Dark
          goldLight: '#FEF3C7',  // Gold Light
          accent: '#AC6953',     // Legacy Brand Accent
        },
        theme: {
          navy: '#1A237E',
          hover: '#283593',
          cta: '#16A34A',
          ctaHover: '#15803D',
          hero: '#F8FAFC',
          alt: '#F1F5F9',
          text: '#1E293B',
          secondary: '#334155',
          border: '#E2E8F0',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        gov: '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)',
        govCard: '0 4px 6px -1px rgba(26, 35, 126, 0.05), 0 2px 4px -2px rgba(26, 35, 126, 0.05)',
        govElevated: '0 20px 25px -5px rgba(26, 35, 126, 0.12), 0 8px 10px -6px rgba(26, 35, 126, 0.08)',
        govHover: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
        card: '0 2px 8px -2px rgba(26, 35, 126, 0.08), 0 4px 16px -4px rgba(26, 35, 126, 0.04)',
        cardHover: '0 8px 24px -4px rgba(26, 35, 126, 0.12), 0 4px 12px -2px rgba(26, 35, 126, 0.06)',
      },
      animation: {
        'scan-bar': 'scanBar 2.5s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        scanBar: {
          '0%': { transform: 'translateY(0%)', opacity: '0.85' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0.85' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
