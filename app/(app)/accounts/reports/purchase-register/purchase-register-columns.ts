import type { AccountsColumnFilterType } from "@/lib/accounts/column-filter-types";
import type { PurchaseRegisterRow } from "./purchase-register-types";

export type PurchaseRegisterColKey = keyof PurchaseRegisterRow | "reverseChargeYesNo";

export interface PurchaseRegisterColumnDef {
  key: PurchaseRegisterColKey;
  label: string;
  /** Shown by default */
  defaultVisible: boolean;
  /** Sticky freeze (left offset stack) */
  freeze?: boolean;
  align?: "left" | "right";
  filterType?: AccountsColumnFilterType;
  /** Money column included in grand total when visible */
  totalKey?: keyof import("./purchase-register-types").PurchaseRegisterTotals;
  group?: "core" | "link" | "tax" | "rcm" | "itc" | "recon";
}

/** All report columns — defaultVisible matches recommended defaults. */
export const PURCHASE_REGISTER_COLUMNS: PurchaseRegisterColumnDef[] = [
  { key: "purchaseDate", label: "Purchase Date", defaultVisible: true, freeze: true, filterType: "date", group: "core" },
  { key: "postingDate", label: "Posting Date", defaultVisible: false, filterType: "date", group: "core" },
  { key: "voucherNumber", label: "Voucher Number", defaultVisible: true, freeze: true, group: "core" },
  { key: "documentType", label: "Document Type", defaultVisible: false, group: "core" },
  { key: "supplierInvoiceNo", label: "Supplier Invoice No.", defaultVisible: true, group: "core" },
  { key: "supplierInvoiceDate", label: "Supplier Invoice Date", defaultVisible: false, filterType: "date", group: "core" },
  { key: "supplierName", label: "Supplier Name", defaultVisible: true, freeze: true, group: "core" },
  { key: "supplierGstin", label: "Supplier GSTIN", defaultVisible: true, group: "core" },
  { key: "supplierState", label: "Supplier State", defaultVisible: false, group: "core" },
  { key: "placeOfSupply", label: "Place of Supply", defaultVisible: false, group: "core" },
  { key: "purchaseType", label: "Purchase Type", defaultVisible: true, group: "core" },
  { key: "poNumber", label: "PO Number", defaultVisible: false, group: "link" },
  { key: "grnNumber", label: "GRN Number", defaultVisible: false, group: "link" },
  { key: "warehouse", label: "Warehouse", defaultVisible: false, group: "link" },
  { key: "hsnSac", label: "HSN / SAC", defaultVisible: false, group: "link" },
  { key: "taxableValue", label: "Taxable Value", defaultVisible: true, align: "right", filterType: "amount", totalKey: "taxableValue", group: "tax" },
  { key: "exemptValue", label: "Exempt Value", defaultVisible: false, align: "right", filterType: "amount", totalKey: "exemptValue", group: "tax" },
  { key: "nilRatedValue", label: "Nil-Rated Value", defaultVisible: false, align: "right", filterType: "amount", totalKey: "nilRatedValue", group: "tax" },
  { key: "nonGstValue", label: "Non-GST Value", defaultVisible: false, align: "right", filterType: "amount", totalKey: "nonGstValue", group: "tax" },
  { key: "cgst", label: "CGST", defaultVisible: true, align: "right", filterType: "amount", totalKey: "cgst", group: "tax" },
  { key: "sgst", label: "SGST / UTGST", defaultVisible: true, align: "right", filterType: "amount", totalKey: "sgst", group: "tax" },
  { key: "igst", label: "IGST", defaultVisible: true, align: "right", filterType: "amount", totalKey: "igst", group: "tax" },
  { key: "cess", label: "Cess", defaultVisible: true, align: "right", filterType: "amount", totalKey: "cess", group: "tax" },
  { key: "otherCharges", label: "Other Charges", defaultVisible: false, align: "right", filterType: "amount", group: "tax" },
  { key: "tdsAmount", label: "TDS Amount", defaultVisible: false, align: "right", filterType: "amount", totalKey: "tdsAmount", group: "tax" },
  { key: "tcsAmount", label: "TCS Amount", defaultVisible: false, align: "right", filterType: "amount", totalKey: "tcsAmount", group: "tax" },
  { key: "roundOff", label: "Round-Off", defaultVisible: false, align: "right", filterType: "amount", group: "tax" },
  { key: "totalInvoiceValue", label: "Total Invoice Value", defaultVisible: true, align: "right", filterType: "amount", totalKey: "totalInvoiceValue", group: "tax" },
  { key: "reverseChargeYesNo", label: "Reverse Charge", defaultVisible: true, group: "rcm" },
  { key: "rcmTaxableValue", label: "RCM Taxable Value", defaultVisible: false, align: "right", filterType: "amount", totalKey: "rcmTaxableValue", group: "rcm" },
  { key: "rcmCgst", label: "RCM CGST", defaultVisible: false, align: "right", filterType: "amount", totalKey: "rcmCgst", group: "rcm" },
  { key: "rcmSgst", label: "RCM SGST / UTGST", defaultVisible: false, align: "right", filterType: "amount", totalKey: "rcmSgst", group: "rcm" },
  { key: "rcmIgst", label: "RCM IGST", defaultVisible: false, align: "right", filterType: "amount", totalKey: "rcmIgst", group: "rcm" },
  { key: "rcmCess", label: "RCM Cess", defaultVisible: false, align: "right", filterType: "amount", totalKey: "rcmCess", group: "rcm" },
  { key: "rcmLiabilityStatus", label: "RCM Liability Status", defaultVisible: false, group: "rcm" },
  { key: "itcEligibility", label: "ITC Eligibility", defaultVisible: true, group: "itc" },
  { key: "eligibleItcCgst", label: "Eligible ITC CGST", defaultVisible: false, align: "right", filterType: "amount", group: "itc" },
  { key: "eligibleItcSgst", label: "Eligible ITC SGST / UTGST", defaultVisible: false, align: "right", filterType: "amount", group: "itc" },
  { key: "eligibleItcIgst", label: "Eligible ITC IGST", defaultVisible: false, align: "right", filterType: "amount", group: "itc" },
  { key: "eligibleItcCess", label: "Eligible ITC Cess", defaultVisible: false, align: "right", filterType: "amount", group: "itc" },
  { key: "ineligibleBlockedItc", label: "Ineligible / Blocked ITC", defaultVisible: false, align: "right", filterType: "amount", totalKey: "ineligibleBlockedItc", group: "itc" },
  { key: "itcReversalAmount", label: "ITC Reversal Amount", defaultVisible: false, align: "right", filterType: "amount", totalKey: "itcReversalAmount", group: "itc" },
  { key: "netItcAvailable", label: "Net ITC Available", defaultVisible: false, align: "right", filterType: "amount", totalKey: "netItcAvailable", group: "itc" },
  { key: "gstr2bStatus", label: "GSTR-2B Status", defaultVisible: true, group: "recon" },
  { key: "voucherStatus", label: "Voucher Status", defaultVisible: true, group: "recon" },
];

export const DEFAULT_VISIBLE_COLUMNS: PurchaseRegisterColKey[] = PURCHASE_REGISTER_COLUMNS.filter(
  (c) => c.defaultVisible,
).map((c) => c.key);

export function getVisibleColumnDefs(visible: PurchaseRegisterColKey[]): PurchaseRegisterColumnDef[] {
  const set = new Set(visible);
  return PURCHASE_REGISTER_COLUMNS.filter((c) => set.has(c.key));
}

export function estimateTableMinWidth(visible: PurchaseRegisterColKey[]): number {
  const n = Math.max(visible.length, 8);
  return Math.max(960, n * 118);
}

export function getCellValue(
  row: PurchaseRegisterRow,
  key: PurchaseRegisterColKey,
): string | number | boolean | null | undefined {
  if (key === "reverseChargeYesNo") return row.reverseChargeApplicable ? "Yes" : "No";
  const v = row[key as keyof PurchaseRegisterRow];
  return v as string | number | boolean | null | undefined;
}

export function formatCellDisplay(
  row: PurchaseRegisterRow,
  key: PurchaseRegisterColKey,
  labels: {
    purchaseType: Record<string, string>;
    documentType: Record<string, string>;
    itc: Record<string, string>;
    gstr2b: Record<string, string>;
    rcmLiability: Record<string, string>;
    voucherStatus: Record<string, string>;
  },
): string | number {
  if (key === "reverseChargeYesNo") return row.reverseChargeApplicable ? "Yes" : "No";
  if (key === "purchaseType") return labels.purchaseType[row.purchaseType] ?? row.purchaseType;
  if (key === "documentType") return labels.documentType[row.documentType] ?? row.documentType;
  if (key === "itcEligibility") return labels.itc[row.itcEligibility] ?? row.itcEligibility;
  if (key === "gstr2bStatus") return labels.gstr2b[row.gstr2bStatus] ?? row.gstr2bStatus;
  if (key === "rcmLiabilityStatus") {
    return labels.rcmLiability[row.rcmLiabilityStatus] ?? row.rcmLiabilityStatus;
  }
  if (key === "voucherStatus") {
    return labels.voucherStatus[row.voucherStatus] ?? row.voucherStatus;
  }
  const v = row[key as keyof PurchaseRegisterRow];
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v == null || v === "") return "—";
  return v as string | number;
}
