import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        zenith: {
          active: "#10b981",
          surface: "#0a0a0a",
        }
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        "glow-white": "0 0 20px rgba(255, 255, 255, 0.15)",
        "glass": "0 8px 32px rgba(0, 0, 0, 0.4)",
      }
    },
  },
  plugins: [],
};
export default config;
