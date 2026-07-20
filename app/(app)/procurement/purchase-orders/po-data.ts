import { PROCUREMENT_APPROVAL, CURRENT_USER, COMPANY_BILLING } from "@/lib/procurement/config";
import { amountInWords, calcLineAmounts, nextId, round2, todayStr, applyTaxSupplyToRates, type TaxSupplyType } from "@/lib/procurement/utils";
import type { ActivityEntry } from "@/lib/procurement/types";
import type { POShortCloseInfo } from "./po-qty";
import type { PackagingUom, ProcurementAdditionalCharge } from "@/lib/procurement/procurement-line-utils";
import { calcPackingToBaseQty, sumAdditionalCharges, sumAdditionalChargeTaxes, enrichProductForProcurement } from "@/lib/procurement/procurement-line-utils";
import { findProductRef } from "@/lib/pricing/resolve-pricing";
import type { PODiscountType } from "@/lib/procurement/utils";
import type { PriceSource } from "@/lib/pricing/resolve-pricing";

export type { POShortCloseInfo } from "./po-qty";
export { canShortClosePO, getPOQtySummary, shortClosePO } from "./po-qty";

export type POStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "partially_received"
  | "received"
  | "invoice_uploaded"
  | "short_closed"
  | "closed"
  | "cancelled";

/** Legacy statuses migrated on load */
type LegacyPOStatus =
  | "sent_to_supplier"
  | "partially_received"
  | "fully_received"
  | "partially_fulfilled"
  | "fully_fulfilled";

export function normalizePOStatus(status: string): POStatus {
  const map: Record<LegacyPOStatus, POStatus> = {
    sent_to_supplier: "approved",
    partially_received: "approved",
    fully_received: "approved",
    partially_fulfilled: "approved",
    fully_fulfilled: "approved",
  };
  return (map[status as LegacyPOStatus] ?? status) as POStatus;
}

function normalizePO(po: PurchaseOrder): PurchaseOrder {
  return migratePO(po);
}

export interface POLineItem {
  uid: string;
  /** Backend purchase_order_product_id (UUID) — required for short-close API. */
  purchaseOrderProductId?: string;
  /** Local master id (number) or backend product UUID (string). */
  productId: number | string;
  productCode: string;
  productName: string;
  description: string;
  sku: string;
  category: string;
  hsnCode: string;
  baseUnit: string;
  packagingUnit: string;
  conversionQty: number;
  orderUom: PackagingUom;
  orderedQtyPack: number;
  uom: string;
  orderedQty: number;
  unitPrice: number;
  discountType: PODiscountType;
  discountPct: number;
  discountFlatAmount: number;
  discountAmount: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  deliverySchedule: string;
  remarks: string;
  prLineUid?: string;
  /** Fallback when GRN not linked by PO number */
  receivedQty?: number;
  shortClosedQty?: number;
  cpSource?: PriceSource | "manual";
}

export interface POAttachment {
  uid: string;
  name: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
}

export interface POTerm {
  uid: string;
  termId?: number;
  title: string;
  content: string;
  isCustom: boolean;
}

export interface POSummary {
  grossAmount: number;
  totalDiscount: number;
  productTotal: number;
  additionalChargesTotal: number;
  taxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  /** @deprecated use additionalChargesTotal */
  otherCharges: number;
  grandTotal: number;
  amountInWords: string;
}

export interface PurchaseOrder {
  /** Backend purchase_order_id (UUID) or legacy localStorage numeric id as string. */
  id: string;
  poNumber: string;
  poDate: string;
  /** Local master id (number) or backend supplier UUID (string). */
  supplierId: number | string;
  supplierName: string;
  supplierCode?: string;
  supplierType: string;
  supplierContactPerson?: string;
  supplierMobile?: string;
  supplierMobileCountry?: string;
  supplierEmail?: string;
  supplierGstin?: string;
  referenceNumber: string;
  currency: string;
  /** Backend `payment_type`: Immediate | Credit | Advance */
  paymentType: string;
  creditDays: number;
  deliveryTerms: string;
  expectedDeliveryDate: string;
  state: string;
  warehouseId: number | string | null;
  warehouseName: string;
  deliveryAddress: string;
  notes: string;
  sourcePrId: number | string | null;
  sourcePrNumber: string;
  billToAddressId?: string;
  shipToAddressId?: string;
  billing: typeof COMPANY_BILLING;
  shipping: {
    shipToLocation: string;
    branch: string;
    address: string;
    contactPerson: string;
    contactNumber: string;
    sameAsBilling: boolean;
  };
  lines: POLineItem[];
  terms: POTerm[];
  attachments: POAttachment[];
  additionalCharges: ProcurementAdditionalCharge[];
  /** @deprecated migrated to additionalCharges */
  otherCharges: number;
  summary: POSummary;
  status: POStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  approvedBy: string;
  approvedDate: string;
  activity: ActivityEntry[];
  shortClose?: POShortCloseInfo;
}

const STORAGE_KEY = "ds_procurement_purchase_orders_v2";
const LEGACY_STORAGE_KEY = "ds_procurement_purchase_orders";
let purchaseOrderLocalStorageCleared = false;

function clearPurchaseOrderLocalStorage(): void {
  if (typeof window === "undefined" || purchaseOrderLocalStorageCleared) return;
  purchaseOrderLocalStorageCleared = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore quota / private-mode errors
  }
}

function parseGstRate(gstRate?: string): number {
  const n = parseFloat(String(gstRate ?? "").replace(/%/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function gstSplitFromProduct(productId: number): { cgstPct: number; sgstPct: number; igstPct: number } {
  const gst = parseGstRate(findProductRef(productId)?.gstRate);
  if (gst <= 0) return { cgstPct: 0, sgstPct: 0, igstPct: 0 };
  return { cgstPct: gst / 2, sgstPct: gst / 2, igstPct: 0 };
}

export function getLineTotalGstPct(line: POLineItem): number {
  const fromRates = (line.cgstPct ?? 0) + (line.sgstPct ?? 0) + (line.igstPct ?? 0);
  if (fromRates > 0.001) return fromRates;
  const localId = asLocalProductId(line.productId);
  if (!localId) return 0;
  return parseGstRate(findProductRef(localId)?.gstRate);
}

export function applyTaxSupplyToPOLines(
  lines: POLineItem[],
  taxSupplyType: TaxSupplyType,
): POLineItem[] {
  return lines.map((line) => {
    const totalGst = getLineTotalGstPct(line);
    if (totalGst <= 0) return line;
    return { ...line, ...applyTaxSupplyToRates(totalGst, taxSupplyType) };
  });
}

function asLocalProductId(productId: unknown): number | null {
  if (typeof productId === "number" && Number.isFinite(productId) && productId > 0) {
    return productId;
  }
  if (typeof productId === "string" && /^\d+$/.test(productId)) {
    const n = Number(productId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function migratePOLine(line: Partial<POLineItem>): POLineItem {
  const localProductId = asLocalProductId(line.productId);
  const enriched = localProductId ? enrichProductForProcurement(localProductId) : null;
  const orderUom = (line.orderUom ?? (line.uom as PackagingUom) ?? "Unit") as PackagingUom;
  const orderedQtyPack = line.orderedQtyPack ?? line.orderedQty ?? 1;
  const conversionQty = enriched?.conversionQty ?? line.conversionQty ?? 1;
  const orderedQty = calcPackingToBaseQty(orderedQtyPack, conversionQty);
  const productGst = localProductId ? gstSplitFromProduct(localProductId) : null;
  const discountType = (line.discountType ?? "percentage") as PODiscountType;
  const discountPct = line.discountPct ?? 0;
  const discountFlatAmount = line.discountFlatAmount ?? 0;
  const cgstPct = line.cgstPct ?? productGst?.cgstPct ?? 9;
  const sgstPct = line.sgstPct ?? productGst?.sgstPct ?? 9;
  const igstPct = line.igstPct ?? productGst?.igstPct ?? 0;
  const calc = calcLineAmounts({
    orderedQty,
    unitPrice: line.unitPrice ?? 0,
    discountType,
    discountPct,
    discountFlatAmount,
    cgstPct,
    sgstPct,
    igstPct,
  });
  return {
    uid: line.uid ?? `pl-${Date.now()}`,
    purchaseOrderProductId: line.purchaseOrderProductId,
    productId: line.productId ?? 0,
    productCode: line.productCode ?? enriched?.productCode ?? "",
    productName: line.productName ?? enriched?.productName ?? "",
    description: line.description ?? "",
    sku: line.sku ?? enriched?.sku ?? "",
    baseUnit: line.baseUnit ?? enriched?.baseUnit ?? "Unit",
    packagingUnit: line.packagingUnit ?? enriched?.packagingUnit ?? "Box",
    conversionQty,
    orderUom,
    orderedQtyPack,
    uom: line.uom ?? orderUom,
    orderedQty,
    unitPrice: line.unitPrice ?? enriched?.ratePerSku ?? 0,
    discountType,
    discountPct,
    discountFlatAmount,
    discountAmount: calc.discountAmount,
    cgstPct,
    sgstPct,
    igstPct,
    grossAmount: calc.grossAmount,
    taxAmount: calc.taxAmount,
    netAmount: calc.netAmount,
    deliverySchedule: line.deliverySchedule ?? "",
    remarks: line.remarks ?? "",
    prLineUid: line.prLineUid,
    receivedQty: line.receivedQty,
    shortClosedQty: line.shortClosedQty,
    cpSource: line.cpSource,
    category: line.category ?? enriched?.category ?? "",
    hsnCode: line.hsnCode ?? enriched?.hsnCode ?? "",
  };
}

/** Enrich a line with current product master data and recalculated amounts. */
export function enrichPOLineItem(line: POLineItem): POLineItem {
  return migratePOLine(line);
}

function migratePO(po: PurchaseOrder): PurchaseOrder {
  const additionalCharges =
    po.additionalCharges ??
    (po.otherCharges
      ? [{ uid: "legacy-freight", chargeName: "Other Charges", amount: po.otherCharges, remarks: "" }]
      : []);
  const legacy = po as PurchaseOrder & { paymentTerms?: string };
  const paymentType =
    po.paymentType ||
    (legacy.paymentTerms
      ? legacy.paymentTerms.toLowerCase().includes("advance")
        ? "Advance"
        : legacy.paymentTerms.toLowerCase().includes("immediate")
          ? "Immediate"
          : "Credit"
      : "Credit");

  const normalized: PurchaseOrder = {
    ...po,
    id: String(po.id),
    status: normalizePOStatus(po.status),
    paymentType,
    creditDays: po.creditDays ?? 0,
    state: po.state ?? "",
    warehouseId: po.warehouseId ?? null,
    warehouseName: po.warehouseName ?? po.shipping?.shipToLocation ?? "",
    deliveryAddress: po.deliveryAddress ?? po.shipping?.address ?? "",
    additionalCharges,
    lines: (po.lines ?? []).map((l) => migratePOLine(l)),
  };
  return recalcPO(normalized);
}

function buildSummary(
  lines: POLineItem[],
  additionalCharges: ProcurementAdditionalCharge[],
): POSummary {
  let grossAmount = 0;
  let totalDiscount = 0;
  let taxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  lines.forEach((l) => {
    const c = calcLineAmounts({
      orderedQty: l.orderedQty,
      unitPrice: l.unitPrice,
      discountType: l.discountType,
      discountPct: l.discountPct,
      discountFlatAmount: l.discountFlatAmount,
      cgstPct: l.cgstPct,
      sgstPct: l.sgstPct,
      igstPct: l.igstPct,
    });
    grossAmount += c.grossAmount;
    totalDiscount += c.discountAmount;
    taxableValue += c.taxableValue;
    totalCgst += c.cgstAmount;
    totalSgst += c.sgstAmount;
    totalIgst += c.igstAmount;
  });

  grossAmount = round2(grossAmount);
  totalDiscount = round2(totalDiscount);
  const productTotal = round2(taxableValue);
  const additionalChargesTotal = round2(sumAdditionalCharges(additionalCharges));
  const chargeTaxes = sumAdditionalChargeTaxes(additionalCharges);
  taxableValue = round2(productTotal + additionalChargesTotal);
  totalCgst = round2(totalCgst + chargeTaxes.totalCgst);
  totalSgst = round2(totalSgst + chargeTaxes.totalSgst);
  totalIgst = round2(totalIgst + chargeTaxes.totalIgst);
  const grandTotal = round2(taxableValue + totalCgst + totalSgst + totalIgst);

  return {
    grossAmount,
    totalDiscount,
    productTotal,
    additionalChargesTotal,
    taxableValue,
    totalCgst,
    totalSgst,
    totalIgst,
    otherCharges: additionalChargesTotal,
    grandTotal,
    amountInWords: amountInWords(grandTotal),
  };
}

export function recalcPOLines(lines: POLineItem[]): POLineItem[] {
  return lines.map((l) => {
    const c = calcLineAmounts({
      orderedQty: l.orderedQty,
      unitPrice: l.unitPrice,
      discountType: l.discountType,
      discountPct: l.discountPct,
      discountFlatAmount: l.discountFlatAmount,
      cgstPct: l.cgstPct,
      sgstPct: l.sgstPct,
      igstPct: l.igstPct,
    });
    return {
      ...l,
      discountAmount: c.discountAmount,
      grossAmount: c.grossAmount,
      taxAmount: c.taxAmount,
      netAmount: c.netAmount,
    };
  });
}

export function recalcPO(po: PurchaseOrder): PurchaseOrder {
  const lines = recalcPOLines(po.lines);
  const summary = buildSummary(lines, po.additionalCharges ?? []);
  return { ...po, lines, summary, otherCharges: summary.additionalChargesTotal };
}

/** Local mock storage removed — purchase orders are API-backed. */
export function loadPurchaseOrders(): PurchaseOrder[] {
  clearPurchaseOrderLocalStorage();
  return [];
}

export function savePurchaseOrders(_list: PurchaseOrder[]): void {
  clearPurchaseOrderLocalStorage();
}

export function getPOById(_id: string | number): PurchaseOrder | undefined {
  return undefined;
}

export function generatePONumber(list: PurchaseOrder[]): string {
  const year = new Date().getFullYear();
  return `PO-${year}-${String(list.length + 1).padStart(4, "0")}`;
}

export function submitPO(po: PurchaseOrder): PurchaseOrder {
  const today = todayStr();
  const status: POStatus = PROCUREMENT_APPROVAL.poEnabled ? "pending_approval" : "approved";
  return recalcPO({
    ...po,
    status,
    updatedBy: CURRENT_USER,
    updatedDate: today,
    approvedBy: status === "approved" ? "System" : "",
    approvedDate: status === "approved" ? today : "",
    activity: [
      ...po.activity,
      { date: today, action: "Submitted", by: CURRENT_USER },
      ...(status === "approved" ? [{ date: today, action: "Approved", by: "System (auto)" }] : []),
    ],
  });
}

export function approvePO(po: PurchaseOrder): PurchaseOrder {
  const today = todayStr();
  return {
    ...po,
    status: "approved",
    approvedBy: CURRENT_USER,
    approvedDate: today,
    updatedBy: CURRENT_USER,
    updatedDate: today,
    activity: [...po.activity, { date: today, action: "Approved", by: CURRENT_USER }],
  };
}

export function rejectPO(po: PurchaseOrder, reason?: string): PurchaseOrder {
  const today = todayStr();
  return {
    ...po,
    status: "rejected",
    updatedBy: CURRENT_USER,
    updatedDate: today,
    activity: [...po.activity, { date: today, action: "Rejected", by: CURRENT_USER, note: reason }],
  };
}

export function closePO(po: PurchaseOrder, remarks?: string): PurchaseOrder {
  const today = todayStr();
  return {
    ...po,
    status: "closed",
    updatedBy: CURRENT_USER,
    updatedDate: today,
    activity: [...po.activity, { date: today, action: "Closed", by: CURRENT_USER, note: remarks }],
  };
}

export function cancelPO(po: PurchaseOrder, reason?: string): PurchaseOrder {
  const today = todayStr();
  return {
    ...po,
    status: "cancelled",
    updatedBy: CURRENT_USER,
    updatedDate: today,
    activity: [...po.activity, { date: today, action: "Cancelled", by: CURRENT_USER, note: reason }],
  };
}

export const PO_LIST_TABS: POStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "invoice_uploaded",
  "short_closed",
  "closed",
  "cancelled",
];

export const PO_STATUS_CFG: Record<POStatus, { bg: string; text: string; dot: string; label: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Draft" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", label: "Pending Approval" },
  approved: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", label: "Rejected" },
  partially_received: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500", label: "Partially Received" },
  received: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Received" },
  invoice_uploaded: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Invoice Uploaded" },
  short_closed: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", label: "Short Closed" },
  closed: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-500", label: "Closed" },
  cancelled: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400", label: "Cancelled" },
};

export { buildSummary, COMPANY_BILLING };
