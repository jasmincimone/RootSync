import type { Config } from "tailwindcss";

const fixTokens = {
  clay: "#e1cec3",
  espresso: "#342a0f",
  bark: "#59281d",
  gold: "#b8895f",
  "warm-brown": "#80654b",
  forest: "#044730",
  amber: "#e59a28",
  "clay-muted": "#d4bcae",
  "surface-tint": "#e8ded6",
  /** Page canvas — light cream for cleaner contrast (not raw clay). */
  bg: "#f8efe8",
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...fixTokens,
        fix: {
          bg: fixTokens.bg,
          "bg-muted": fixTokens["clay-muted"],
          surface: fixTokens["surface-tint"],
          text: fixTokens.espresso,
          "text-muted": fixTokens.bark,
          heading: fixTokens.bark,
          border: fixTokens.espresso,
          accent: fixTokens.gold,
          primary: fixTokens.forest,
          "primary-foreground": fixTokens.clay,
          cta: fixTokens.amber,
          "cta-foreground": fixTokens.espresso,
          link: fixTokens.forest,
          "link-hover": fixTokens.amber,
          "focus-ring": fixTokens.amber,
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(52, 42, 15, 0.08)",
        "focus-ring": "0 0 0 2px var(--focus-ring)",
      },
      borderColor: {
        /** Match message panel / inputs (`border-fix-border/20` feel) when `border` has no color token. */
        DEFAULT: "rgb(52 42 15 / 0.2)",
      },
      ringColor: {
        /** Tailwind’s built-in default ring is blue; use espresso so stray rings match the UI. */
        DEFAULT: fixTokens.espresso,
        fix: "var(--focus-ring)",
      },
      fontFamily: {
        handwriting: ["var(--font-caveat)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
