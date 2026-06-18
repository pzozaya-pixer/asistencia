import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#102033",
        tide: "#2f5d7c",
        mint: "#d9f0e2",
        sand: "#f5efe4",
        coral: "#f77f64"
      },
      boxShadow: {
        float: "0 30px 70px rgba(16, 32, 51, 0.12)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;

