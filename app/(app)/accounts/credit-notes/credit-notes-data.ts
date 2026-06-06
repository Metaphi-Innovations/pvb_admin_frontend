import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { getCustomersForTransactionDropdown } from "@/app/(app)/masters/customers/customer-data";
import { calcLineAmounts, loadInvoices, type InvoiceRecord } from "../invoices/invoices-data";
import { loadOrders } from "@/app/(app)/sales/orders/orders-data";

export type CreditNoteAgainst = "sales_invoice" | "sales_order" | "general";
export type NoteWorkflowStatus = "draft" | "pending_approval" | "approved" | "rejected" | "cancelled";

export type CreditReferenceType = "invoice" | "sales_order";

export interface CreditNoteLine {
  id: string;
  sourceLineId: string;
  productName: string;
  description: string;
  invoiceQty: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  gstAmount: number;
  lineAmount: number;
  returnQty: number;
  creditAmount: number;
  reason: string;
}

export interface CreditReferencePreview {
  referenceType: CreditReferenceType;
  documentDate: string;
  sourceInvoiceId: number | null;
  sourceInvoiceNo: string;
  sourceOrderId: number | null;
  sourceOrderNo: string;
  customerId: number | null;
  customerName: string;
  customerMobile: string;
  customerGst: string;
  originalAmount: number;
  taxAmount: number;
  alreadyAdjustedAmount: number;
  lineItems: CreditNoteLine[];
}

export interface NoteActivityEntry {
  at: string;
  action: string;
  by: string;
  detail: string;
}

export interface CreditNoteRecord {
  id: number;
  creditNoteNo: string;
  creditNoteDate: string;
  againstType: CreditNoteAgainst;
  sourceInvoiceId: number | null;
  sourceInvoiceNo: string;
  sourceOrderId: number | null;
  sourceOrderNo: string;
  customerId: number | null;
  customerName: string;
  originalAmount: number;
  alreadyAdjustedAmount: number;
  currentCreditAmount: number;
  balanceAfterAdjustment: number;
  taxCreditAmount: number;
  lineItems: CreditNoteLine[];
  reason: string;
  remarks: string;
  status: NoteWorkflowStatus;
  activity: NoteActivityEntry[];
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_accounts_credit_notes_v1";

export const CREDIT_REASONS = [
  "Sales return",
  "Customer return",
  "Damaged goods",
  "Rate difference",
  "Excess billing correction",
  "Discount adjustment",
  "Tax invoice correction",
  "Other",
];

const SEED: CreditNoteRecord[] = [
  {
    id: 1,
    creditNoteNo: "CN-0001",
    creditNoteDate: "2026-06-01",
    againstType: "sales_invoice",
    sourceInvoiceId: null,
    sourceInvoiceNo: "INV-0001",
    sourceOrderId: null,
    sourceOrderNo: "PO-4421",
    customerId: 1,
    customerName: "Agro Solutions Pvt Ltd",
    originalAmount: 85000,
    alreadyAdjustedAmount: 0,
    currentCreditAmount: 12000,
    balanceAfterAdjustment: 73000,
    taxCreditAmount: 0,
    lineItems: [
      {
        id: "l1",
        sourceLineId: "l1",
        productName: "NPK Blend",
        description: "Partial return",
        invoiceQty: 100,
        unitPrice: 120,
        discountPct: 0,
        taxPct: 12,
        gstAmount: 1440,
        lineAmount: 12000,
        returnQty: 10,
        creditAmount: 12000,
        reason: "Sales return",
      },
    ],
    reason: "Sales return",
    remarks: "Demo credit note for UI review",
    status: "draft",
    activity: [{ at: "2026-06-01T09:00:00.000Z", action: "created", by: "Admin", detail: "Sample credit note" }],
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
];

function nextCreditNoteNo(records: CreditNoteRecord[]): string {
  const max = records.reduce((m, r) => {
    const n = parseInt(r.creditNoteNo.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `CN-${String(max + 1).padStart(4, "0")}`;
}

function appendActivity(
  existing: NoteActivityEntry[],
  action: string,
  detail: string,
  by = ACCOUNTS_CURRENT_USER,
): NoteActivityEntry[] {
  return [...existing, { at: new Date().toISOString(), action, by, detail }];
}

export function normalizeCreditLine(line: Partial<CreditNoteLine> & Pick<CreditNoteLine, "id">): CreditNoteLine {
  const base = createEmptyCreditLine();
  return {
    ...base,
    ...line,
    unitPrice: line.unitPrice ?? base.unitPrice,
    discountPct: line.discountPct ?? base.discountPct,
    taxPct: line.taxPct ?? base.taxPct,
    gstAmount: line.gstAmount ?? base.gstAmount,
    lineAmount: line.lineAmount ?? base.lineAmount,
  };
}

/** Credit for returned qty: rate + discount + GST, capped by line balance after prior credits */
export function computeLineCreditAmount(
  line: CreditNoteLine,
  allLines: CreditNoteLine[],
  alreadyAdjustedAmount: number,
): number {
  const returnQty = Math.max(0, line.returnQty);
  if (returnQty <= 0) return 0;

  const invoiceQty = line.invoiceQty;
  const effectiveQty = invoiceQty > 0 ? Math.min(returnQty, invoiceQty) : returnQty;

  let gross = 0;
  if (line.unitPrice > 0) {
    gross = calcLineAmounts({
      qty: effectiveQty,
      unitPrice: line.unitPrice,
      discountPct: line.discountPct ?? 0,
      taxPct: line.taxPct ?? 0,
    }).amount;
  } else if (invoiceQty > 0 && line.lineAmount > 0) {
    gross = Math.round((effectiveQty / invoiceQty) * line.lineAmount * 100) / 100;
  }

  const totalLineAmount = allLines.reduce((s, l) => s + Math.max(0, l.lineAmount), 0);
  const lineBase = line.lineAmount > 0 ? line.lineAmount : gross;
  const lineAlreadyAllocated =
    totalLineAmount > 0 && alreadyAdjustedAmount > 0
      ? Math.round((lineBase / totalLineAmount) * alreadyAdjustedAmount * 100) / 100
      : 0;

  const lineRemaining = Math.max(0, Math.round((lineBase - lineAlreadyAllocated) * 100) / 100);
  return Math.round(Math.min(gross, lineRemaining) * 100) / 100;
}

export function applyReturnQtyToLines(
  lines: CreditNoteLine[],
  lineId: string,
  returnQty: number,
  alreadyAdjustedAmount: number,
): CreditNoteLine[] {
  const merged = lines.map((l) => (l.id === lineId ? { ...l, returnQty } : l));
  return merged.map((l) =>
    l.id === lineId
      ? { ...l, creditAmount: computeLineCreditAmount(l, merged, alreadyAdjustedAmount) }
      : l,
  );
}

export function normalizeCreditNote(rec: CreditNoteRecord): CreditNoteRecord {
  const lineItems = rec.lineItems.map((l) => normalizeCreditLine(l));
  const currentCreditAmount = lineItems.reduce((s, l) => s + l.creditAmount, 0);
  const originalAmount = rec.originalAmount > 0 ? rec.originalAmount : currentCreditAmount;
  const balanceAfterAdjustment = Math.max(
    0,
    originalAmount - rec.alreadyAdjustedAmount - currentCreditAmount,
  );
  return {
    ...rec,
    lineItems,
    originalAmount,
    currentCreditAmount: Math.round(currentCreditAmount * 100) / 100,
    balanceAfterAdjustment: Math.round(balanceAfterAdjustment * 100) / 100,
  };
}

export function loadCreditNotes(): CreditNoteRecord[] {
  if (typeof window === "undefined") return SEED.map(normalizeCreditNote);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: CreditNoteRecord[] = raw ? JSON.parse(raw) : SEED;
    const normalized = list.map(normalizeCreditNote);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return SEED.map(normalizeCreditNote);
  }
}

export function saveCreditNotes(records: CreditNoteRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.map(normalizeCreditNote)));
}

export function getCreditNoteById(id: number): CreditNoteRecord | undefined {
  return loadCreditNotes().find((c) => c.id === id);
}

export function createEmptyCreditLine(): CreditNoteLine {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceLineId: "",
    productName: "",
    description: "",
    invoiceQty: 0,
    unitPrice: 0,
    discountPct: 0,
    taxPct: 0,
    gstAmount: 0,
    lineAmount: 0,
    returnQty: 0,
    creditAmount: 0,
    reason: "",
  };
}

function invoiceLineToCreditLine(l: import("../invoices/invoices-data").InvoiceLineItem): CreditNoteLine {
  const { taxAmt } = (() => {
    const base = Math.max(0, l.qty * l.unitPrice);
    const disc = base * (l.discountPct / 100);
    const taxable = Math.max(0, base - disc);
    const tax = Math.round(taxable * (l.taxPct / 100) * 100) / 100;
    return { taxAmt: tax };
  })();
  return {
    id: `line-${l.id}`,
    sourceLineId: l.id,
    productName: l.productName,
    description: l.description,
    invoiceQty: l.qty,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    taxPct: l.taxPct,
    gstAmount: taxAmt,
    lineAmount: l.amount,
    returnQty: 0,
    creditAmount: 0,
    reason: "",
  };
}

export function findInvoiceLinkedToOrder(orderId: number) {
  const order = loadOrders().find((o) => o.id === orderId);
  if (!order) return undefined;
  return loadInvoices().find(
    (inv) =>
      inv.invoiceStatus !== "cancelled" &&
      (inv.referenceNo === order.soNumber ||
        inv.salesOrderNo === order.soNumber ||
        (inv.customerId === order.customerId && inv.referenceNo.toLowerCase().includes(order.soNumber.toLowerCase()))),
  );
}

/** Build full reference preview when user selects an invoice */
export function buildReferenceFromInvoice(invoiceId: number): CreditReferencePreview | null {
  const inv = loadInvoices().find((i) => i.id === invoiceId);
  if (!inv) return null;
  const linkedSo = inv.referenceNo || inv.salesOrderNo || "";
  return {
    referenceType: "invoice",
    documentDate: inv.invoiceDate,
    sourceInvoiceId: inv.id,
    sourceInvoiceNo: inv.invoiceNo,
    sourceOrderId: inv.salesOrderId ?? null,
    sourceOrderNo: linkedSo,
    customerId: inv.customerId,
    customerName: inv.customerName,
    customerMobile: inv.customerMobile,
    customerGst: inv.customerGst,
    originalAmount: inv.grandTotal,
    taxAmount: inv.taxAmount,
    alreadyAdjustedAmount: inv.amountCredited ?? 0,
    lineItems: inv.lineItems.map(invoiceLineToCreditLine),
  };
}

/** Build full reference preview when user selects a sales order */
export function buildReferenceFromSalesOrder(orderId: number): CreditReferencePreview | null {
  const order = loadOrders().find((o) => o.id === orderId);
  if (!order) return null;
  const linkedInv = findInvoiceLinkedToOrder(orderId);
  const lines = (order.lineItems ?? []).map((l) => ({
    id: `line-${l.id}`,
    sourceLineId: l.id,
    productName: l.productName,
    description: l.productCode ? `Code: ${l.productCode}` : "",
    invoiceQty: l.quantity,
    unitPrice: l.unitPrice,
    discountPct: 0,
    taxPct: 0,
    gstAmount: l.gstAmount,
    lineAmount: l.lineTotal,
    returnQty: 0,
    creditAmount: 0,
    reason: "",
  }));
  return {
    referenceType: "sales_order",
    documentDate: order.orderDate,
    sourceInvoiceId: linkedInv?.id ?? null,
    sourceInvoiceNo: linkedInv?.invoiceNo ?? "",
    sourceOrderId: order.id,
    sourceOrderNo: order.soNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    customerMobile: "",
    customerGst: "",
    originalAmount: order.totalAmount,
    taxAmount: lines.reduce((s, l) => s + l.gstAmount, 0),
    alreadyAdjustedAmount: 0,
    lineItems: lines.length ? lines : [createEmptyCreditLine()],
  };
}

export function previewToFormInput(preview: CreditReferencePreview): Partial<CreditNoteFormInput> {
  return {
    customerId: preview.customerId,
    customerName: preview.customerName,
    sourceInvoiceId: preview.sourceInvoiceId,
    sourceInvoiceNo: preview.sourceInvoiceNo,
    sourceOrderId: preview.sourceOrderId,
    sourceOrderNo: preview.sourceOrderNo,
    originalAmount: preview.originalAmount,
    alreadyAdjustedAmount: preview.alreadyAdjustedAmount,
    lineItems: preview.lineItems,
  };
}

/** @deprecated Use buildReferenceFromInvoice */
export function prefillFromInvoice(invoiceId: number): Partial<CreditNoteFormInput> | null {
  const p = buildReferenceFromInvoice(invoiceId);
  return p ? previewToFormInput(p) : null;
}

/** @deprecated Use buildReferenceFromSalesOrder */
export function prefillFromSalesOrder(orderId: number): Partial<CreditNoteFormInput> | null {
  const p = buildReferenceFromSalesOrder(orderId);
  return p ? previewToFormInput(p) : null;
}

function validateBasic(input: CreditNoteFormInput): void {
  if (!input.customerName.trim()) throw new Error("Customer name is required.");
  const total = input.lineItems.reduce((s, l) => s + l.creditAmount, 0);
  if (total <= 0) throw new Error("Enter at least one line with a credit amount.");
}

export type CreditNoteFormInput = {
  creditNoteDate: string;
  customerId: number | null;
  customerName: string;
  sourceInvoiceId: number | null;
  sourceInvoiceNo: string;
  sourceOrderId: number | null;
  sourceOrderNo: string;
  originalAmount: number;
  alreadyAdjustedAmount: number;
  lineItems: CreditNoteLine[];
  reason: string;
  remarks: string;
  status: NoteWorkflowStatus;
};

function inferAgainstType(input: CreditNoteFormInput): CreditNoteAgainst {
  if (input.sourceInvoiceNo.trim()) return "sales_invoice";
  if (input.sourceOrderNo.trim()) return "sales_order";
  return "general";
}

export function createCreditNote(input: CreditNoteFormInput): CreditNoteRecord {
  validateBasic(input);
  const all = loadCreditNotes();
  const id = all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1;
  const rec = normalizeCreditNote({
    id,
    creditNoteNo: nextCreditNoteNo(all),
    creditNoteDate: input.creditNoteDate,
    againstType: inferAgainstType(input),
    sourceInvoiceId: input.sourceInvoiceId,
    sourceInvoiceNo: input.sourceInvoiceNo.trim(),
    sourceOrderId: input.sourceOrderId,
    sourceOrderNo: input.sourceOrderNo.trim(),
    customerId: input.customerId,
    customerName: input.customerName.trim(),
    originalAmount: input.originalAmount,
    alreadyAdjustedAmount: input.alreadyAdjustedAmount,
    currentCreditAmount: 0,
    balanceAfterAdjustment: 0,
    taxCreditAmount: 0,
    lineItems: input.lineItems,
    reason: input.reason,
    remarks: input.remarks,
    status: input.status,
    activity: [{ at: new Date().toISOString(), action: "created", by: ACCOUNTS_CURRENT_USER, detail: "Credit note created" }],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  saveCreditNotes([...all, rec]);
  return rec;
}

export function updateCreditNote(id: number, input: CreditNoteFormInput): CreditNoteRecord {
  const all = loadCreditNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Credit note not found");
  const cur = all[idx];
  if (cur.status === "approved" || cur.status === "cancelled") {
    throw new Error("Cannot edit approved or cancelled credit note.");
  }
  validateBasic(input);
  const updated = normalizeCreditNote({
    ...cur,
    creditNoteDate: input.creditNoteDate,
    againstType: inferAgainstType(input),
    sourceInvoiceId: input.sourceInvoiceId,
    sourceInvoiceNo: input.sourceInvoiceNo.trim(),
    sourceOrderId: input.sourceOrderId,
    sourceOrderNo: input.sourceOrderNo.trim(),
    customerId: input.customerId,
    customerName: input.customerName.trim(),
    originalAmount: input.originalAmount,
    alreadyAdjustedAmount: input.alreadyAdjustedAmount,
    lineItems: input.lineItems,
    reason: input.reason,
    remarks: input.remarks,
    status: input.status,
    activity: appendActivity(cur.activity, "updated", "Credit note updated"),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveCreditNotes(all);
  return updated;
}

export function approveCreditNote(id: number): CreditNoteRecord {
  const all = loadCreditNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Credit note not found");
  const cur = all[idx];
  if (cur.status !== "draft" && cur.status !== "pending_approval") {
    throw new Error("Only draft or pending credit notes can be approved.");
  }
  const updated = normalizeCreditNote({
    ...cur,
    status: "approved",
    approvedBy: ACCOUNTS_CURRENT_USER,
    approvedAt: new Date().toISOString(),
    activity: appendActivity(cur.activity, "approved", `Approved credit ${cur.currentCreditAmount}`),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveCreditNotes(all);
  return updated;
}

export function cancelCreditNote(id: number, reason: string): CreditNoteRecord {
  const all = loadCreditNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Credit note not found");
  const cur = all[idx];
  if (cur.status === "approved") throw new Error("Approved credit notes cannot be cancelled.");
  const updated = normalizeCreditNote({
    ...cur,
    status: "cancelled",
    activity: appendActivity(cur.activity, "cancelled", reason.trim() || "Cancelled"),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveCreditNotes(all);
  return updated;
}

export function canEditCreditNote(rec: CreditNoteRecord): boolean {
  return rec.status === "draft" || rec.status === "pending_approval";
}

export function getCreditNoteRowActions(rec: CreditNoteRecord): ("view" | "edit" | "cancel")[] {
  const actions: ("view" | "edit" | "cancel")[] = ["view"];
  if (canEditCreditNote(rec)) actions.push("edit");
  if (rec.status !== "approved" && rec.status !== "cancelled") actions.push("cancel");
  return actions;
}

export function filterCreditNotes(
  records: CreditNoteRecord[],
  filters: { tab: string; search: string },
): CreditNoteRecord[] {
  let r = records;
  if (filters.tab !== "all") r = r.filter((x) => x.status === filters.tab);
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    r = r.filter(
      (x) =>
        x.creditNoteNo.toLowerCase().includes(q) ||
        x.customerName.toLowerCase().includes(q) ||
        x.sourceInvoiceNo.toLowerCase().includes(q) ||
        x.sourceOrderNo.toLowerCase().includes(q),
    );
  }
  return r;
}

export function computeCreditNoteTabCounts(records: CreditNoteRecord[]): Record<string, number> {
  return {
    all: records.length,
    draft: records.filter((r) => r.status === "draft").length,
    pending_approval: records.filter((r) => r.status === "pending_approval").length,
    approved: records.filter((r) => r.status === "approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
    cancelled: records.filter((r) => r.status === "cancelled").length,
  };
}

export function getCustomersForCreditNote() {
  return getCustomersForTransactionDropdown();
}

export function listInvoicesForReference(): InvoiceRecord[] {
  return loadInvoices().filter((i) => i.invoiceStatus !== "cancelled");
}

export function listOrdersForReference() {
  return loadOrders().filter((o) => o.status !== "cancelled");
}
