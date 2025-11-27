/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        kitchen: {
          bg: '#0a0a0a', // Darker, deeper black
          board: '#121212',
          panel: '#18181b', // Zinc-900ish
          accent: '#d4af37', // Metallic Gold
          neon: {
            cyan: '#00f3ff',
            purple: '#bc13fe',
            green: '#0aff60',
          }
        }
      }
    },
  },
  plugins: [],
}

