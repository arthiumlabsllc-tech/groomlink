/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ghana flag colors
        ghana: {
          red: '#CE1126',
          gold: '#FCD116',
          green: '#006B3F',
          black: '#000000',
        },
        // Brand colors
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#006B3F',
          600: '#005a34',
          700: '#004d2d',
          800: '#003d24',
          900: '#002d1a',
        },
        accent: {
          gold: '#FCD116',
          red: '#CE1126',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
