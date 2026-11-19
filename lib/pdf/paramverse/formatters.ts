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

/** GST portal address field labels sometimes stored in registered_gst_address. */
const GST_ADDRESS_FIELD_LABEL_RE =
  /(?:Building No\.\/Flat No\.|Building No\.|Flat No\.|Floor No\.|Premise No\.|Road\/Street|Street|Locality\/Sub Locality|Sub Locality|Locality|City\/Town\/Village|City\/Town|Town\/Village|District|State|PIN Code|Pincode|Landmark)\s*:\s*/gi;

const GST_ADDRESS_LABEL_HINT_RE =
  /(?:Building No\.\/Flat No\.|Road\/Street|Locality\/Sub Locality|City\/Town\/Village|PIN Code)\s*:/i;

/**
 * Strip GST-portal field labels from an address so PDFs show values only.
 * e.g. "Building No./Flat No.: KHATIAN NO-2167, Road/Street: J.L NO-2"
 *   → "KHATIAN NO-2167, J.L NO-2"
 */
export function stripGstAddressFieldLabels(value: unknown): string {
  let text = String(value ?? "").trim();
  if (!text) return "";
  if (GST_ADDRESS_LABEL_HINT_RE.test(text)) {
    text = text.replace(GST_ADDRESS_FIELD_LABEL_RE, "");
  }
  return text
    .replace(/,{2,}/g, ",")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^,\s*|,\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function escapeHtml(value: unknown): string {
  return asText(value, "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Escape for double-quoted src/href attributes; preserves data/HTTP URLs. */
export function escapeSrcAttr(value: unknown): string {
  const raw = String(value ?? "");
  if (!raw) return "";
  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://")
  ) {
    return raw.replaceAll('"', "&quot;");
  }
  return escapeHtml(raw);
}

const ISO_DATE_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Format date for PDF/display as DD/MM/YYYY without timezone shift on date-only values. */
export function formatDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";

  const isoMatch = ISO_DATE_PREFIX_RE.exec(raw);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";
  const d = String(parsed.getDate()).padStart(2, "0");
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const y = parsed.getFullYear();
  return `${d}/${m}/${y}`;
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
