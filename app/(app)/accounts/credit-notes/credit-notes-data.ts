import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type { AccountsDocumentWorkflow } from "@/lib/accounts/accounts-maker-checker";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { getCustomersForTransactionDropdown } from "@/app/(app)/masters/customers/customer-data";
import {
  calcLineAmounts,
  isSchemeSettlementPending,
  loadInvoices,
  normalizeInvoice,
  saveInvoices,
  type InvoiceRecord,
} from "../invoices/invoices-data";
import { loadOrders } from "@/app/(app)/sales/orders/orders-data";
import { postCreditNoteAccounting } from "./credit-note-accounting";
import {
  SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG,
  findPendingSchemeSettlement,
  isSchemeSettlementAlreadySettled,
  type PendingSchemeSettlementOption,
} from "@/lib/accounts/scheme-settlement-data";
import { NEAR_EXPIRY_SETTLEMENT_STATUS_SETTLED } from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";

export type CreditNoteAgainst = "sales_invoice" | "sales_order" | "general";
export type NoteWorkflowStatus = "draft" | "pending_approval" | "sent_back" | "approved" | "rejected" | "cancelled";

export type CreditReferenceType = "invoice" | "sales_order";

export interface CreditNoteLine {
  id: string;
  sourceLineId: string;
  productId?: number | null;
  productName: string;
  sku?: string;
  hsn?: string;
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
  receivableLedger?: string;
  salesperson?: string;
  subject?: string;
  billingAddress?: string;
  shippingAddress?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  originalAmount: number;
  alreadyAdjustedAmount: number;
  currentCreditAmount: number;
  balanceAfterAdjustment: number;
  taxCreditAmount: number;
  lineItems: CreditNoteLine[];
  reason: string;
  remarks: string;
  status: NoteWorkflowStatus;
  workflow?: AccountsDocumentWorkflow;
  activity: NoteActivityEntry[];
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Near Expiry scheme settlement reference — settled on post */
  schemeSettlementKey?: string;
  schemeCode?: string;
  schemeSettlementAmount?: number;
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

const SEED: CreditNoteRecord[] = [];

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

/** Line amounts from qty, rate, discount %, and GST % */
export function calcCreditLineAmounts(line: Pick<CreditNoteLine, "returnQty" | "unitPrice" | "discountPct" | "taxPct">) {
  return calcLineAmounts({
    qty: Math.max(0, line.returnQty),
    unitPrice: line.unitPrice,
    discountPct: line.discountPct ?? 0,
    taxPct: line.taxPct ?? 0,
  });
}

/** Scheme benefit as discount % when percentage-based */
export function schemeDiscountPct(scheme: PendingSchemeSettlementOption): number {
  const type = scheme.benefitType?.toLowerCase() ?? "";
  if (type.includes("percent") || type === "percentage") {
    return scheme.benefitValue;
  }
  return 0;
}

export function recalcCreditLine(
  line: CreditNoteLine,
  allLines: CreditNoteLine[],
  alreadyAdjustedAmount: number,
): CreditNoteLine {
  const amounts = calcCreditLineAmounts(line);
  const creditAmount =
    line.returnQty > 0 && line.unitPrice > 0
      ? computeLineCreditAmount(
          { ...line, creditAmount: amounts.amount },
          allLines,
          alreadyAdjustedAmount,
        )
      : 0;
  return {
    ...line,
    creditAmount,
    gstAmount: amounts.taxAmt,
    lineAmount: amounts.amount,
  };
}

export function recalcAllCreditLines(
  lines: CreditNoteLine[],
  alreadyAdjustedAmount: number,
): CreditNoteLine[] {
  return lines.map((l) => recalcCreditLine(l, lines, alreadyAdjustedAmount));
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
  return recalcAllCreditLines(merged, alreadyAdjustedAmount);
}

export function computeCreditNoteGstSplit(lines: CreditNoteLine[]): { taxable: number; taxAmount: number; grandTotal: number } {
  const grandTotal = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
  let taxable = 0;
  let taxAmount = 0;
  for (const l of lines) {
    if (l.creditAmount <= 0) continue;
    const rate = 1 + (l.taxPct || 0) / 100;
    const lineTaxable = Math.round((l.creditAmount / rate) * 100) / 100;
    taxable += lineTaxable;
    taxAmount += Math.round((l.creditAmount - lineTaxable) * 100) / 100;
  }
  return {
    taxable: Math.round(taxable * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

export function normalizeCreditNote(rec: CreditNoteRecord): CreditNoteRecord {
  const lineItems = rec.lineItems.map((l) => normalizeCreditLine(l));
  const currentCreditAmount = lineItems.reduce((s, l) => s + l.creditAmount, 0);
  const { taxAmount } = computeCreditNoteGstSplit(lineItems);
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
    taxCreditAmount: taxAmount,
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
    productId: null,
    productName: "",
    sku: "",
    hsn: "",
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
  let sku = "";
  if (l.productId) {
    const product = loadProducts().find((p) => p.id === l.productId);
    sku = product?.sku ?? "";
  }
  return {
    id: `line-${l.id}`,
    sourceLineId: l.id,
    productId: l.productId,
    productName: l.productName,
    sku,
    hsn: l.hsn ?? "",
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

/** Invoice lines for a Near Expiry scheme — match product from scheme settlement option. */
export function creditLinesForSchemeSettlement(
  lineItems: CreditNoteLine[],
  scheme: PendingSchemeSettlementOption,
): CreditNoteLine[] {
  const productKey = scheme.product.trim().toLowerCase();
  const productIdKey = scheme.productId?.trim().toLowerCase();
  const matched = lineItems.filter((l) => {
    const name = l.productName.trim().toLowerCase();
    if (productIdKey && l.sourceLineId && String(l.sourceLineId).toLowerCase() === productIdKey) return true;
    if (!productKey) return false;
    return name === productKey || name.includes(productKey) || productKey.includes(name);
  });
  const useLines = matched.length > 0 ? matched : lineItems;
  const discountPct = schemeDiscountPct(scheme);
  return useLines.map((l) =>
    normalizeCreditLine({
      ...l,
      returnQty: 0,
      creditAmount: 0,
      discountPct: discountPct > 0 ? discountPct : l.discountPct,
      description:
        l.description ||
        `Scheme ${scheme.schemeCode} · Batch ${scheme.batchNumber}`,
      reason: "Near Expiry Scheme Settlement",
    }),
  );
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
  receivableLedger?: string;
  salesperson?: string;
  subject?: string;
  billingAddress?: string;
  shippingAddress?: string;
  customerNotes?: string;
  termsAndConditions?: string;
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
  schemeSettlementKey?: string;
  schemeCode?: string;
  schemeSettlementAmount?: number;
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
    receivableLedger: input.receivableLedger,
    salesperson: input.salesperson,
    subject: input.subject,
    billingAddress: input.billingAddress,
    shippingAddress: input.shippingAddress,
    customerNotes: input.customerNotes,
    termsAndConditions: input.termsAndConditions,
    originalAmount: input.originalAmount,
    alreadyAdjustedAmount: input.alreadyAdjustedAmount,
    currentCreditAmount: 0,
    balanceAfterAdjustment: 0,
    taxCreditAmount: 0,
    lineItems: input.lineItems,
    reason: input.reason,
    remarks: input.remarks,
    status: input.status,
    schemeSettlementKey: input.schemeSettlementKey,
    schemeCode: input.schemeCode,
    schemeSettlementAmount: input.schemeSettlementAmount,
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
  if (cur.status === "cancelled") {
    throw new Error("Cannot edit cancelled credit note.");
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
    receivableLedger: input.receivableLedger,
    salesperson: input.salesperson,
    subject: input.subject,
    billingAddress: input.billingAddress,
    shippingAddress: input.shippingAddress,
    customerNotes: input.customerNotes,
    termsAndConditions: input.termsAndConditions,
    originalAmount: input.originalAmount,
    alreadyAdjustedAmount: input.alreadyAdjustedAmount,
    lineItems: input.lineItems,
    reason: input.reason,
    remarks: input.remarks,
    status: input.status,
    schemeSettlementKey: input.schemeSettlementKey,
    schemeCode: input.schemeCode,
    schemeSettlementAmount: input.schemeSettlementAmount,
    activity: appendActivity(cur.activity, "updated", "Credit note updated"),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveCreditNotes(all);
  return updated;
}

function settleSchemeFromCreditNote(note: CreditNoteRecord): void {
  if (!note.schemeSettlementKey) return;
  const amount = note.schemeSettlementAmount ?? note.currentCreditAmount;
  if (amount <= 0) throw new Error("Settlement amount must be greater than zero.");

  const [invoiceIdStr, schemeCode, batchNumber] = note.schemeSettlementKey.split(":");
  const invoiceId = Number(invoiceIdStr);
  if (!Number.isFinite(invoiceId) || !schemeCode || !batchNumber) {
    throw new Error("Invalid scheme settlement reference.");
  }

  const all = loadInvoices();
  const idx = all.findIndex((inv) => inv.id === invoiceId);
  if (idx < 0) throw new Error("Invoice not found for scheme settlement.");

  const invoice = all[idx];
  const entries = invoice.nearExpirySchemeSettlements ?? [];
  const entryIdx = entries.findIndex(
    (e) => e.schemeCode === schemeCode && e.batchNumber === batchNumber,
  );
  if (entryIdx < 0) throw new Error("Scheme settlement entry not found on invoice.");

  const entry = entries[entryIdx];
  if (!isSchemeSettlementPending(entry.settlementStatus)) {
    throw new Error(SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG);
  }

  entries[entryIdx] = {
    ...entry,
    settlementStatus: NEAR_EXPIRY_SETTLEMENT_STATUS_SETTLED,
    settlementDocumentType: "credit_note",
    settlementDocumentNo: note.creditNoteNo,
    settlementDate: note.creditNoteDate,
    settlementAmount: Math.round(amount * 100) / 100,
    settledBy: ACCOUNTS_CURRENT_USER,
  };

  all[idx] = normalizeInvoice({
    ...invoice,
    nearExpirySchemeSettlements: entries,
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  saveInvoices(all);
}

export function approveCreditNote(id: number): CreditNoteRecord {
  const all = loadCreditNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Credit note not found");
  const cur = all[idx];
  if (cur.status !== "draft" && cur.status !== "pending_approval") {
    throw new Error("Only draft or pending credit notes can be approved.");
  }
  if (cur.schemeSettlementKey) {
    if (isSchemeSettlementAlreadySettled(cur.schemeSettlementKey)) {
      throw new Error(SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG);
    }
    const amount = cur.schemeSettlementAmount ?? cur.currentCreditAmount;
    if (amount <= 0) {
      throw new Error("Enter quantity on scheme line before posting.");
    }
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
  if (updated.schemeSettlementKey) {
    settleSchemeFromCreditNote(updated);
  }
  postCreditNoteAccounting(updated);
  return updated;
}

export function postCreditNote(id: number): CreditNoteRecord {
  return approveCreditNote(id);
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
  return rec.status !== "cancelled";
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

export function filterCreditNotesListing(
  records: CreditNoteRecord[],
  filters: { search: string; dateFrom: string; dateTo: string },
): CreditNoteRecord[] {
  let r = records;
  if (filters.dateFrom) r = r.filter((x) => x.creditNoteDate >= filters.dateFrom);
  if (filters.dateTo) r = r.filter((x) => x.creditNoteDate <= filters.dateTo);
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
  return r.sort((a, b) => b.creditNoteDate.localeCompare(a.creditNoteDate));
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
