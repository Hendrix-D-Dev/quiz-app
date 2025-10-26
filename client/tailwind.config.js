/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",   // Blue
        secondary: "#10B981", // Emerald
        danger: "#EF4444",    // Red
        dark: "#111827",      // Dark text
        light: "#F9FAFB",     // Background
      },
    },
  },
  plugins: [],
}
