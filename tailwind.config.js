/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0C0C0C',
        card: '#141414',
        line: '#242424',
      },
      fontFamily: {
        sans: ['Kanit', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        chrome: 'linear-gradient(180deg, #646973 0%, #BBCCD7 100%)',
        accent: 'linear-gradient(90deg, #A855F7 0%, #E1306C 50%, #F97316 100%)',
      },
    },
  },
  plugins: [],
};
