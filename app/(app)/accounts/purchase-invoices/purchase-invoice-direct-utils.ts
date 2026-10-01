import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { getActivePostingLedgers, isPostableNode } from "@/lib/accounts/coa-hierarchy";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import type {
  DirectPurchaseLineItem,
  ItcClassification,
  PurchaseNature,
} from "./purchase-invoice-types";

export const PURCHASE_NATURE_LABELS: Record<PurchaseNature, string> = {
  expense: "Expense",
  fixed_asset: "Fixed Asset",
  service: "Service",
  other_non_stock: "Capital Goods",
};

export const ITC_CLASSIFICATION_LABELS: Record<ItcClassification, string> = {
  eligible: "Eligible",
  ineligible: "Ineligible",
  reversal_required: "Reversal Required",
  not_applicable: "Not Applicable",
};

export const UQC_OPTIONS = [
  "NOS",
  "PCS",
  "SET",
  "BOX",
  "BAG",
  "KG",
  "LTR",
  "MTR",
  "SQM",
  "HRS",
  "MON",
  "SERVICE",
  "OTH",
] as const;

export const GST_RATE_OPTIONS = [0, 5, 12, 18, 28] as const;

export const INDIAN_STATE_OPTIONS = [
  "Andhra Pradesh",
  "Delhi",
  "Gujarat",
  "Karnataka",
  "Maharashtra",
  "Rajasthan",
  "Tamil Nadu",
  "Uttar Pradesh",
  "West Bengal",
] as const;

export const TDS_RATE_BY_SECTION: Record<string, number> = {
  "194C": 2,
  "194J": 10,
  "194H": 5,
  "194I": 10,
  "194Q": 0.1,
  "192": 0,
};

export function gstinStateCode(gstin?: string): string | null {
  const normalized = gstin?.trim().toUpperCase();
  if (!normalized || normalized.length < 2) return null;
  return normalized.slice(0, 2);
}

export function stateFromGstin(gstin?: string): string {
  const code = gstinStateCode(gstin);
  const map: Record<string, string> = {
    "27": "Maharashtra",
    "29": "Karnataka",
    "07": "Delhi",
    "33": "Tamil Nadu",
    "24": "Gujarat",
    "09": "Uttar Pradesh",
    "19": "West Bengal",
  };
  return code ? map[code] ?? "Maharashtra" : "Maharashtra";
}

export function isInterstatePurchase(
  branchGstin: string,
  placeOfSupply: string,
  companyState = COMPANY_BILLING.state,
): boolean {
  const branchState = stateFromGstin(branchGstin) || companyState;
  return placeOfSupply.trim().toLowerCase() !== branchState.trim().toLowerCase();
}

function ledgerPathNames(ledger: ChartOfAccount, records: ChartOfAccount[]): string {
  const path = getAncestorPath(records, ledger.id).map((n) => n.accountName);
  return [...path, ledger.accountName].join(" ").toLowerCase();
}

function isInventoryOrFinancialAssetPath(path: string): boolean {
  return (
    path.includes("inventory") ||
    path.includes("stock-in-hand") ||
    path.includes("stock in hand") ||
    path.includes("bank") ||
    path.includes("cash") ||
    path.includes("receivable") ||
    path.includes("debtor") ||
    path.includes("investment") ||
    path.includes("loan") ||
    path.includes("deposit") ||
    path.includes("prepaid")
  );
}

function isUnderFixedAssetsPath(path: string): boolean {
  return path.includes("fixed asset");
}

function isServiceExpensePath(path: string): boolean {
  if (path.includes("service revenue")) return false;
  return (
    path.includes("professional") ||
    path.includes("consult") ||
    path.includes("consultancy") ||
    path.includes("legal fee") ||
    path.includes("audit fee") ||
    path.includes("accounting charge") ||
    path.includes("service") ||
    path.includes("telephone") ||
    path.includes("internet") ||
    path.includes("software") ||
    path.includes("subscription") ||
    path.includes("fees")
  );
}

/** GST capital-goods style assets — plant, machinery, equipment (excludes land & building). */
function isCapitalGoodsAssetPath(path: string): boolean {
  if (!isUnderFixedAssetsPath(path)) return false;
  if (path.includes("land") || path.includes("building")) return false;
  return (
    path.includes("plant") ||
    path.includes("machinery") ||
    path.includes("computer") ||
    path.includes("equipment") ||
    path.includes("vehicle") ||
    path.includes("furniture") ||
    path.includes("intangible") ||
    path.includes("office equipment")
  );
}

export function ledgerMatchesPurchaseNature(
  ledger: ChartOfAccount,
  nature: PurchaseNature,
  allRecords: ChartOfAccount[],
): boolean {
  if (ledger.nodeLevel !== "ledger" || ledger.status !== "active") return false;
  if (!isPostableNode(ledger, allRecords)) return false;
  if (ledger.accountType === "Income") return false;

  const path = ledgerPathNames(ledger, allRecords);

  switch (nature) {
    case "expense":
      return ledger.accountType === "Expense" && !isServiceExpensePath(path);
    case "service":
      return ledger.accountType === "Expense" && isServiceExpensePath(path);
    case "fixed_asset":
      return (
        ledger.accountType === "Asset" &&
        isUnderFixedAssetsPath(path) &&
        !isInventoryOrFinancialAssetPath(path)
      );
    case "other_non_stock":
      return (
        ledger.accountType === "Asset" &&
        isCapitalGoodsAssetPath(path) &&
        !isInventoryOrFinancialAssetPath(path)
      );
    default:
      return false;
  }
}

export function suggestLedgersForNature(
  nature: PurchaseNature,
  records: ChartOfAccount[],
): ChartOfAccount[] {
  return getActivePostingLedgers(records).filter((r) =>
    ledgerMatchesPurchaseNature(r, nature, records),
  );
}

const DIRECT_POSTING_NATURES: PurchaseNature[] = [
  "expense",
  "fixed_asset",
  "service",
  "other_non_stock",
];

/** Posting ledgers allowed on direct purchase (expense, fixed asset, service, other purchase). */
export function ledgerMatchesDirectPurchasePosting(
  ledger: ChartOfAccount,
  allRecords: ChartOfAccount[],
): boolean {
  return DIRECT_POSTING_NATURES.some((n) => ledgerMatchesPurchaseNature(ledger, n, allRecords));
}

export function inferPurchaseNatureFromLedger(
  ledger: ChartOfAccount,
  allRecords: ChartOfAccount[],
): PurchaseNature {
  if (ledgerMatchesPurchaseNature(ledger, "other_non_stock", allRecords)) return "other_non_stock";
  if (ledgerMatchesPurchaseNature(ledger, "fixed_asset", allRecords)) return "fixed_asset";
  if (ledgerMatchesPurchaseNature(ledger, "service", allRecords)) return "service";
  return "expense";
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcTaxableFromGrossDiscount(gross: number, discount: number): number {
  return roundMoney(Math.max(0, gross - discount));
}

export function calcTotalGst(cgst: number, sgst: number, igst: number): number {
  return roundMoney(cgst + sgst + igst);
}

export function validateGstBreakup(input: {
  gstApplicable: boolean;
  interstate: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  allowMixedGst: boolean;
}): string | null {
  if (!input.gstApplicable) return null;
  const hasCgstSgst = input.cgst > 0 || input.sgst > 0;
  const hasIgst = input.igst > 0;
  if (!input.allowMixedGst && hasCgstSgst && hasIgst) {
    return "CGST/SGST and IGST cannot both be entered. Enable mixed-GST correction or adjust amounts.";
  }
  if (!input.allowMixedGst && input.interstate && hasCgstSgst) {
    return "Interstate invoice should normally use IGST only.";
  }
  if (!input.allowMixedGst && !input.interstate && hasIgst) {
    return "Same-state invoice should normally use CGST and SGST only.";
  }
  return null;
}

export function calcDirectPurchaseHeaderTotals(input: {
  grossAmount: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  tdsAmount: number;
  roundingAdjustment: number;
}): DirectPurchaseTotals {
  const totalGst = calcTotalGst(input.cgst, input.sgst, input.igst);
  const invoiceTotal = roundMoney(input.taxableAmount + totalGst);
  const netPayable = roundMoney(invoiceTotal - input.tdsAmount + input.roundingAdjustment);
  return {
    grossAmount: roundMoney(input.grossAmount),
    discountTotal: roundMoney(input.discount),
    taxableAmount: roundMoney(input.taxableAmount),
    cgst: roundMoney(input.cgst),
    sgst: roundMoney(input.sgst),
    igst: roundMoney(input.igst),
    totalGst,
    tdsDeduction: roundMoney(input.tdsAmount),
    invoiceTotal,
    netPayable,
  };
}

export function buildSingleDirectLine(input: {
  lineId?: string;
  description: string;
  purchaseNature: PurchaseNature;
  expenseLedgerId: number;
  expenseLedgerName: string;
  grossAmount: number;
  discount: number;
  taxableAmount: number;
  gstApplicable: boolean;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  defaultItc: ItcClassification;
  tdsApplicable: boolean;
  tdsSection: string;
  tdsRate: number;
  tdsAmount: number;
}): DirectPurchaseLineItem {
  const totalGst = input.gstApplicable ? calcTotalGst(input.cgst, input.sgst, input.igst) : 0;
  return {
    id: input.lineId ?? `dpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: input.description.trim(),
    purchaseNature: input.purchaseNature,
    expenseLedgerId: input.expenseLedgerId,
    expenseLedgerName: input.expenseLedgerName,
    hsnSac: "",
    quantity: 1,
    uqc: "NOS",
    rate: input.grossAmount,
    grossAmount: roundMoney(input.grossAmount),
    discount: roundMoney(input.discount),
    taxableAmount: roundMoney(input.taxableAmount),
    gstRate: input.gstApplicable ? input.gstRate : 0,
    cgst: input.gstApplicable ? roundMoney(input.cgst) : 0,
    sgst: input.gstApplicable ? roundMoney(input.sgst) : 0,
    igst: input.gstApplicable ? roundMoney(input.igst) : 0,
    itcClassification: input.defaultItc,
    tdsApplicable: input.tdsApplicable,
    tdsSection: input.tdsSection,
    tdsRate: input.tdsRate,
    tdsAmount: input.tdsApplicable ? roundMoney(input.tdsAmount) : 0,
    tdsOverride: true,
    tdsOverrideReason: "",
    lineTotal: roundMoney(input.taxableAmount + totalGst),
    remarks: "",
  };
}

export function calcDirectLineAmounts(
  line: Pick<
    DirectPurchaseLineItem,
    "quantity" | "rate" | "discount" | "gstRate" | "tdsApplicable" | "tdsRate" | "tdsAmount" | "tdsOverride"
  >,
  interstate: boolean,
): Pick<
  DirectPurchaseLineItem,
  | "grossAmount"
  | "taxableAmount"
  | "cgst"
  | "sgst"
  | "igst"
  | "tdsAmount"
  | "lineTotal"
> {
  const grossAmount = Math.round(line.quantity * line.rate * 100) / 100;
  const discount = Math.round((line.discount ?? 0) * 100) / 100;
  const taxableAmount = Math.round((grossAmount - discount) * 100) / 100;
  const gstTotal = Math.round(taxableAmount * line.gstRate) / 100;
  const { cgst, sgst, igst } = splitInvoiceGst(gstTotal, interstate);
  let tdsAmount = 0;
  if (line.tdsApplicable) {
    const calculated = Math.round(taxableAmount * (line.tdsRate ?? 0)) / 100;
    tdsAmount = line.tdsOverride ? line.tdsAmount : calculated;
  }
  const lineTotal = Math.round((taxableAmount + gstTotal) * 100) / 100;
  return { grossAmount, taxableAmount, cgst, sgst, igst, tdsAmount, lineTotal };
}

export interface DirectPurchaseTotals {
  grossAmount: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  tdsDeduction: number;
  invoiceTotal: number;
  netPayable: number;
}

export function calcDirectPurchaseTotals(
  lines: DirectPurchaseLineItem[],
  roundingAdjustment = 0,
): DirectPurchaseTotals {
  const grossAmount = lines.reduce((s, l) => s + l.grossAmount, 0);
  const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
  const taxableAmount = lines.reduce((s, l) => s + l.taxableAmount, 0);
  const cgst = lines.reduce((s, l) => s + l.cgst, 0);
  const sgst = lines.reduce((s, l) => s + l.sgst, 0);
  const igst = lines.reduce((s, l) => s + l.igst, 0);
  const totalGst = Math.round((cgst + sgst + igst) * 100) / 100;
  const tdsDeduction = lines.reduce((s, l) => s + (l.tdsApplicable ? l.tdsAmount : 0), 0);
  const invoiceTotal = Math.round((taxableAmount + totalGst) * 100) / 100;
  const netPayable = Math.round((invoiceTotal - tdsDeduction + roundingAdjustment) * 100) / 100;
  return {
    grossAmount: Math.round(grossAmount * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalGst,
    tdsDeduction: Math.round(tdsDeduction * 100) / 100,
    invoiceTotal,
    netPayable,
  };
}

/** Invoice totals from line GST; TDS applied at header when invoiceTdsApplicable. */
export function computeDirectPurchaseInvoiceTotals(
  lines: DirectPurchaseLineItem[],
  options: {
    roundingAdjustment?: number;
    invoiceTdsApplicable?: boolean;
    invoiceTdsAmount?: number;
  } = {},
): DirectPurchaseTotals {
  const lineTotals = calcDirectPurchaseTotals(
    lines.map((l) => ({ ...l, tdsApplicable: false, tdsAmount: 0 })),
    0,
  );
  const tdsDeduction = options.invoiceTdsApplicable
    ? roundMoney(options.invoiceTdsAmount ?? 0)
    : 0;
  const netPayable = roundMoney(
    lineTotals.invoiceTotal - tdsDeduction + (options.roundingAdjustment ?? 0),
  );
  return { ...lineTotals, tdsDeduction, netPayable };
}

export function emptyDirectLine(defaultItc: ItcClassification = "eligible"): DirectPurchaseLineItem {
  return {
    id: `dpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: "",
    purchaseNature: "expense",
    expenseLedgerId: null,
    expenseLedgerName: "",
    hsnSac: "",
    quantity: 1,
    uqc: "NOS",
    rate: 0,
    grossAmount: 0,
    discount: 0,
    taxableAmount: 0,
    gstRate: 18,
    cgst: 0,
    sgst: 0,
    igst: 0,
    itcClassification: defaultItc,
    tdsApplicable: false,
    tdsSection: "",
    tdsRate: 0,
    tdsAmount: 0,
    tdsOverride: false,
    tdsOverrideReason: "",
    lineTotal: 0,
    remarks: "",
  };
}

export function recalcDirectLine(
  line: DirectPurchaseLineItem,
  interstate: boolean,
): DirectPurchaseLineItem {
  const amounts = calcDirectLineAmounts(line, interstate);
  return { ...line, ...amounts };
}

export type DuplicateCheckInput = {
  vendorId: number;
  vendorGst: string;
  vendorInvoiceNo: string;
  excludeId?: number;
};

export type DuplicateInvoiceRecord = {
  id: number;
  invoiceNo: string;
  vendorId: number;
  vendorGst: string;
  vendorInvoiceNo: string;
  invoiceDate: string;
  workflow?: { status?: string };
};

export function findDuplicateSupplierInvoice(
  records: DuplicateInvoiceRecord[],
  input: DuplicateCheckInput,
): DuplicateInvoiceRecord | undefined {
  const gstin = input.vendorGst.trim().toUpperCase();
  const invNo = input.vendorInvoiceNo.trim().toUpperCase();
  if (!invNo) return undefined;
  return records.find((r) => {
    if (input.excludeId != null && r.id === input.excludeId) return false;
    const wfStatus = r.workflow?.status;
    if (wfStatus === "cancelled" || wfStatus === "rejected") return false;
    if (r.vendorId !== input.vendorId) return false;
    if ((r.vendorGst ?? "").trim().toUpperCase() !== gstin) return false;
    return (r.vendorInvoiceNo ?? "").trim().toUpperCase() === invNo;
  });
}

export function validateDuplicateSupplierInvoice(
  records: DuplicateInvoiceRecord[],
  input: DuplicateCheckInput,
): string | null {
  const dup = findDuplicateSupplierInvoice(records, input);
  if (!dup) return null;
  return `Duplicate supplier invoice already exists. (${dup.invoiceNo} · ${dup.invoiceDate})`;
}
