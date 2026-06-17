import { PROCUREMENT_APPROVAL, CURRENT_USER, COMPANY_BILLING } from "@/lib/procurement/config";
import { amountInWords, calcLineAmounts, nextId, round2, todayStr } from "@/lib/procurement/utils";
import type { ActivityEntry } from "@/lib/procurement/types";
import type { POShortCloseInfo } from "./po-qty";

export type { POShortCloseInfo } from "./po-qty";
export { canShortClosePO, getPOQtySummary, shortClosePO } from "./po-qty";

export type POStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
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
  return { ...po, status: normalizePOStatus(po.status) };
}

export interface POLineItem {
  uid: string;
  productId: number;
  productCode: string;
  productName: string;
  description: string;
  uom: string;
  orderedQty: number;
  unitPrice: number;
  discountPct: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  deliverySchedule: string;
  prLineUid?: string;
  /** Fallback when GRN not linked by PO number */
  receivedQty?: number;
  shortClosedQty?: number;
}

export interface POAttachment {
  uid: string;
  name: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
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
  taxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  otherCharges: number;
  grandTotal: number;
  amountInWords: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  poDate: string;
  supplierId: number;
  supplierName: string;
  supplierType: string;
  supplierContactPerson?: string;
  supplierMobile?: string;
  supplierMobileCountry?: string;
  supplierEmail?: string;
  supplierGstin?: string;
  referenceNumber: string;
  currency: string;
  paymentTerms: string;
  creditDays: number;
  deliveryTerms: string;
  expectedDeliveryDate: string;
  notes: string;
  sourcePrId: number | null;
  sourcePrNumber: string;
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

const STORAGE_KEY = "ds_procurement_purchase_orders";

function buildSummary(lines: POLineItem[], otherCharges: number): POSummary {
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
      discountPct: l.discountPct,
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
  taxableValue = round2(taxableValue);
  totalCgst = round2(totalCgst);
  totalSgst = round2(totalSgst);
  totalIgst = round2(totalIgst);
  const grandTotal = round2(taxableValue + totalCgst + totalSgst + totalIgst + otherCharges);

  return {
    grossAmount,
    totalDiscount,
    taxableValue,
    totalCgst,
    totalSgst,
    totalIgst,
    otherCharges: round2(otherCharges),
    grandTotal,
    amountInWords: amountInWords(grandTotal),
  };
}

export function recalcPOLines(lines: POLineItem[]): POLineItem[] {
  return lines.map((l) => {
    const c = calcLineAmounts({
      orderedQty: l.orderedQty,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      cgstPct: l.cgstPct,
      sgstPct: l.sgstPct,
      igstPct: l.igstPct,
    });
    return {
      ...l,
      grossAmount: c.grossAmount,
      taxAmount: c.taxAmount,
      netAmount: c.netAmount,
    };
  });
}

export function recalcPO(po: PurchaseOrder): PurchaseOrder {
  const lines = recalcPOLines(po.lines);
  const summary = buildSummary(lines, po.otherCharges);
  return { ...po, lines, summary };
}

const SEED: PurchaseOrder[] = [
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
    paymentTerms: "net-30",
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
    ],
    terms: [],
    attachments: [],
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
      ],
      500,
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
    paymentTerms: "net-15",
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
    ],
    terms: [],
    attachments: [],
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
      ],
      0,
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

export function loadPurchaseOrders(): PurchaseOrder[] {
  if (typeof window === "undefined") return SEED.map(normalizePO);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED.map(normalizePO);
    }
    const list = (JSON.parse(raw) as PurchaseOrder[]).map(normalizePO);
    return list;
  } catch {
    return SEED.map(normalizePO);
  }
}

export function savePurchaseOrders(list: PurchaseOrder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getPOById(id: number): PurchaseOrder | undefined {
  return loadPurchaseOrders().find((p) => p.id === id);
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
  invoice_uploaded: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Invoice Uploaded" },
  short_closed: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", label: "Short Closed" },
  closed: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-500", label: "Closed" },
  cancelled: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400", label: "Cancelled" },
};

export { buildSummary, COMPANY_BILLING };
