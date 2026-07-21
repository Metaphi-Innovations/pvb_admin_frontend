/**
 * Statutory / mandatory system ledgers for Chart of Accounts (Tally-like).
 * Rates, parties, products, and warehouses live in ERP Masters — not as COA ledgers.
 */

export interface CoaStatutoryLedgerSeed {
  name: string;
  code: string;
  balanceType: "Debit" | "Credit";
  gstApplicable?: boolean;
  tdsApplicable?: boolean;
  /** Reserved component used only to preserve legacy system ID allocation. */
  optional?: boolean;
}

/** Assets → Current Assets → Duties & Taxes */
export const GST_INPUT_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  { name: "Input CGST", code: "12201", balanceType: "Debit", gstApplicable: true },
  { name: "Input SGST", code: "12202", balanceType: "Debit", gstApplicable: true },
  { name: "Input IGST", code: "12203", balanceType: "Debit", gstApplicable: true },
];

/** Liabilities → Current Liabilities → Duties & Taxes */
export const GST_OUTPUT_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  { name: "Output CGST", code: "231101", balanceType: "Credit", gstApplicable: true },
  { name: "Output SGST", code: "231102", balanceType: "Credit", gstApplicable: true },
  { name: "Output IGST", code: "231103", balanceType: "Credit", gstApplicable: true },
];

export const DUTIES_LIABILITY_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  ...GST_OUTPUT_STATUTORY_LEDGERS,
  { name: "TDS Payable", code: "23112", balanceType: "Credit", tdsApplicable: true },
  { name: "TCS Payable", code: "23113", balanceType: "Credit" },
];

/** @deprecated Use DUTIES_LIABILITY_STATUTORY_LEDGERS */
export const DUTIES_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  { name: "TCS Payable", code: "23113", balanceType: "Credit" },
];

export const MANDATORY_SYSTEM_LEDGERS = {
  stockInHand: { name: "Stock in Hand", code: "12131", balanceType: "Debit" as const },
  productSales: { name: "Product Sales", code: "31101", balanceType: "Credit" as const },
  purchaseAccount: { name: "Purchase Account", code: "41101", balanceType: "Debit" as const },
} as const;

export const GST_INPUT_LEDGER_NAMES = new Set(
  GST_INPUT_STATUTORY_LEDGERS.map((l) => l.name.toLowerCase()),
);

export const GST_OUTPUT_LEDGER_NAMES = new Set(
  GST_OUTPUT_STATUTORY_LEDGERS.map((l) => l.name.toLowerCase()),
);

export const DUTIES_DIRECT_STATUTORY_LEDGER_NAMES = new Set(
  DUTIES_LIABILITY_STATUTORY_LEDGERS.map((l) => l.name.toLowerCase()),
);

/** All locked Level-4 system ledger names (case-insensitive). */
export const MANDATORY_SYSTEM_LEDGER_NAMES = new Set([
  ...GST_INPUT_LEDGER_NAMES,
  ...DUTIES_DIRECT_STATUTORY_LEDGER_NAMES,
  MANDATORY_SYSTEM_LEDGERS.stockInHand.name.toLowerCase(),
  MANDATORY_SYSTEM_LEDGERS.productSales.name.toLowerCase(),
  MANDATORY_SYSTEM_LEDGERS.purchaseAccount.name.toLowerCase(),
]);

/**
 * Level-4 ledgers that stay permanently locked in COA UI
 * (no edit, delete, rename, or parent change).
 * Customer/Supplier (Sundry Debtors/Creditors) are intentionally excluded.
 */
export const LOCKED_COA_SYSTEM_LEDGER_NAMES = new Set([
  MANDATORY_SYSTEM_LEDGERS.stockInHand.name.toLowerCase(),
  ...GST_INPUT_LEDGER_NAMES,
  ...GST_OUTPUT_LEDGER_NAMES,
  "tds payable",
  "tcs payable",
]);

export function isLockedSystemLedger(ledger: {
  nodeLevel?: string;
  accountName?: string;
}): boolean {
  if (ledger.nodeLevel != null && ledger.nodeLevel !== "ledger") return false;
  const name = (ledger.accountName ?? "").trim().toLowerCase();
  if (!name) return false;
  if (LOCKED_COA_SYSTEM_LEDGER_NAMES.has(name)) return true;
  // Legacy rate-suffixed GST ledgers stay locked if present
  if (/^(input|output)\s+(cgst|sgst|igst)\s+\(gst\s+[\d.]+%\)$/i.test(name)) return true;
  if (/^(input|output)\s+(cgst|sgst|igst)\s+[\d.]+%$/i.test(name)) return true;
  return false;
}

/** Rate-suffixed ledgers from legacy GST Master → COA sync (not used in statutory chart). */
export function isRateSpecificGstLedgerName(name: string): boolean {
  const n = name.trim();
  if (/^(Input|Output)\s+(CGST|SGST|IGST)\s+\(GST\s+[\d.]+%\)$/i.test(n)) return true;
  if (/^(Input|Output)\s+(CGST|SGST|IGST)\s+[\d.]+%$/i.test(n)) return true;
  return false;
}

/** Flat statutory ledger name for voucher posting (rate applied on transaction, not per ledger). */
export const GST_STATUTORY_LEDGER_BY_KIND = {
  input_cgst: "Input CGST",
  input_sgst: "Input SGST",
  input_igst: "Input IGST",
  output_cgst: "Output CGST",
  output_sgst: "Output SGST",
  output_igst: "Output IGST",
} as const;

/** Legacy demo / generic names replaced by the statutory chart */
export const LEGACY_GST_LEDGER_NAMES = new Set([
  "cgst payable",
  "sgst payable",
  "igst payable",
  "cgst receivable",
  "sgst receivable",
  "igst receivable",
  "gst input credit (cgst)",
  "gst input credit (sgst)",
  "gst input credit (igst)",
  "output cgst payable",
  "output sgst payable",
  "output igst payable",
  "custom duty payable",
  "state cess payable",
  "income tax payable - advance",
  "professional tax payable",
  "cgst input",
  "sgst input",
  "igst input",
  "cgst output",
  "sgst output",
  "igst output",
  "input cess",
  "output cess",
]);
