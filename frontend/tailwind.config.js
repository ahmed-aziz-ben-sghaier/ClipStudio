/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0C0F",       // fond principal, noir bleuté
        surface: "#12151A",   // panneaux / cartes
        surface2: "#1A1E24",  // panneaux surélevés
        line: "#262B32",      // bordures fines
        paper: "#EDEAE3",     // texte principal, blanc chaud
        muted: "#8A8F98",     // texte secondaire
        rec: {                // accent principal — voyant d'enregistrement
          DEFAULT: "#FF5A36",
          dim: "#C7431F",
        },
        play: {                // accent secondaire — curseur de lecture
          DEFAULT: "#4EF0C4",
          dim: "#2FAE8E",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};