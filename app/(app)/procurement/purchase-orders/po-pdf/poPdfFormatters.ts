"use client";

/** Re-exports shared Paramverse PDF formatters (kept for existing relative imports). */
export {
  asText,
  escapeHtml,
  formatAmountInWords,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  sanitizePdfFileName,
  toNumber,
} from "@/lib/pdf/paramverse";
