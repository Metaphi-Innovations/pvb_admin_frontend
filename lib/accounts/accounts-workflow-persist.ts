/**
 * Persist maker-checker workflow changes back to Accounts documents.
 */

import {
  approveCurrentStep,
  createInitialWorkflow,
  ensureDocumentWorkflow,
  mapWorkflowToLegacyStatus,
  rejectVoucher,
  sendBackVoucher,
  submitForApproval,
  type AccountsDocumentWorkflow,
  type AccountsVoucherCategory,
} from "@/lib/accounts/accounts-maker-checker";
import {
  getInvoiceById,
  loadInvoices,
  saveInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { maybePostPurchaseInvoice, maybePostSalesInvoice } from "@/lib/accounts/document-posting-bridge";
import {
  getPurchaseInvoiceById,
  loadPurchaseInvoices,
  savePurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { postCreditNoteAccounting } from "@/app/(app)/accounts/credit-notes/credit-note-accounting";
import {
  getCreditNoteById,
  loadCreditNotes,
  saveCreditNotes,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import {
  getDebitNoteById,
  loadDebitNotes,
  saveDebitNotes,
  type DebitNoteRecord,
} from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { maybePostDebitNote } from "@/lib/accounts/document-posting-bridge";
import {
  getVoucherById,
  loadVouchers,
  saveVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

function applyLegacyStatus(
  category: AccountsVoucherCategory,
  workflow: AccountsDocumentWorkflow,
): string {
  return mapWorkflowToLegacyStatus(workflow, category);
}

function afterPosted(category: AccountsVoucherCategory, documentId: number): void {
  if (category === "sales_invoice") {
    const inv = getInvoiceById(documentId);
    if (inv) maybePostSalesInvoice(inv);
  }
  if (category === "debit_note") {
    const note = getDebitNoteById(documentId);
    if (note) maybePostDebitNote(note);
  }
  if (category === "credit_note") {
    const note = getCreditNoteById(documentId);
    if (note) postCreditNoteAccounting(note);
  }
  if (category === "purchase_invoice") {
    const inv = getPurchaseInvoiceById(documentId);
    if (inv) maybePostPurchaseInvoice(inv);
  }
}

function saveInvoiceWorkflow(id: number, workflow: AccountsDocumentWorkflow): void {
  const all = loadInvoices();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Invoice not found");
  const legacy = applyLegacyStatus("sales_invoice", workflow);
  all[idx] = {
    ...all[idx],
    workflow,
    invoiceStatus: legacy === "sent" ? "sent" : legacy === "cancelled" ? "cancelled" : "draft",
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  };
  saveInvoices(all);
  if (workflow.status === "posted") afterPosted("sales_invoice", id);
}

function savePurchaseInvoiceWorkflow(id: number, workflow: AccountsDocumentWorkflow): void {
  const all = loadPurchaseInvoices();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Purchase invoice not found");
  all[idx] = {
    ...all[idx],
    workflow,
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  };
  savePurchaseInvoices(all);
  if (workflow.status === "posted") afterPosted("purchase_invoice", id);
}

function saveCreditNoteWorkflow(id: number, workflow: AccountsDocumentWorkflow): void {
  const all = loadCreditNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Credit note not found");
  const legacy = applyLegacyStatus("credit_note", workflow);
  all[idx] = {
    ...all[idx],
    workflow,
    status: legacy as CreditNoteRecord["status"],
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  };
  saveCreditNotes(all);
  if (workflow.status === "posted") afterPosted("credit_note", id);
}

function saveDebitNoteWorkflow(id: number, workflow: AccountsDocumentWorkflow): void {
  const all = loadDebitNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Debit note not found");
  const legacy = applyLegacyStatus("debit_note", workflow);
  all[idx] = {
    ...all[idx],
    workflow,
    status: legacy as DebitNoteRecord["status"],
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  };
  saveDebitNotes(all);
  if (workflow.status === "posted") afterPosted("debit_note", id);
}

function saveVoucherWorkflow(id: number, workflow: AccountsDocumentWorkflow): void {
  const all = loadVouchers();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Voucher not found");
  const legacy = applyLegacyStatus(
    all[idx].voucherType === "journal"
      ? "journal_entry"
      : all[idx].voucherType === "receipt"
        ? "receipt_voucher"
        : "payment_voucher",
    workflow,
  );
  all[idx] = {
    ...all[idx],
    workflow,
    status: legacy as AccountingVoucher["status"],
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  saveVouchers(all);
}

export function getDocumentWorkflow(
  category: AccountsVoucherCategory,
  documentId: number,
): AccountsDocumentWorkflow | undefined {
  switch (category) {
    case "sales_invoice":
      return getInvoiceById(documentId)?.workflow;
    case "purchase_invoice":
      return getPurchaseInvoiceById(documentId)?.workflow;
    case "credit_note":
      return getCreditNoteById(documentId)?.workflow;
    case "debit_note":
      return getDebitNoteById(documentId)?.workflow;
    case "journal_entry":
    case "receipt_voucher":
    case "payment_voucher":
      return getVoucherById(documentId)?.workflow;
    default:
      return undefined;
  }
}

export function initDocumentWorkflowIfMissing(
  category: AccountsVoucherCategory,
  documentId: number,
): AccountsDocumentWorkflow {
  const existing = getDocumentWorkflow(category, documentId);
  const workflow = ensureDocumentWorkflow(existing);
  if (!existing) {
    persistDocumentWorkflow(category, documentId, workflow);
  }
  return workflow;
}

export function persistDocumentWorkflow(
  category: AccountsVoucherCategory,
  documentId: number,
  workflow: AccountsDocumentWorkflow,
): void {
  switch (category) {
    case "sales_invoice":
      saveInvoiceWorkflow(documentId, workflow);
      break;
    case "purchase_invoice":
      savePurchaseInvoiceWorkflow(documentId, workflow);
      break;
    case "credit_note":
      saveCreditNoteWorkflow(documentId, workflow);
      break;
    case "debit_note":
      saveDebitNoteWorkflow(documentId, workflow);
      break;
    case "journal_entry":
    case "receipt_voucher":
    case "payment_voucher":
      saveVoucherWorkflow(documentId, workflow);
      break;
    default:
      break;
  }
}

export function submitDocumentForApproval(
  category: AccountsVoucherCategory,
  documentId: number,
  remarks = "",
): AccountsDocumentWorkflow {
  const workflow = ensureDocumentWorkflow(getDocumentWorkflow(category, documentId));
  const next = submitForApproval(workflow, remarks);
  persistDocumentWorkflow(category, documentId, next);
  return next;
}

export function approveDocumentStep(
  category: AccountsVoucherCategory,
  documentId: number,
  remarks = "",
): AccountsDocumentWorkflow {
  const workflow = ensureDocumentWorkflow(getDocumentWorkflow(category, documentId));
  const next = approveCurrentStep(workflow, undefined, remarks);
  persistDocumentWorkflow(category, documentId, next);
  return next;
}

export function rejectDocument(
  category: AccountsVoucherCategory,
  documentId: number,
  remarks: string,
): AccountsDocumentWorkflow {
  const workflow = ensureDocumentWorkflow(getDocumentWorkflow(category, documentId));
  const next = rejectVoucher(workflow, undefined, remarks);
  persistDocumentWorkflow(category, documentId, next);
  return next;
}

export function sendBackDocument(
  category: AccountsVoucherCategory,
  documentId: number,
  remarks: string,
): AccountsDocumentWorkflow {
  const workflow = ensureDocumentWorkflow(getDocumentWorkflow(category, documentId));
  const next = sendBackVoucher(workflow, undefined, remarks);
  persistDocumentWorkflow(category, documentId, next);
  return next;
}

export function attachWorkflowOnCreate(
  category: AccountsVoucherCategory,
  documentId: number,
): AccountsDocumentWorkflow {
  const workflow = createInitialWorkflow();
  persistDocumentWorkflow(category, documentId, workflow);
  return workflow;
}
