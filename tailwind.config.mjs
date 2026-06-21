/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0A0A0A", alt: "#121212" },
        surface: "#1A1A1A",
        border: "#2A2A2A",
        text: { DEFAULT: "#F5F5F5", muted: "#A0A0A0" },
        accent: { DEFAULT: "#FF6B35", hover: "#E63946" },
        success: "#22C55E",
        error: "#EF4444",
      },
      fontFamily: {
        display: ["Russo One", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};
