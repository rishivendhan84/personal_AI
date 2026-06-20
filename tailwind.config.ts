import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Wired via next/font in layout.tsx → CSS variables.
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"], // editorial greeting only
      },
      colors: {
        // shadcn semantic tokens (mapped to CSS vars in globals.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // PAIOS premium palette (explicit, design-token names)
        surface: {
          base: "hsl(var(--background))",
          elevated: "hsl(var(--surface-elevated))",
        },
        violet: {
          DEFAULT: "#7C5CFC", // signature accent
          hover: "#8B6CFF",
        },
        cyan: {
          DEFAULT: "#22D3EE", // data viz + positive numbers
        },
        positive: "#34D399",
        caution: "#FBBF24",
        danger: "#F87171",
        // urgency tier mapping (PRD §7.4 + design spec)
        urgency: {
          today: "#F87171",
          week: "#7C5CFC",
          month: "#22D3EE",
          someday: "#52525B",
        },
      },
      borderRadius: {
        card: "20px",
        panel: "12px",
        chip: "10px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // soft layered elevation for glass cards
        card: "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 30px -12px rgba(0,0,0,0.7)",
        "glow-violet": "0 0 0 1px rgba(124,92,252,0.35), 0 8px 40px -8px rgba(124,92,252,0.35)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-now": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(-10%, -10%) rotate(0deg)" },
          "50%": { transform: "translate(10%, 10%) rotate(8deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s ease-out both",
        shimmer: "shimmer 2.2s infinite",
        "pulse-now": "pulse-now 2.4s ease-in-out infinite",
        aurora: "aurora 18s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
