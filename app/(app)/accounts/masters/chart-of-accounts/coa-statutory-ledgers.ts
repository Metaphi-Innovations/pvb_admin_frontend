/**
 * Statutory / mandatory system ledgers for Chart of Accounts (Tally-like).
 * Rates, parties, products, and warehouses live in ERP Masters — not as COA ledgers.
 */

/** Stable keys for mandatory posting system ledgers (posting engine identity). */
export type ApprovedSystemLedgerKey = "PRODUCT_SALES" | "STOCK_IN_HAND" | "PURCHASE_ACCOUNT";

export const APPROVED_SYSTEM_LEDGER_KEYS = {
  PRODUCT_SALES: "PRODUCT_SALES",
  STOCK_IN_HAND: "STOCK_IN_HAND",
  PURCHASE_ACCOUNT: "PURCHASE_ACCOUNT",
} as const satisfies Record<ApprovedSystemLedgerKey, ApprovedSystemLedgerKey>;

/** COA alias prefix for stable system-ledger identity (`sys:PRODUCT_SALES`). */
export const SYSTEM_LEDGER_ALIAS_PREFIX = "sys:";

export function systemLedgerAlias(key: ApprovedSystemLedgerKey): string {
  return `${SYSTEM_LEDGER_ALIAS_PREFIX}${key}`;
}

export interface CoaStatutoryLedgerSeed {
  name: string;
  code: string;
  balanceType: "Debit" | "Credit";
  gstApplicable?: boolean;
  tdsApplicable?: boolean;
  /** Stable posting identity — never use display name as primary key. */
  systemKey?: ApprovedSystemLedgerKey;
  /** Explicit system alias (e.g. sys:TDS_RECEIVABLE) when not covered by systemKey. */
  alias?: string;
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

/** Assets → Current Assets → Other Current Assets */
export const OTHER_CURRENT_ASSETS_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  {
    name: "TDS Receivable",
    code: "12181",
    balanceType: "Debit",
    tdsApplicable: true,
    alias: "sys:TDS_RECEIVABLE",
  },
];

/** @deprecated Use DUTIES_LIABILITY_STATUTORY_LEDGERS */
export const DUTIES_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  { name: "TCS Payable", code: "23113", balanceType: "Credit" },
];

export const MANDATORY_SYSTEM_LEDGERS = {
  stockInHand: {
    name: "Stock in Hand",
    code: "12131",
    balanceType: "Debit" as const,
    systemKey: APPROVED_SYSTEM_LEDGER_KEYS.STOCK_IN_HAND,
  },
  productSales: {
    name: "Product Sales",
    code: "31101",
    balanceType: "Credit" as const,
    systemKey: APPROVED_SYSTEM_LEDGER_KEYS.PRODUCT_SALES,
  },
  purchaseAccount: {
    name: "Purchase Account",
    code: "41101",
    balanceType: "Debit" as const,
    systemKey: APPROVED_SYSTEM_LEDGER_KEYS.PURCHASE_ACCOUNT,
  },
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

export const OTHER_CURRENT_ASSETS_LEDGER_NAMES = new Set(
  OTHER_CURRENT_ASSETS_STATUTORY_LEDGERS.map((l) => l.name.toLowerCase()),
);

/** All locked Level-4 system ledger names (case-insensitive). */
export const MANDATORY_SYSTEM_LEDGER_NAMES = new Set([
  ...GST_INPUT_LEDGER_NAMES,
  ...DUTIES_DIRECT_STATUTORY_LEDGER_NAMES,
  ...OTHER_CURRENT_ASSETS_LEDGER_NAMES,
  MANDATORY_SYSTEM_LEDGERS.stockInHand.name.toLowerCase(),
  MANDATORY_SYSTEM_LEDGERS.productSales.name.toLowerCase(),
  MANDATORY_SYSTEM_LEDGERS.purchaseAccount.name.toLowerCase(),
]);

/**
 * Level-4 ledgers that stay permanently locked in COA UI
 * (no edit, delete, rename, move, deactivate, or parent change).
 * Customer/Supplier (Sundry Debtors/Creditors) are intentionally excluded.
 */
export const LOCKED_COA_SYSTEM_LEDGER_NAMES = new Set([
  MANDATORY_SYSTEM_LEDGERS.stockInHand.name.toLowerCase(),
  MANDATORY_SYSTEM_LEDGERS.productSales.name.toLowerCase(),
  ...GST_INPUT_LEDGER_NAMES,
  ...GST_OUTPUT_LEDGER_NAMES,
  "tds payable",
  "tds receivable",
  "tcs payable",
]);

/** Approved posting system aliases that force lock even if display name was altered. */
const LOCKED_SYSTEM_LEDGER_ALIASES = new Set([
  systemLedgerAlias(APPROVED_SYSTEM_LEDGER_KEYS.STOCK_IN_HAND).toLowerCase(),
  systemLedgerAlias(APPROVED_SYSTEM_LEDGER_KEYS.PRODUCT_SALES).toLowerCase(),
  "sys:tds_receivable",
]);

export function isLockedSystemLedger(ledger: {
  nodeLevel?: string;
  accountName?: string;
  alias?: string;
}): boolean {
  if (ledger.nodeLevel != null && ledger.nodeLevel !== "ledger") return false;
  const alias = (ledger.alias ?? "").trim().toLowerCase();
  if (alias && LOCKED_SYSTEM_LEDGER_ALIASES.has(alias)) return true;
  const name = (ledger.accountName ?? "").trim().toLowerCase();
  if (!name) return false;
  if (LOCKED_COA_SYSTEM_LEDGER_NAMES.has(name)) return true;
  // Master-projected TDS/TCS section ledgers (view-only under Payable parents)
  if (/^tds\s*-\s*.+/.test(name) || /^tcs\s*-\s*.+/.test(name)) return true;
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
