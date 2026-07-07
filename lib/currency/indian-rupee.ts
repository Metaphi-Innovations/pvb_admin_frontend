/**
 * Indian Rupee formatting for ERP amount fields.
 * Display: ₹ 1,00,000 (space after ₹, en-IN grouping)
 */

/** Strip display characters and parse to number */
export function parseIndianRupeeInput(raw: string): number {
  const sanitized = sanitizeRupeeRawInput(raw);
  if (!sanitized || sanitized === ".") return 0;
  const n = parseFloat(sanitized);
  return Number.isFinite(n) ? n : 0;
}

/** Sanitize typed input — digits + optional decimal (max 2 places), no leading zeros */
export function sanitizeRupeeRawInput(raw: string): string {
  let s = raw.replace(/[₹,\s]/g, "").replace(/[^\d.]/g, "");
  const dotIndex = s.indexOf(".");
  if (dotIndex !== -1) {
    const intPart = s.slice(0, dotIndex);
    const decPart = s.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    s = `${intPart}.${decPart}`;
  }
  if (s.includes(".")) {
    const [intPart, decPart = ""] = s.split(".");
    const normalizedInt = intPart.replace(/^0+(?=\d)/, "") || "0";
    return decPart !== undefined ? `${normalizedInt}.${decPart}` : normalizedInt;
  }
  if (!s) return "";
  return s.replace(/^0+(?=\d)/, "") || "0";
}

/** Format numeric value for display: ₹ 1,00,000 */
export function formatIndianRupeeDisplay(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
  return `₹ ${formatted}`;
}

/** Format raw typed string for live input display */
export function formatIndianRupeeWhileTyping(raw: string): string {
  const sanitized = sanitizeRupeeRawInput(raw.replace(/[₹,\s]/g, ""));
  if (!sanitized) return "";
  if (sanitized.endsWith(".")) {
    const intPart = sanitized.slice(0, -1);
    const intNum = intPart ? parseInt(intPart, 10) : 0;
    const base = formatIndianRupeeDisplay(Number.isFinite(intNum) ? intNum : 0);
    return `${base}.`;
  }
  const numeric = parseFloat(sanitized);
  if (!Number.isFinite(numeric)) return "₹ 0";
  return formatIndianRupeeDisplay(numeric);
}

/** Validate CP ≤ DP ≤ RP ≤ MRP */
export function validatePricingHierarchy(
  cp: number,
  dp: number,
  rp: number,
  mrp: number,
): string | null {
  if (cp > dp) {
    return "Cost Price (CP) cannot be greater than Distributor Price (DP).";
  }
  if (dp > rp) {
    return "Distributor Price (DP) cannot be greater than Retail Price (RP).";
  }
  if (rp > mrp) {
    return "Retail Price (RP) cannot be greater than MRP.";
  }
  return null;
}
