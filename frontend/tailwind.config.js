/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1A1A",
        paper: "#F4F6F1",
        tide: "#1E7773",
        sun: "#E8A833",
        signal: "#E85D3F",
      },
      boxShadow: {
        panel: "0 16px 50px rgba(0, 0, 0, 0.2)",
      },
      fontFamily: {
        sans: ["Space Grotesk", "ui-sans-serif", "system-ui"],
      },
      animation: {
        rise: "rise 550ms ease-out",
      },
      keyframes: {
        rise: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
