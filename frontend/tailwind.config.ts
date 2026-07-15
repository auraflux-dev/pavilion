import type { Config } from "tailwindcss"

const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pto-green': '#085508',
        'pto-gold':  '#FFD700',
        'pto-cream': '#F5F0E8',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
