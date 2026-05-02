import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0b0d12',
          surface: '#11141b',
          raised: '#161a23',
          border: '#1f2430',
        },
        text: {
          primary: '#e6e8ee',
          secondary: '#a1a7b3',
          muted: '#6b7280',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        },
        priority: {
          urgent: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#3b82f6',
          lowest: '#6b7280',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
        cardHover: '0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.4)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
