/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        panel: "#0d0f0e",
        border: "#1a2320",
        muted: "#7a8a83",
        text: "#eef4f1",
        yes: "#00d68f",
        no: "#ff4d5e",
        accent: "#00d68f",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
}
