/**
 * Unified transaction detail resolver for accounting report drill-down.
 */

import { loadInvoices, getInvoiceAmountBreakup, type InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadPurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCreditNotes, type CreditNoteRecord } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes, type DebitNoteRecord } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  getVoucherById,
  loadVouchers,
  VOUCHER_TYPE_LABELS,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  resolveWorkflowStatus,
  type AccountsDocumentWorkflow,
} from "@/lib/accounts/accounts-maker-checker";
import { resolveSourceDocumentLink } from "@/lib/accounts/ledger-source-resolver";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";
import type { GeneralLedgerRow } from "@/lib/accounts/general-ledger-data";
import type { DayBookVoucherGroup } from "@/lib/accounts/day-book-data";
import type { TdsPartyWiseRow } from "@/lib/accounts/tds-party-wise-data";
import type { InventoryMovement } from "@/lib/accounts/inventory-accounting-data";
import { resolveTdsSourceHref } from "@/lib/accounts/tds-party-wise-data";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";

export interface TransactionAttachment {
  id: string;
  name: string;
  fileName: string;
  uploadedAt?: string;
  dataUrl?: string;
}

export interface TransactionLedgerLine {
  ledgerName: string;
  debit: number;
  credit: number;
  remarks?: string;
}

export interface TransactionDetail {
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  postingDate?: string;
  status: string;
  partyName?: string;
  partyType?: string;
  gstin?: string;
  pan?: string;
  debitLedger?: string;
  creditLedger?: string;
  expenseHead?: string;
  bankCashLedger?: string;
  tdsSection?: string;
  tdsPercent?: string;
  tdsAmount?: number;
  gstDetails?: string;
  referenceNumber?: string;
  ledgerLines?: TransactionLedgerLine[];
  taxableAmount?: number;
  gstAmount?: number;
  discount?: number;
  netAmount?: number;
  totalAmount: number;
  debit?: number;
  credit?: number;
  narration: string;
  createdBy?: string;
  approvedBy?: string;
  approvalDate?: string;
  approvalStatus?: string;
  attachments: TransactionAttachment[];
  sourceHref: string;
  sourceLabel: string;
}

export type TransactionDetailRef =
  | { type: "general_ledger"; row: GeneralLedgerRow | CoaTransactionRow }
  | { type: "day_book"; entry: DayBookVoucherGroup }
  | { type: "sales_invoice"; id: number }
  | { type: "purchase_invoice"; id: number }
  | { type: "credit_note"; id: number }
  | { type: "debit_note"; id: number }
  | { type: "voucher"; id: number }
  | { type: "tds"; row: TdsPartyWiseRow }
  | { type: "inventory"; movement: InventoryMovement };

function workflowApprovalMeta(workflow?: AccountsDocumentWorkflow) {
  if (!workflow) return { approvedBy: undefined, approvalDate: undefined, approvalStatus: undefined };
  const approvedStep = [...workflow.steps].reverse().find((s) => s.state === "approved");
  const lastApproval = workflow.history?.filter((h) => /approv/i.test(h.action)).pop();
  return {
    approvedBy: approvedStep?.approverName ?? lastApproval?.by,
    approvalDate: approvedStep?.actedAt ?? workflow.postedAt ?? lastApproval?.at,
    approvalStatus: resolveWorkflowStatus(workflow).replace(/_/g, " "),
  };
}

function statusLabel(workflow?: AccountsDocumentWorkflow, legacyStatus?: string): string {
  return resolveWorkflowStatus(workflow, legacyStatus).replace(/_/g, " ");
}

function ledgerLinesFromVoucher(v: AccountingVoucher): TransactionLedgerLine[] {
  return v.lines.map((l) => ({
    ledgerName: l.contactName || l.ledgerName,
    debit: l.debit,
    credit: l.credit,
    remarks: l.remarks,
  }));
}

function pickDebitCreditLedgers(v: AccountingVoucher): { debitLedger?: string; creditLedger?: string } {
  const debits = v.lines.filter((l) => l.debit > 0).map((l) => l.contactName || l.ledgerName);
  const credits = v.lines.filter((l) => l.credit > 0).map((l) => l.contactName || l.ledgerName);
  return {
    debitLedger: debits.length ? debits.join(", ") : undefined,
    creditLedger: credits.length ? credits.join(", ") : undefined,
  };
}

function pickBankCashLedger(v: AccountingVoucher): string | undefined {
  const bankCash = v.lines
    .filter((l) => /bank|cash|petty/i.test(l.ledgerName))
    .map((l) => l.ledgerName);
  return bankCash.length ? bankCash.join(", ") : undefined;
}

function pickExpenseHead(v: AccountingVoucher): string | undefined {
  const expense = v.lines
    .filter((l) => /expense|salary|rent|freight|charges/i.test(l.ledgerName) && l.debit > 0)
    .map((l) => l.ledgerName);
  return expense.length ? expense.join(", ") : undefined;
}

function mapInvoiceAttachments(inv: InvoiceRecord): TransactionAttachment[] {
  return (inv.attachments ?? []).map((a) => ({
    id: a.id,
    name: a.documentName,
    fileName: a.fileName,
    uploadedAt: a.uploadedAt,
    dataUrl: a.dataUrl,
  }));
}

function detailFromInvoice(inv: InvoiceRecord): TransactionDetail {
  const { taxableValue, gstAmount, invoiceTotal } = getInvoiceAmountBreakup(inv);
  const approval = workflowApprovalMeta(inv.workflow);
  const source = resolveSourceDocumentLink({
    id: 0,
    voucherType: "sales",
    voucherNumber: inv.invoiceNo,
    date: inv.invoiceDate,
    financialYearId: null,
    financialYearName: "",
    referenceNo: inv.invoiceNo,
    narration: inv.remarks,
    lines: [],
    totalDebit: inv.grandTotal,
    totalCredit: inv.grandTotal,
    status: "posted",
    createdBy: inv.createdBy,
    updatedBy: inv.updatedBy,
  });

  return {
    voucherNumber: inv.invoiceNo,
    voucherType: "Sales Invoice",
    voucherDate: inv.invoiceDate,
    postingDate: inv.workflow?.postedAt,
    status: statusLabel(inv.workflow, inv.invoiceStatus),
    partyName: inv.customerName,
    partyType: "Customer",
    gstin: inv.customerGst || undefined,
    pan: inv.pan || undefined,
    debitLedger: inv.receivableLedger || inv.customerName,
    creditLedger: "Sales / GST Output",
    gstDetails: inv.lineItems?.length
      ? inv.lineItems.map((l) => `${l.productName} @ ${l.taxPct}%`).join("; ")
      : undefined,
    referenceNumber: inv.referenceNo || inv.salesOrderNo,
    taxableAmount: taxableValue,
    gstAmount,
    discount: inv.discountTotal,
    netAmount: invoiceTotal,
    totalAmount: invoiceTotal,
    debit: invoiceTotal,
    credit: invoiceTotal,
    narration: inv.remarks || inv.customerNotes || `Sales invoice to ${inv.customerName}`,
    createdBy: inv.createdBy,
    ...approval,
    attachments: mapInvoiceAttachments(inv),
    sourceHref: `/accounts/transactions/invoices/${inv.id}`,
    sourceLabel: source.label,
  };
}

function detailFromPurchaseInvoice(inv: PurchaseInvoiceRecord): TransactionDetail {
  const approval = workflowApprovalMeta(inv.workflow);
  const taxable = inv.productAmount ?? inv.subtotal;

  return {
    voucherNumber: inv.invoiceNo,
    voucherType: "Purchase Invoice",
    voucherDate: inv.invoiceDate,
    postingDate: inv.workflow?.postedAt,
    status: statusLabel(inv.workflow, "posted"),
    partyName: inv.vendorName,
    partyType: "Vendor",
    gstin: inv.vendorGst || undefined,
    debitLedger: "Purchase / Inventory",
    creditLedger: inv.vendorName,
    gstDetails: inv.lineItems?.length
      ? inv.lineItems.map((l) => `${l.productName} @ ${l.taxPct}%`).join("; ")
      : undefined,
    referenceNumber: inv.vendorInvoiceNo || inv.grnNo || inv.poNumber,
    taxableAmount: taxable,
    gstAmount: inv.taxAmount,
    netAmount: inv.grandTotal,
    totalAmount: inv.grandTotal,
    debit: inv.grandTotal,
    credit: inv.grandTotal,
    narration: inv.remarks || `Purchase from ${inv.vendorName}`,
    createdBy: inv.createdBy,
    ...approval,
    attachments: inv.attachment
      ? [
          {
            id: inv.attachment.id,
            name: inv.attachment.documentName,
            fileName: inv.attachment.fileName,
            uploadedAt: inv.attachment.uploadedAt,
            dataUrl: inv.attachment.dataUrl,
          },
        ]
      : [],
    sourceHref: `/accounts/purchase-invoices/${inv.id}`,
    sourceLabel: "View Purchase Bill",
  };
}

function detailFromCreditNote(note: CreditNoteRecord): TransactionDetail {
  const approval = workflowApprovalMeta(note.workflow);
  const total = note.currentCreditAmount;
  const taxable = total - (note.taxCreditAmount || 0);
  return {
    voucherNumber: note.creditNoteNo,
    voucherType: "Credit Note",
    voucherDate: note.creditNoteDate,
    postingDate: note.workflow?.postedAt,
    status: statusLabel(note.workflow, note.status),
    partyName: note.customerName,
    partyType: "Customer",
    referenceNumber: note.sourceInvoiceNo || note.sourceOrderNo,
    taxableAmount: taxable,
    gstAmount: note.taxCreditAmount,
    netAmount: total,
    totalAmount: total,
    debit: total,
    credit: total,
    narration: note.remarks || note.reason || `Credit note for ${note.customerName}`,
    createdBy: note.createdBy,
    approvedBy: note.approvedBy ?? approval.approvedBy,
    approvalDate: note.approvedAt ?? approval.approvalDate,
    approvalStatus: approval.approvalStatus,
    attachments: [],
    sourceHref: `/accounts/transactions/credit-notes/${note.id}`,
    sourceLabel: "View Credit Note",
  };
}

function detailFromDebitNote(note: DebitNoteRecord): TransactionDetail {
  const approval = workflowApprovalMeta(note.workflow);
  const total = note.currentDebitAmount || note.standaloneDebitAmount || note.taxableAmount + note.gstAmount;
  return {
    voucherNumber: note.debitNoteNo,
    voucherType: "Debit Note",
    voucherDate: note.debitNoteDate,
    postingDate: note.workflow?.postedAt ?? note.processedAt,
    status: statusLabel(note.workflow, note.status),
    partyName: note.vendorName,
    partyType: "Vendor",
    referenceNumber: note.sourceInvoiceNo || note.sourcePoNo || note.sourceGrnNo,
    taxableAmount: note.taxableAmount,
    gstAmount: note.gstAmount,
    netAmount: total,
    totalAmount: total,
    debit: total,
    credit: total,
    narration: note.remarks || note.reason || `Debit note for ${note.vendorName}`,
    createdBy: note.createdBy,
    approvedBy: note.approvedBy ?? approval.approvedBy,
    approvalDate: note.approvedAt ?? approval.approvalDate,
    approvalStatus: approval.approvalStatus,
    attachments: (note.attachments ?? []).map((a) => ({
      id: a.id,
      name: a.documentName,
      fileName: a.fileName,
      uploadedAt: a.uploadedAt,
      dataUrl: a.dataUrl,
    })),
    sourceHref: `/accounts/transactions/debit-notes/${note.id}`,
    sourceLabel: "View Debit Note",
  };
}

function detailFromVoucher(v: AccountingVoucher, context?: { partyName?: string; debit?: number; credit?: number }): TransactionDetail {
  const source = resolveSourceDocumentLink(v);
  const approval = workflowApprovalMeta(v.workflow);
  const { debitLedger, creditLedger } = pickDebitCreditLedgers(v);

  return {
    voucherNumber: v.voucherNumber,
    voucherType: VOUCHER_TYPE_LABELS[v.voucherType] ?? v.voucherType,
    voucherDate: v.date,
    postingDate: v.workflow?.postedAt ?? v.date,
    status: statusLabel(v.workflow, v.status),
    partyName: context?.partyName ?? v.lines.find((l) => l.contactName)?.contactName,
    partyType: v.voucherType === "receipt" ? "Customer" : v.voucherType === "payment" ? "Vendor" : undefined,
    debitLedger,
    creditLedger,
    expenseHead: pickExpenseHead(v),
    bankCashLedger: pickBankCashLedger(v),
    referenceNumber: v.referenceNo || undefined,
    ledgerLines: ledgerLinesFromVoucher(v),
    totalAmount: Math.max(v.totalDebit, v.totalCredit),
    debit: context?.debit ?? v.totalDebit,
    credit: context?.credit ?? v.totalCredit,
    narration: v.narration || "—",
    createdBy: v.createdBy,
    ...approval,
    attachments: [],
    sourceHref: source.href,
    sourceLabel: source.label,
  };
}

function detailFromTdsRow(row: TdsPartyWiseRow): TransactionDetail {
  const base =
    row.sourceType === "purchase_invoice"
      ? loadPurchaseInvoices().find((p) => p.id === row.sourceId)
      : undefined;
  const voucher =
    row.sourceType !== "purchase_invoice" ? getVoucherById(row.sourceId) : undefined;

  const detail = base
    ? detailFromPurchaseInvoice(base)
    : voucher
      ? detailFromVoucher(voucher)
      : null;

  return {
    voucherNumber: row.voucherNo,
    voucherType: detail?.voucherType ?? "TDS Deduction",
    voucherDate: row.voucherDate,
    postingDate: detail?.postingDate,
    status: row.paymentStatus === "paid" ? "Paid" : "Unpaid",
    partyName: row.partyName,
    partyType: row.partyType,
    pan: row.pan,
    tdsSection: `${row.tdsSection} — ${row.tdsSectionName}`,
    tdsPercent: row.tdsRate,
    tdsAmount: row.tdsAmount,
    referenceNumber: row.billNo,
    taxableAmount: row.taxableAmount,
    totalAmount: row.taxableAmount,
    debit: row.tdsAmount,
    credit: row.tdsAmount,
    narration: detail?.narration ?? `TDS ${row.tdsSection} deducted for ${row.partyName}`,
    createdBy: detail?.createdBy,
    approvedBy: detail?.approvedBy,
    approvalDate: detail?.approvalDate,
    approvalStatus: detail?.approvalStatus,
    attachments: detail?.attachments ?? [],
    sourceHref: resolveTdsSourceHref(row),
    sourceLabel: detail?.sourceLabel ?? "Open Source Voucher",
  };
}

function detailFromInventoryMovement(m: InventoryMovement): TransactionDetail {
  const inv = loadInvoices().find((i) => i.invoiceNo === m.voucherNo);
  if (inv) return { ...detailFromInvoice(inv), narration: m.narration ?? detailFromInvoice(inv).narration };

  const pi = loadPurchaseInvoices().find((p) => p.invoiceNo === m.voucherNo || p.grnNo === m.voucherNo);
  if (pi) return { ...detailFromPurchaseInvoice(pi), narration: m.narration ?? detailFromPurchaseInvoice(pi).narration };

  const voucher = loadVouchers().find((v) => v.voucherNumber === m.voucherNo);
  if (voucher) return detailFromVoucher(voucher);

  return {
    voucherNumber: m.voucherNo,
    voucherType: m.voucherType,
    voucherDate: m.date,
    status: "Posted",
    partyName: m.product,
    referenceNumber: m.batchNo,
    totalAmount: roundMoney(m.inQty * m.rate || m.outQty * m.rate),
    debit: m.inQty > 0 ? roundMoney(m.inQty * m.rate) : undefined,
    credit: m.outQty > 0 ? roundMoney(m.outQty * m.rate) : undefined,
    narration: m.narration ?? `${m.voucherType}: ${m.product} (${m.sku}) @ ${m.warehouse}`,
    attachments: [],
    sourceHref: "/accounts/reports/stock-register",
    sourceLabel: "View Stock Register",
  };
}

function detailFromDayBookEntry(entry: DayBookVoucherGroup): TransactionDetail {
  switch (entry.voucherType) {
    case "sales_invoice": {
      const inv = loadInvoices().find((i) => i.id === entry.sourceId);
      if (inv) {
        const d = detailFromInvoice(inv);
        return { ...d, debit: entry.totalDebit, credit: entry.totalCredit };
      }
      break;
    }
    case "purchase_invoice": {
      const inv = loadPurchaseInvoices().find((i) => i.id === entry.sourceId);
      if (inv) {
        const d = detailFromPurchaseInvoice(inv);
        return { ...d, debit: entry.totalDebit, credit: entry.totalCredit };
      }
      break;
    }
    case "credit_note": {
      const note = loadCreditNotes().find((n) => n.id === entry.sourceId);
      if (note) {
        const d = detailFromCreditNote(note);
        return { ...d, debit: entry.totalDebit, credit: entry.totalCredit };
      }
      break;
    }
    case "debit_note": {
      const note = loadDebitNotes().find((n) => n.id === entry.sourceId);
      if (note) {
        const d = detailFromDebitNote(note);
        return { ...d, debit: entry.totalDebit, credit: entry.totalCredit };
      }
      break;
    }
    default: {
      const v = getVoucherById(entry.sourceId);
      if (v) {
        return detailFromVoucher(v, {
          partyName: entry.partyLedger,
          debit: entry.totalDebit,
          credit: entry.totalCredit,
        });
      }
    }
  }

  return {
    voucherNumber: entry.voucherNo,
    voucherType: entry.voucherTypeLabel,
    voucherDate: entry.date,
    status: entry.status,
    partyName: entry.partyLedger,
    totalAmount: Math.max(entry.totalDebit, entry.totalCredit),
    debit: entry.totalDebit,
    credit: entry.totalCredit,
    narration: entry.narration,
    createdBy: entry.createdBy,
    attachments: [],
    sourceHref: entry.viewHref,
    sourceLabel: "Open Voucher",
  };
}

function detailFromCoaRow(row: GeneralLedgerRow | CoaTransactionRow): TransactionDetail | null {
  if (row.isOpeningRow) return null;

  if (row.voucherId) {
    const v = getVoucherById(row.voucherId);
    if (v) {
      return detailFromVoucher(v, {
        partyName: "contraLedger" in row ? row.contraLedger : undefined,
        debit: row.debit,
        credit: row.credit,
      });
    }
  }

  const byNo = loadVouchers().find((v) => v.voucherNumber === row.voucherNo);
  if (byNo) {
    return detailFromVoucher(byNo, {
      partyName: "contraLedger" in row ? row.contraLedger : undefined,
      debit: row.debit,
      credit: row.credit,
    });
  }

  const inv = loadInvoices().find((i) => i.invoiceNo === row.voucherNo);
  if (inv) {
    const d = detailFromInvoice(inv);
    return { ...d, debit: row.debit, credit: row.credit };
  }

  const pi = loadPurchaseInvoices().find((p) => p.invoiceNo === row.voucherNo);
  if (pi) {
    const d = detailFromPurchaseInvoice(pi);
    return { ...d, debit: row.debit, credit: row.credit };
  }

  const cn = loadCreditNotes().find((n) => n.creditNoteNo === row.voucherNo);
  if (cn) {
    const d = detailFromCreditNote(cn);
    return { ...d, debit: row.debit, credit: row.credit };
  }

  const dn = loadDebitNotes().find((n) => n.debitNoteNo === row.voucherNo);
  if (dn) {
    const d = detailFromDebitNote(dn);
    return { ...d, debit: row.debit, credit: row.credit };
  }

  if (row.viewHref) {
    return {
      voucherNumber: row.voucherNo,
      voucherType: row.voucherType,
      voucherDate: row.date,
      status: "Posted",
      referenceNumber: row.referenceNo,
      totalAmount: Math.max(row.debit, row.credit),
      debit: row.debit,
      credit: row.credit,
      narration: row.narration,
      attachments: [],
      sourceHref: row.viewHref,
      sourceLabel: row.viewLabel ?? "Open Voucher",
    };
  }

  return null;
}

export function resolveTransactionDetail(ref: TransactionDetailRef): TransactionDetail | null {
  switch (ref.type) {
    case "general_ledger":
      return detailFromCoaRow(ref.row);
    case "day_book":
      return detailFromDayBookEntry(ref.entry);
    case "sales_invoice": {
      const inv = loadInvoices().find((i) => i.id === ref.id);
      return inv ? detailFromInvoice(inv) : null;
    }
    case "purchase_invoice": {
      const inv = loadPurchaseInvoices().find((i) => i.id === ref.id);
      return inv ? detailFromPurchaseInvoice(inv) : null;
    }
    case "credit_note": {
      const note = loadCreditNotes().find((n) => n.id === ref.id);
      return note ? detailFromCreditNote(note) : null;
    }
    case "debit_note": {
      const note = loadDebitNotes().find((n) => n.id === ref.id);
      return note ? detailFromDebitNote(note) : null;
    }
    case "voucher": {
      const v = getVoucherById(ref.id);
      return v ? detailFromVoucher(v) : null;
    }
    case "tds":
      return detailFromTdsRow(ref.row);
    case "inventory":
      return detailFromInventoryMovement(ref.movement);
    default:
      return null;
  }
}

export function formatTransactionStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDetailMoney(amount?: number): string {
  if (amount == null || amount === 0) return "—";
  return formatMoney(amount);
}
