export type PurchaseSourceType = "from_grn" | "direct_purchase";
export type PurchaseNature = "expense" | "fixed_asset" | "service" | "other_non_stock";
export type ItcClassification = "eligible" | "ineligible" | "reversal_required" | "not_applicable";

export interface DirectPurchaseLineItem {
  id: string;
  description: string;
  purchaseNature: PurchaseNature;
  expenseLedgerId: number | null;
  expenseLedgerName: string;
  hsnSac: string;
  quantity: number;
  uqc: string;
  rate: number;
  grossAmount: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  itcClassification: ItcClassification;
  tdsApplicable: boolean;
  tdsSection: string;
  tdsRate: number;
  tdsAmount: number;
  tdsOverride: boolean;
  tdsOverrideReason: string;
  lineTotal: number;
  remarks: string;
}

/** Header-level direct purchase fields stored on the invoice record. */
export interface DirectPurchaseHeaderFields {
  gstApplicable?: boolean;
  rcmCgst?: number;
  rcmSgst?: number;
  rcmIgst?: number;
  tdsSectionMasterId?: number | null;
  tdsBaseAmount?: number;
  tdsLedgerId?: number | null;
  tdsLedgerName?: string;
  allowMixedGst?: boolean;
}

export const PURCHASE_SOURCE_TYPE_LABELS: Record<PurchaseSourceType, string> = {
  from_grn: "From GRN",
  direct_purchase: "Direct Purchase",
};
