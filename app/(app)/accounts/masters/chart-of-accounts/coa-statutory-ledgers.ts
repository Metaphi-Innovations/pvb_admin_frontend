/**
 * Statutory GST / TDS / TCS ledger definitions for Chart of Accounts.
 * These are accounting ledgers only — rates and rules live in ERP Masters (integrated later).
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

export const GST_INPUT_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  { name: "CGST Input", code: "231101", balanceType: "Debit", gstApplicable: true },
  { name: "SGST Input", code: "231102", balanceType: "Debit", gstApplicable: true },
  { name: "IGST Input", code: "231103", balanceType: "Debit", gstApplicable: true },
  // Reserved legacy slot. Removed after ID allocation so later system IDs remain stable.
  { name: "Input Cess", code: "231104", balanceType: "Debit", gstApplicable: true, optional: true },
];

export const GST_OUTPUT_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  { name: "CGST Output", code: "231111", balanceType: "Credit", gstApplicable: true },
  { name: "SGST Output", code: "231112", balanceType: "Credit", gstApplicable: true },
  { name: "IGST Output", code: "231113", balanceType: "Credit", gstApplicable: true },
  // Reserved legacy slot. Removed after ID allocation so later system IDs remain stable.
  { name: "Output Cess", code: "231114", balanceType: "Credit", gstApplicable: true, optional: true },
];

export const DUTIES_STATUTORY_LEDGERS: CoaStatutoryLedgerSeed[] = [
  { name: "TCS Payable", code: "23113", balanceType: "Credit" },
];

export const GST_INPUT_LEDGER_NAMES = new Set(
  GST_INPUT_STATUTORY_LEDGERS.map((l) => l.name.toLowerCase()),
);

export const GST_OUTPUT_LEDGER_NAMES = new Set(
  GST_OUTPUT_STATUTORY_LEDGERS.map((l) => l.name.toLowerCase()),
);

export const DUTIES_DIRECT_STATUTORY_LEDGER_NAMES = new Set(
  DUTIES_STATUTORY_LEDGERS.map((l) => l.name.toLowerCase()),
);

/** Rate-suffixed ledgers from legacy GST Master → COA sync (not used in statutory chart). */
export function isRateSpecificGstLedgerName(name: string): boolean {
  const n = name.trim();
  if (/^(Input|Output)\s+(CGST|SGST|IGST)\s+\(GST\s+[\d.]+%\)$/i.test(n)) return true;
  if (/^(Input|Output)\s+(CGST|SGST|IGST)\s+[\d.]+%$/i.test(n)) return true;
  return false;
}

/** Flat statutory ledger name for voucher posting (rate applied on transaction, not per ledger). */
export const GST_STATUTORY_LEDGER_BY_KIND = {
  input_cgst: "CGST Input",
  input_sgst: "SGST Input",
  input_igst: "IGST Input",
  output_cgst: "CGST Output",
  output_sgst: "SGST Output",
  output_igst: "IGST Output",
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
  "input cgst",
  "input sgst",
  "input igst",
  "output cgst",
  "output sgst",
  "output igst",
  "input cess",
  "output cess",
]);
