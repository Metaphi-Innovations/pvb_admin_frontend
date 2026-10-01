import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getActivePostingLedgers, getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";

export type BankReconAdjustmentScope = "receipt" | "payment" | "both";

export interface BankReconAdjustmentTypeDef {
  id: string;
  label: string;
  scope: BankReconAdjustmentScope;
  /** Non-cash component that explains invoice/bill settlement shortfall (e.g. TDS deducted). */
  resolvesDocumentShortfall: boolean;
  /** Maps bank amount not applied to invoice/bill (e.g. customer advance, vendor advance). */
  absorbsBankSurplus: boolean;
  ledgerNameHints: string[];
  subGroupHints?: string[];
}

export const BANK_RECON_ADJUSTMENT_TYPES: BankReconAdjustmentTypeDef[] = [
  {
    id: "gst",
    label: "GST / Tax (from invoice)",
    scope: "both",
    resolvesDocumentShortfall: false,
    absorbsBankSurplus: false,
    ledgerNameHints: ["GST Output", "GST Input", "CGST", "SGST", "IGST"],
    subGroupHints: ["Duties & Taxes"],
  },
  {
    id: "tds_receivable",
    label: "TDS Receivable",
    scope: "receipt",
    resolvesDocumentShortfall: true,
    absorbsBankSurplus: false,
    ledgerNameHints: ["TDS Receivable"],
    subGroupHints: ["Duties & Taxes"],
  },
  {
    id: "tds_payable",
    label: "TDS Payable",
    scope: "payment",
    resolvesDocumentShortfall: true,
    absorbsBankSurplus: false,
    ledgerNameHints: ["TDS Payable"],
    subGroupHints: ["Duties & Taxes"],
  },
  {
    id: "discount_allowed",
    label: "Discount Allowed",
    scope: "receipt",
    resolvesDocumentShortfall: true,
    absorbsBankSurplus: false,
    ledgerNameHints: ["Discount Allowed", "Sales Discount"],
  },
  {
    id: "discount_received",
    label: "Discount Received",
    scope: "payment",
    resolvesDocumentShortfall: true,
    absorbsBankSurplus: false,
    ledgerNameHints: ["Discount Received", "Purchase Discount"],
  },
  {
    id: "bank_charges",
    label: "Bank Charges",
    scope: "both",
    resolvesDocumentShortfall: false,
    absorbsBankSurplus: true,
    ledgerNameHints: ["Bank Charges", "NEFT Charges"],
  },
  {
    id: "round_off",
    label: "Round Off",
    scope: "both",
    resolvesDocumentShortfall: true,
    absorbsBankSurplus: true,
    ledgerNameHints: ["Round Off", "Rounding Off"],
  },
  {
    id: "write_off",
    label: "Write Off",
    scope: "both",
    resolvesDocumentShortfall: true,
    absorbsBankSurplus: false,
    ledgerNameHints: ["Write Off", "Write-off", "Sundry Losses"],
  },
  {
    id: "customer_advance",
    label: "Customer Advance / On-account",
    scope: "receipt",
    resolvesDocumentShortfall: false,
    absorbsBankSurplus: true,
    ledgerNameHints: ["Advance Received", "Customer Advance"],
    subGroupHints: ["Advance Received from Customers"],
  },
  {
    id: "vendor_advance",
    label: "Supplier Advance / On-account",
    scope: "payment",
    resolvesDocumentShortfall: false,
    absorbsBankSurplus: true,
    ledgerNameHints: ["Advance Paid", "Supplier Advance"],
    subGroupHints: ["Advance Paid to Vendors"],
  },
  {
    id: "retention",
    label: "Retention",
    scope: "both",
    resolvesDocumentShortfall: true,
    absorbsBankSurplus: false,
    ledgerNameHints: ["Retention"],
  },
  {
    id: "other_deduction",
    label: "Other Deduction",
    scope: "both",
    resolvesDocumentShortfall: true,
    absorbsBankSurplus: true,
    ledgerNameHints: [],
  },
];

export interface BankReconAdjustmentRow {
  id: string;
  adjustmentTypeId: string;
  ledgerId: number | null;
  ledgerName: string;
  amount: number;
}

export function getAdjustmentType(id: string): BankReconAdjustmentTypeDef | undefined {
  return BANK_RECON_ADJUSTMENT_TYPES.find((t) => t.id === id);
}

export function adjustmentTypesForDirection(
  direction: "receipt" | "payment",
): BankReconAdjustmentTypeDef[] {
  return BANK_RECON_ADJUSTMENT_TYPES.filter(
    (t) => t.scope === "both" || t.scope === direction,
  ).filter((t) => t.id !== "gst");
}

export function resolveDefaultLedgerForAdjustmentType(
  typeId: string,
  records = loadChartOfAccounts(),
): ChartOfAccount | null {
  const def = getAdjustmentType(typeId);
  if (!def) return null;

  const postable = getActivePostingLedgers(records);

  for (const hint of def.ledgerNameHints) {
    const lower = hint.toLowerCase();
    const exact = postable.find((l) => l.accountName.toLowerCase() === lower);
    if (exact) return exact;
    const partial = postable.find((l) => l.accountName.toLowerCase().includes(lower));
    if (partial) return partial;
  }

  for (const sg of def.subGroupHints ?? []) {
    const ledgers = getLedgersUnderSubGroupName(sg, records);
    if (ledgers.length > 0) return ledgers[0];
  }

  return null;
}

export function ledgerFilterForAdjustmentType(typeId: string): (ledger: ChartOfAccount) => boolean {
  const def = getAdjustmentType(typeId);
  if (!def) return () => true;

  const hints = [...def.ledgerNameHints, ...(def.subGroupHints ?? [])].map((h) =>
    h.toLowerCase(),
  );

  if (hints.length === 0) return () => true;

  return (ledger) => {
    const name = ledger.accountName.toLowerCase();
    if (hints.some((h) => name.includes(h) || h.includes(name))) return true;
    const path = ledger.parentAccount?.toLowerCase() ?? "";
    return hints.some((h) => path.includes(h));
  };
}
