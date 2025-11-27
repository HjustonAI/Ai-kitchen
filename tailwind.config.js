/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kitchen: {
          bg: '#121212',
          board: '#1e1e1e',
          panel: '#252525',
          accent: '#c5a059', // Gold/Copper
          neon: {
            cyan: '#00f3ff',
            purple: '#bc13fe',
          }
        }
      }
    },
  },
  plugins: [],
}

