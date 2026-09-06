/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#07040D",
        panel: "#0F0A1C",
        panel2: "#150E28",
        purple: "#B026FF",
        magenta: "#FF2E9A",
        cyan: "#2FE8E0",
        ink: "#EDE7F6",
        fade: "#7C6E93",
      },
      fontFamily: {
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["'Orbitron'", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 8px rgba(176,38,255,0.6), 0 0 24px rgba(176,38,255,0.25)",
        neonMagenta: "0 0 8px rgba(255,46,154,0.6), 0 0 24px rgba(255,46,154,0.25)",
      },
    },
  },
  plugins: [],
};
