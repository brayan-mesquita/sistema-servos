import type { Config } from "tailwindcss";

// NOTE: This project uses Tailwind CSS v4, which configures its theme directly 
// in `src/app/globals.css` using the CSS `@theme` directive.
// This `tailwind.config.ts` is provided for backward compatibility and to assist
// IDE integrations (like Tailwind CSS IntelliSense) in parsing custom tokens.

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          orange: "#ff5500",
          "orange-hover": "#ff6600",
        },
        charcoal: {
          bg: "#121212",
          card: "#1a1a1a",
          border: "#2a2a2a",
          "text-primary": "#ffffff",
          "text-secondary": "#e0e0e0",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-outfit)", "sans-serif"],
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-right": "slide-out-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-bottom": "slide-in-bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-bottom": "slide-out-bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-in",
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "slide-in-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-bottom": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
