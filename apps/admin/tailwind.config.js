/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ghana: {
          red: '#CE1126',
          yellow: '#FCD116',
          green: '#006B3F',
          dark: '#1a1a2e',
        },
      },
    },
  },
  plugins: [],
}

