/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./config/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Dharitri Sutra Brand Palette ──────────────────────────────
        // Primary: Warm orange from the "Dharitri" wordmark in the logo
        brand: {
          50:  "#FFF3E8",
          100: "#FFE4C4",
          200: "#FFCB90",
          300: "#FFAA55",
          400: "#FF8C2A",
          500: "#F47920",  // logo orange
          600: "#D96A10",  // primary CTA buttons, active states
          700: "#B85508",  // hover on active, active link color
          800: "#94400A",
          900: "#6B2D07",
          950: "#3D1503",
        },
        // Secondary: Deep navy from the "Sutra" wordmark + shield border
        navy: {
          50:  "#EEF2FF",
          100: "#D8E2FF",
          200: "#B8C9FF",
          300: "#8AAEFF",
          400: "#5C8EEE",
          500: "#3A6DD8",
          600: "#2451B7",
          700: "#1A3A96",  // logo navy match — page titles, headings
          800: "#153080",
          900: "#0F2266",
          950: "#091440",
        },
        // Accent: Leaf green from the plant inside the shield
        leaf: {
          50:  "#F0F9F0",
          100: "#D8F0D8",
          200: "#B0E0B0",
          300: "#7CC87C",
          400: "#50AF50",
          500: "#33913A",
          600: "#267A2E",  // logo leaf green — active/approved states
          700: "#1A5F22",
          800: "#134A1A",
          900: "#0C3514",
        },
        // Retained supporting palettes (used in existing components)
        sage: {
          50:  "#f4f7f0",
          100: "#e6eddf",
          200: "#cddbbf",
          300: "#adc298",
          400: "#8aaa72",
          500: "#7c9a7e",
          600: "#5c7a5e",
          700: "#486149",
          800: "#3b4e3c",
          900: "#324033",
        },
        forest: {
          50:  "#edf5ee",
          100: "#d5e9d7",
          200: "#add4b2",
          300: "#78b57f",
          400: "#4a9055",
          500: "#2d5a2e",
          600: "#1e4520",
          700: "#193919",
          800: "#152e16",
          900: "#112513",
        },
        olive: {
          50:  "#f5f6ec",
          100: "#e9ecce",
          200: "#d4d9a0",
          300: "#b8c16a",
          400: "#9aa844",
          500: "#6b7c3a",
          600: "#556130",
          700: "#434c27",
          800: "#383f22",
          900: "#2f351e",
        },
        earth: {
          50:  "#faf8f4",
          100: "#f2ede3",
          200: "#e8e0d0",
          300: "#d4c9b0",
          400: "#bca98a",
          500: "#a68f6a",
          600: "#8c7454",
          700: "#735d44",
          800: "#604d3b",
          900: "#524134",
        },
        // ── Semantic ──────────────────────────────────────────────────
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border:  "hsl(var(--border))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",
        // ── Status colors ─────────────────────────────────────────────
        status: {
          active:   { bg: "#F0F9F0", text: "#1A5F22", border: "#7CC87C" },
          inactive: { bg: "#f5f5f4", text: "#6b7280", border: "#d1d5db" },
          pending:  { bg: "#fff7ed", text: "#92400e", border: "#fcd34d" },
          approved: { bg: "#F0F9F0", text: "#1A5F22", border: "#7CC87C" },
          rejected: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
          draft:    { bg: "#EEF2FF", text: "#1A3A96", border: "#B8C9FF" },
          shipped:  { bg: "#f0f9ff", text: "#075985", border: "#bae6fd" },
          overdue:  { bg: "#FFF3E8", text: "#B85508", border: "#FFAA55" },
        },
      },
      fontFamily: {
        sans:    ["Plus Jakarta Sans", "Inter", "Manrope", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "page-title":    ["20px", { lineHeight: "28px", fontWeight: "700", letterSpacing: "-0.01em" }],
        "section-title": ["16px", { lineHeight: "22px", fontWeight: "600" }],
        "card-title":    ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "body-lg":       ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "body":          ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "table":         ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "helper":        ["11px", { lineHeight: "14px", fontWeight: "400" }],
        "badge":         ["11px", { lineHeight: "14px", fontWeight: "600", letterSpacing: "0.04em" }],
      },
      spacing: {
        // 4px base grid
        "0.5": "2px",
        "1":   "4px",
        "1.5": "6px",
        "2":   "8px",
        "3":   "12px",
        "4":   "16px",
        "5":   "20px",
        "6":   "24px",
        "8":   "32px",
        "10":  "40px",
        "12":  "48px",
        "16":  "64px",
        "20":  "80px",
        "24":  "96px",
      },
      borderRadius: {
        "none":   "0",
        "sm":     "6px",
        "md":     "8px",    // inputs (tighter than before)
        "lg":     "10px",   // buttons
        "xl":     "14px",   // cards
        "2xl":    "18px",   // modals
        "3xl":    "24px",
        "full":   "9999px",
        // aliases
        "input":  "8px",
        "btn":    "10px",
        "card":   "14px",
        "modal":  "18px",
      },
      boxShadow: {
        "xs":     "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        "sm":     "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "md":     "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        "lg":     "0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
        "xl":     "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)",
        // Updated to orange-tinted shadows matching Dharitri Sutra brand
        "card":       "0 1px 3px 0 rgb(217 106 16 / 0.08), 0 1px 2px -1px rgb(217 106 16 / 0.04)",
        "card-hover": "0 8px 16px -4px rgb(217 106 16 / 0.14), 0 2px 6px -2px rgb(217 106 16 / 0.07)",
        "navbar":     "0 1px 0 0 rgb(0 0 0 / 0.06), 0 2px 4px 0 rgb(0 0 0 / 0.03)",
        "modal":      "0 25px 50px -12px rgb(0 0 0 / 0.18)",
        "input":      "0 0 0 3px rgb(217 106 16 / 0.14)",  // orange focus ring
        "none":       "none",
      },
      backgroundImage: {
        // Primary: orange gradient (CTA buttons, logo mark)
        "brand-gradient":   "linear-gradient(135deg, #F47920 0%, #B85508 100%)",
        // Navy gradient (secondary actions, deep UI elements)
        "navy-gradient":    "linear-gradient(135deg, #3A6DD8 0%, #1A3A96 100%)",
        // Full Dharitri Sutra gradient (orange → navy, the full brand)
        "ds-gradient":      "linear-gradient(135deg, #F47920 0%, #D96A10 40%, #1A3A96 100%)",
        // Leaf gradient (success states)
        "leaf-gradient":    "linear-gradient(135deg, #33913A 0%, #267A2E 100%)",
        // Subtle backgrounds
        "earth-gradient":   "linear-gradient(135deg, #f2ede3 0%, #e8e0d0 100%)",
        "hero-pattern":     "radial-gradient(circle at 20% 50%, rgb(244 121 32 / 0.06) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgb(26 58 150 / 0.04) 0%, transparent 50%)",
        "card-subtle":      "linear-gradient(to bottom right, rgb(255 255 255), rgb(255 243 232 / 0.4))",
      },
      animation: {
        "fade-in":       "fadeIn 0.2s ease-out",
        "slide-up":      "slideUp 0.25s ease-out",
        "slide-in-right":"slideInRight 0.25s ease-out",
        "spin-slow":     "spin 2s linear infinite",
        "pulse-soft":    "pulseSoft 2s ease-in-out infinite",
        "shimmer":       "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:        { "0%": { opacity: 0 },           "100%": { opacity: 1 } },
        slideUp:       { "0%": { opacity: 0, transform: "translateY(8px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        slideInRight:  { "0%": { opacity: 0, transform: "translateX(12px)" }, "100%": { opacity: 1, transform: "translateX(0)" } },
        pulseSoft:     { "0%, 100%": { opacity: 1 },     "50%": { opacity: 0.6 } },
        shimmer:       { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
