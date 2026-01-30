/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0f3c35',
        'syrian-green': '#0f3c35',
        'syrian-red': '#ce1126',
      },
      fontFamily: {
        'fustat': ['Fustat', 'Noto Sans Arabic', 'Arial', 'sans-serif'],
        'arabic': ['Noto Sans Arabic', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}