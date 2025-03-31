// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Adjust according to your project
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E40AF", // Example: custom primary color (blue)
        secondary: "#FBBF24", // Example: custom accent (amber)
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // Use a modern font (install via Google Fonts if needed)
      },
    },
  },
  plugins: [],
}
