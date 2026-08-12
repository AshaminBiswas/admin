/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        prc: {
          bg: "#09090B",      /* Deep Obsidian Background */
          taupe: "#18181B",   /* Dark Zinc / Elevated Container */
          border: "#27272A",  /* Subtle Zinc Border */
          sage: "#8B5CF6",    /* Neon Violet / Primary Accent */
          amber: "#F59E0B",   /* Warm Amber Accent */
          light: "#FAFAFA",   /* Pure Ice White / Main Text */
          muted: "#A1A1AA",   /* Muted Slate Text */
        }
      },
      fontFamily: {
        serif: ["'Gilda Display'", "serif"],
        sans: ["'Outfit'", "sans-serif"],
      }
    },
  },
  plugins: [],
}
