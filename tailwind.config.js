/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0e27',
          surface: '#1a1f3a',
          border: '#2d3548',
        },
        accent: {
          green: '#10b981',
          red: '#ef4444',
        }
      },
    },
  },
  plugins: [],
}
