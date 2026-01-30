/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}"
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