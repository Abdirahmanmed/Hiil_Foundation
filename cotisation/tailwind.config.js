export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#10b981",
          dark: "#064e3b",
        },
      },
      boxShadow: {
        glow: "0 20px 60px -20px rgba(16,185,129,.6)",
      },
    },
  },
  plugins: [],
};
