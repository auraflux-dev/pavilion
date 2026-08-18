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
        'pto-green': 'var(--brand-green)',
        'pto-gold':  'var(--brand-gold)',
        'pto-cream': 'var(--brand-warm)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
