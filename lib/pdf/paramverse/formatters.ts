import { amountInWords } from "@/lib/procurement/utils";

const INR = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function asText(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
}

export function escapeHtml(value: unknown): string {
  return asText(value, "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatCurrency(value: unknown): string {
  return `\u20B9 ${INR.format(toNumber(value))}`;
}

export function formatNumber(value: unknown): string {
  return INR.format(toNumber(value));
}

export function formatPercent(value: unknown): string {
  const pct = toNumber(value);
  if (!pct) return "-";
  return `${pct.toFixed(2).replace(/\.00$/, "")}%`;
}

export function formatAmountInWords(value: unknown, fallback?: string): string {
  const preferred = String(fallback ?? "").trim();
  if (preferred) return preferred;
  const amount = toNumber(value);
  if (!amount) return "-";
  return amountInWords(amount);
}

export function formatQty(value: unknown): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n)
    ? String(n)
    : n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function sanitizePdfFileName(docNumber: unknown, prefix = "DOC"): string {
  const raw = String(docNumber ?? "").trim() || prefix;
  return raw.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}
