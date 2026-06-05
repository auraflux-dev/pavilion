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
        'pto-green':  '#085508',
        'pto-maroon': '#8B1A1A',
        'pto-teal':   '#2A8B7A',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
