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
        gold: {
          50: '#FDFBF7',
          100: '#FAF4E6',
          200: '#F4E4BC',
          300: '#EBD18D',
          400: '#DFBA5B',
          500: '#D4AF37', // Primary Luxury Gold
          600: '#B89324',
          700: '#917117',
          800: '#6E5311',
          900: '#4F3B0C',
          950: '#2E2205',
        },
        obsidian: {
          900: '#0F1117',
          850: '#141721',
          800: '#1A1E2C',
          750: '#22283A',
          700: '#2C344B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
