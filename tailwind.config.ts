import type { Config } from "tailwindcss";

export default <Config>{
  theme: {
    extend: {
      colors: {
        background: "#1A1C1E", // Deep Space
        glass: "rgba(45, 48, 52, 0.6)",
        "glass-border": "rgba(255, 255, 255, 0.1)",
        "text-primary": "#E2E2E2",
        "text-muted": "#8E9196",
        // Mode Accents
        focus: {
          DEFAULT: "#A3423C",
          glow: "rgba(163, 66, 60, 0.2)",
        },
        "short-break": {
          DEFAULT: "#436850",
          glow: "rgba(67, 104, 80, 0.2)",
        },
        "long-break": {
          DEFAULT: "#4B7B94",
          glow: "rgba(75, 123, 148, 0.2)",
        },
        flow: {
          DEFAULT: "#765898",
          glow: "rgba(118, 88, 152, 0.2)",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
      backdropBlur: {
        xl: "20px",
      },
    },
  },
};
