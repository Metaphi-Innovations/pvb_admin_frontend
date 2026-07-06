import { PROCUREMENT_APPROVAL, CURRENT_USER, COMPANY_BILLING } from "@/lib/procurement/config";
import { amountInWords, calcLineAmounts, nextId, round2, todayStr } from "@/lib/procurement/utils";
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

function parseGstRate(gstRate?: string): number {
  const n = parseFloat(String(gstRate ?? "").replace(/%/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function gstSplitFromProduct(productId: number): { cgstPct: number; sgstPct: number; igstPct: number } {
  const gst = parseGstRate(findProductRef(productId)?.gstRate);
  if (gst <= 0) return { cgstPct: 0, sgstPct: 0, igstPct: 0 };
  return { cgstPct: gst / 2, sgstPct: gst / 2, igstPct: 0 };
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

const RAW_SEED = [
  {
    id: 1,
    poNumber: "PO-2024-0001",
    poDate: "2024-01-25",
    supplierId: 1,
    supplierName: "Agro Chem Distributors",
    supplierType: "distributor",
    supplierContactPerson: "Ramesh Patil",
    supplierMobile: "9876501234",
    supplierEmail: "ramesh@agrochem.in",
    supplierGstin: "27AABCA1234F1Z2",
    referenceNumber: "REF/AC/25",
    currency: "INR",
    paymentType: "Credit",
    creditDays: 30,
    deliveryTerms: "door-delivery",
    expectedDeliveryDate: "2024-02-10",
    notes: "Against PR-2024-0003",
    sourcePrId: 3,
    sourcePrNumber: "PR-2024-0003",
    billing: COMPANY_BILLING,
    shipping: {
      shipToLocation: "Pune Warehouse",
      branch: "hq-pune",
      address: "Warehouse 2, Hinjawadi, Pune",
      contactPerson: "Warehouse Manager",
      contactNumber: "9876500000",
      sameAsBilling: false,
    },
    lines: [
      {
        uid: "pl1",
        productId: 4,
        productCode: "PRD-004",
        productName: "Chlorpyrifos 20 EC",
        description: "Insecticide",
        uom: "LTR",
        orderedQty: 100,
        receivedQty: 60,
        unitPrice: 310,
        discountPct: 2,
        cgstPct: 9,
        sgstPct: 9,
        igstPct: 0,
        grossAmount: 31000,
        taxAmount: 5464.8,
        netAmount: 35824.8,
        deliverySchedule: "2024-02-05",
        prLineUid: "l1",
      },
    ] as POLineItem[],
    terms: [],
    attachments: [],
    additionalCharges: [{ uid: "c1", chargeName: "Freight Charges", amount: 500, remarks: "", gstMasterId: 4, cgstPct: 9, sgstPct: 9, igstPct: 0 }],
    otherCharges: 500,
    summary: buildSummary(
      [
        {
          uid: "pl1",
          productId: 4,
          productCode: "PRD-004",
          productName: "Chlorpyrifos 20 EC",
          description: "",
          uom: "LTR",
          orderedQty: 100,
          unitPrice: 310,
          discountPct: 2,
          cgstPct: 9,
          sgstPct: 9,
          igstPct: 0,
          grossAmount: 31000,
          taxAmount: 5464.8,
          netAmount: 35824.8,
          deliverySchedule: "",
        },
      ] as POLineItem[],
      [{ uid: "c1", chargeName: "Freight Charges", amount: 500, remarks: "" }],
    ),
    status: "approved",
    createdBy: "Admin",
    createdDate: "2024-01-25",
    updatedBy: "Admin",
    updatedDate: "2024-01-28",
    approvedBy: "Admin",
    approvedDate: "2024-01-26",
    activity: [
      { date: "2024-01-25", action: "Created", by: "Admin" },
      { date: "2024-01-26", action: "Approved", by: "Admin" },
      { date: "2024-01-28", action: "Sent to Supplier", by: "Admin" },
    ],
  },
  {
    id: 2,
    poNumber: "PO-2024-0002",
    poDate: "2024-02-12",
    supplierId: 2,
    supplierName: "Seed Corp India Pvt Ltd",
    supplierType: "manufacturer",
    supplierContactPerson: "Priya Nair",
    supplierMobile: "9988776655",
    supplierEmail: "priya@seedcorp.in",
    supplierGstin: "29AABCS5678G1Z9",
    referenceNumber: "",
    currency: "INR",
    paymentType: "Credit",
    creditDays: 15,
    deliveryTerms: "ex-works",
    expectedDeliveryDate: "2024-03-01",
    notes: "Direct PO — hybrid seeds",
    sourcePrId: null,
    sourcePrNumber: "",
    billing: COMPANY_BILLING,
    shipping: {
      shipToLocation: "HQ",
      branch: "hq-pune",
      address: COMPANY_BILLING.billingAddress,
      contactPerson: "Admin",
      contactNumber: "9876500001",
      sameAsBilling: true,
    },
    lines: [
      {
        uid: "pl1",
        productId: 6,
        productCode: "PRD-006",
        productName: "Hybrid Tomato Seeds",
        description: "",
        uom: "PKT",
        orderedQty: 500,
        unitPrice: 90,
        discountPct: 0,
        cgstPct: 0,
        sgstPct: 0,
        igstPct: 0,
        grossAmount: 45000,
        taxAmount: 0,
        netAmount: 45000,
        deliverySchedule: "",
      },
    ] as POLineItem[],
    terms: [],
    attachments: [],
    additionalCharges: [],
    otherCharges: 0,
    summary: buildSummary(
      [
        {
          uid: "pl1",
          productId: 6,
          productCode: "PRD-006",
          productName: "Hybrid Tomato Seeds",
          description: "",
          uom: "PKT",
          orderedQty: 500,
          unitPrice: 90,
          discountPct: 0,
          cgstPct: 0,
          sgstPct: 0,
          igstPct: 0,
          grossAmount: 45000,
          taxAmount: 0,
          netAmount: 45000,
          deliverySchedule: "",
        },
      ] as POLineItem[],
      [],
    ),
    status: "pending_approval",
    createdBy: "Admin",
    createdDate: "2024-02-12",
    updatedBy: "Admin",
    updatedDate: "2024-02-12",
    approvedBy: "",
    approvedDate: "",
    activity: [
      { date: "2024-02-12", action: "Created", by: "Admin" },
      { date: "2024-02-12", action: "Submitted", by: "Admin" },
    ],
  },
];

const SEED = (RAW_SEED as unknown as PurchaseOrder[]).map(migratePO);

export function loadPurchaseOrders(): PurchaseOrder[] {
  if (typeof window === "undefined") return SEED.map(normalizePO);
  try {
    const legacy = localStorage.getItem("ds_procurement_purchase_orders");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw && legacy) {
      const migrated = (JSON.parse(legacy) as PurchaseOrder[]).map(normalizePO);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (!raw) {
      const seeded = SEED.map(normalizePO);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return (JSON.parse(raw) as PurchaseOrder[]).map(normalizePO);
  } catch {
    return SEED.map(normalizePO);
  }
}

export function savePurchaseOrders(list: PurchaseOrder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getPOById(id: string | number): PurchaseOrder | undefined {
  const key = String(id);
  return loadPurchaseOrders().find((p) => String(p.id) === key);
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
