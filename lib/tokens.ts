// ── Design Tokens — Dharitri Sutra Agri ERP ────────────────────────────────
// Single source of truth for JS-side token usage (charts, dynamic styles, etc.)

export const colors = {
  // Brand orange — from "Dharitri" wordmark
  brand: {
    50:  "#FFF3E8", 100: "#FFE4C4", 200: "#FFCB90", 300: "#FFAA55",
    400: "#FF8C2A", 500: "#F47920", 600: "#D96A10", 700: "#B85508",
    800: "#94400A", 900: "#6B2D07", 950: "#3D1503",
  },
  // Navy — from "Sutra" wordmark + shield border
  navy: {
    400: "#5C8EEE", 500: "#3A6DD8", 600: "#2451B7", 700: "#1A3A96",
    800: "#153080", 900: "#0F2266",
  },
  // Leaf green — from plant inside shield
  leaf: {
    400: "#50AF50", 500: "#33913A", 600: "#267A2E", 700: "#1A5F22",
  },
  // Retained supporting palettes
  sage:   { 400: "#8aaa72", 500: "#7c9a7e", 600: "#5c7a5e" },
  forest: { 500: "#2d5a2e", 600: "#1e4520", 700: "#193919" },
  olive:  { 400: "#9aa844", 500: "#6b7c3a", 600: "#556130" },
  earth:  { 100: "#f2ede3", 200: "#e8e0d0", 300: "#d4c9b0" },

  // Semantic
  success: "#267A2E",
  warning: "#92400e",
  error:   "#991b1b",
  info:    "#1A3A96",
  neutral: "#6b7280",
} as const;

export const status = {
  active:   { bg: "#F0F9F0", text: "#1A5F22", border: "#7CC87C", dot: "#33913A" },
  inactive: { bg: "#f5f5f4", text: "#6b7280", border: "#d1d5db", dot: "#9ca3af" },
  pending:  { bg: "#fff7ed", text: "#92400e", border: "#fcd34d", dot: "#f59e0b" },
  approved: { bg: "#F0F9F0", text: "#1A5F22", border: "#7CC87C", dot: "#33913A" },
  rejected: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5", dot: "#ef4444" },
  draft:    { bg: "#EEF2FF", text: "#1A3A96", border: "#B8C9FF", dot: "#3A6DD8" },
  shipped:  { bg: "#f0f9ff", text: "#075985", border: "#bae6fd", dot: "#0ea5e9" },
  overdue:  { bg: "#FFF3E8", text: "#B85508", border: "#FFAA55", dot: "#F47920" },
  partial:  { bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff", dot: "#a855f7" },
  closed:   { bg: "#fafafa", text: "#374151", border: "#e5e7eb", dot: "#6b7280" },
} as const;

export type StatusKey = keyof typeof status;

export const spacing = {
  xs:  "4px",
  sm:  "8px",
  md:  "12px",
  lg:  "16px",
  xl:  "20px",
  "2xl": "24px",
  "3xl": "32px",
  "4xl": "40px",
  "5xl": "48px",
} as const;

export const radius = {
  input:  "8px",
  btn:    "10px",
  card:   "14px",
  modal:  "18px",
  badge:  "6px",
  full:   "9999px",
} as const;

export const typography = {
  pageTitle:    { size: "20px", weight: "700", line: "28px" },
  sectionTitle: { size: "16px", weight: "600", line: "22px" },
  cardTitle:    { size: "14px", weight: "600", line: "20px" },
  bodyLg:       { size: "13px", weight: "400", line: "18px" },
  body:         { size: "13px", weight: "400", line: "18px" },
  table:        { size: "12px", weight: "400", line: "16px" },
  helper:       { size: "11px", weight: "400", line: "14px" },
  badge:        { size: "11px", weight: "600", line: "14px" },
} as const;

// Chart palette — ordered for visual variety on Dharitri Sutra dashboards
export const chartPalette = [
  "#D96A10", "#F47920", "#1A3A96", "#3A6DD8",
  "#267A2E", "#33913A", "#FFAA55", "#5C8EEE",
  "#7CC87C", "#B85508",
] as const;

// KPI card accent colors (for left border or icon bg)
export const kpiAccents = {
  orange: { bg: "#FFF3E8", icon: "#D96A10", border: "#FFCB90" },
  navy:   { bg: "#EEF2FF", icon: "#1A3A96", border: "#B8C9FF" },
  leaf:   { bg: "#F0F9F0", icon: "#267A2E", border: "#7CC87C" },
  amber:  { bg: "#fef9ec", icon: "#92400e", border: "#fcd34d" },
  blue:   { bg: "#f0f9ff", icon: "#075985", border: "#bae6fd" },
  purple: { bg: "#fdf4ff", icon: "#7e22ce", border: "#e9d5ff" },
  earth:  { bg: "#faf8f4", icon: "#8c7454", border: "#d4c9b0" },
} as const;
