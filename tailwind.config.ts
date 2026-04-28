import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1a73e8",
          50: "#e8f0fe",
          100: "#d2e3fc",
          500: "#1a73e8",
          600: "#1967d2",
          700: "#185abc",
        },
        accent: { saffron: "#ff9933", green: "#138808" },
      },
      fontFamily: {
        sans: ['"Google Sans"', "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
