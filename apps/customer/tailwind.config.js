/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f4',
          100: '#fee5e9',
          200: '#fdcc d5',
          300: '#fba6b6',
          400: '#f8748f',
          500: '#ef4766',
          600: '#dc2454',
          700: '#b91645',
          800: '#98153e',
          900: '#7d1539',
        },
        ghana: {
          red: '#CE1126',
          gold: '#FCD116',
          green: '#006B3F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
