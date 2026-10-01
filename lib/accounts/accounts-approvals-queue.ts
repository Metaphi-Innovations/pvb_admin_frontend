/**
 * ERP Approvals queue — surfaces pending Accounts vouchers for checkers.
 */

import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  ACCOUNTS_VOUCHER_CATEGORY_LABELS,
  type AccountsDocumentWorkflow,
  type AccountsVoucherCategory,
  canCurrentUserApprove,
  ensureDocumentWorkflow,
  resolveWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";

export interface AccountsApprovalQueueItem {
  id: string;
  category: AccountsVoucherCategory;
  categoryLabel: string;
  documentId: number;
  documentNo: string;
  title: string;
  party: string;
  amount: number;
  amountLabel: string;
  date: string;
  makerName: string;
  makerRole: string;
  currentApproverName: string;
  currentApproverRole: string;
  workflow: AccountsDocumentWorkflow;
  viewHref: string;
  reviewHref: string;
}

function currentApprover(workflow: AccountsDocumentWorkflow): AccountsDocumentWorkflow["steps"][number] | null {
  const step = workflow.steps[workflow.currentApproverIndex];
  if (!step || step.level === 0) {
    return workflow.steps.find((s) => s.state === "pending") ?? null;
  }
  return step;
}

function queueItem(input: {
  category: AccountsVoucherCategory;
  documentId: number;
  documentNo: string;
  title: string;
  party: string;
  amount: number;
  date: string;
  workflow?: AccountsDocumentWorkflow;
  viewHref: string;
}): AccountsApprovalQueueItem | null {
  const workflow = ensureDocumentWorkflow(input.workflow);
  if (resolveWorkflowStatus(workflow) !== "pending_approval") return null;
  if (!canCurrentUserApprove(workflow)) return null;
  const approver = currentApprover(workflow);
  return {
    id: `${input.category}-${input.documentId}`,
    category: input.category,
    categoryLabel: ACCOUNTS_VOUCHER_CATEGORY_LABELS[input.category],
    documentId: input.documentId,
    documentNo: input.documentNo,
    title: input.title,
    party: input.party,
    amount: input.amount,
    amountLabel: formatMoney(input.amount),
    date: input.date,
    makerName: workflow.makerName,
    makerRole: workflow.makerRole,
    currentApproverName: approver?.approverName ?? "—",
    currentApproverRole: approver?.approverRole ?? "—",
    workflow,
    viewHref: input.viewHref,
    reviewHref: `/approvals?category=${input.category}&id=${input.documentId}`,
  };
}

export function loadAccountsApprovalQueue(): AccountsApprovalQueueItem[] {
  const items: AccountsApprovalQueueItem[] = [];

  for (const inv of loadInvoices()) {
    const row = queueItem({
      category: "sales_invoice",
      documentId: inv.id,
      documentNo: inv.invoiceNo,
      title: `Sales Invoice — ${inv.customerName}`,
      party: inv.customerName,
      amount: inv.grandTotal,
      date: inv.invoiceDate,
      workflow: inv.workflow,
      viewHref: `/accounts/transactions/invoices/${inv.id}`,
    });
    if (row) items.push(row);
  }

  for (const inv of loadPurchaseInvoices()) {
    const row = queueItem({
      category: "purchase_invoice",
      documentId: inv.id,
      documentNo: inv.invoiceNo,
      title: `Purchase Invoice — ${inv.vendorName}`,
      party: inv.vendorName,
      amount: inv.grandTotal,
      date: inv.invoiceDate,
      workflow: inv.workflow,
      viewHref: `/accounts/purchase-invoices/${inv.id}`,
    });
    if (row) items.push(row);
  }

  for (const note of loadCreditNotes()) {
    const row = queueItem({
      category: "credit_note",
      documentId: note.id,
      documentNo: note.creditNoteNo,
      title: `Credit Note — ${note.customerName}`,
      party: note.customerName,
      amount: note.currentCreditAmount,
      date: note.creditNoteDate,
      workflow: note.workflow,
      viewHref: `/accounts/transactions/credit-notes/${note.id}`,
    });
    if (row) items.push(row);
  }

  for (const note of loadDebitNotes()) {
    const row = queueItem({
      category: "debit_note",
      documentId: note.id,
      documentNo: note.debitNoteNo,
      title: `Debit Note — ${note.vendorName}`,
      party: note.vendorName,
      amount: note.currentDebitAmount || note.standaloneDebitAmount,
      date: note.debitNoteDate,
      workflow: note.workflow,
      viewHref: `/accounts/debit-notes/${note.id}`,
    });
    if (row) items.push(row);
  }

  for (const v of loadVouchers()) {
    const categoryMap: Partial<Record<string, AccountsVoucherCategory>> = {
      journal: "journal_entry",
      receipt: "receipt_voucher",
      payment: "payment_voucher",
    };
    const category = categoryMap[v.voucherType];
    if (!category) continue;
    const row = queueItem({
      category,
      documentId: v.id,
      documentNo: v.voucherNumber,
      title: `${ACCOUNTS_VOUCHER_CATEGORY_LABELS[category]} — ${v.voucherNumber}`,
      party: v.lines.find((l) => l.contactName)?.contactName ?? v.lines[0]?.ledgerName ?? "—",
      amount: Math.max(v.totalDebit, v.totalCredit),
      date: v.date,
      workflow: v.workflow,
      viewHref: `/accounts/vouchers/view/${v.id}`,
    });
    if (row) items.push(row);
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export function countPendingAccountsApprovals(): number {
  return loadAccountsApprovalQueue().length;
}

export function findAccountsApprovalQueueItem(
  category: AccountsVoucherCategory,
  documentId: number,
): AccountsApprovalQueueItem | undefined {
  return loadAccountsApprovalQueue().find(
    (item) => item.category === category && item.documentId === documentId,
  );
}

/** All pending items for listing (checker may not be current approver on all). */
export function loadAllPendingAccountsApprovals(): AccountsApprovalQueueItem[] {
  const items: AccountsApprovalQueueItem[] = [];
  const push = (row: AccountsApprovalQueueItem | null) => {
    if (row) items.push(row);
  };

  const makeRow = (input: Parameters<typeof queueItem>[0]): AccountsApprovalQueueItem | null => {
    const workflow = ensureDocumentWorkflow(input.workflow);
    if (resolveWorkflowStatus(workflow) !== "pending_approval") return null;
    const approver = currentApprover(workflow);
    return {
      id: `${input.category}-${input.documentId}`,
      category: input.category,
      categoryLabel: ACCOUNTS_VOUCHER_CATEGORY_LABELS[input.category],
      documentId: input.documentId,
      documentNo: input.documentNo,
      title: input.title,
      party: input.party,
      amount: input.amount,
      amountLabel: formatMoney(input.amount),
      date: input.date,
      makerName: workflow.makerName,
      makerRole: workflow.makerRole,
      currentApproverName: approver?.approverName ?? "—",
      currentApproverRole: approver?.approverRole ?? "—",
      workflow,
      viewHref: input.viewHref,
      reviewHref: `/approvals?category=${input.category}&id=${input.documentId}`,
    };
  };

  for (const inv of loadInvoices()) {
    push(
      makeRow({
        category: "sales_invoice",
        documentId: inv.id,
        documentNo: inv.invoiceNo,
        title: `Sales Invoice — ${inv.customerName}`,
        party: inv.customerName,
        amount: inv.grandTotal,
        date: inv.invoiceDate,
        workflow: inv.workflow,
        viewHref: `/accounts/transactions/invoices/${inv.id}`,
      }),
    );
  }
  for (const inv of loadPurchaseInvoices()) {
    push(
      makeRow({
        category: "purchase_invoice",
        documentId: inv.id,
        documentNo: inv.invoiceNo,
        title: `Purchase Invoice — ${inv.vendorName}`,
        party: inv.vendorName,
        amount: inv.grandTotal,
        date: inv.invoiceDate,
        workflow: inv.workflow,
        viewHref: `/accounts/purchase-invoices/${inv.id}`,
      }),
    );
  }
  for (const note of loadCreditNotes()) {
    push(
      makeRow({
        category: "credit_note",
        documentId: note.id,
        documentNo: note.creditNoteNo,
        title: `Credit Note — ${note.customerName}`,
        party: note.customerName,
        amount: note.currentCreditAmount,
        date: note.creditNoteDate,
        workflow: note.workflow,
        viewHref: `/accounts/transactions/credit-notes/${note.id}`,
      }),
    );
  }
  for (const note of loadDebitNotes()) {
    push(
      makeRow({
        category: "debit_note",
        documentId: note.id,
        documentNo: note.debitNoteNo,
        title: `Debit Note — ${note.vendorName}`,
        party: note.vendorName,
        amount: note.currentDebitAmount || note.standaloneDebitAmount,
        date: note.debitNoteDate,
        workflow: note.workflow,
        viewHref: `/accounts/debit-notes/${note.id}`,
      }),
    );
  }
  for (const v of loadVouchers()) {
    const categoryMap: Partial<Record<string, AccountsVoucherCategory>> = {
      journal: "journal_entry",
      receipt: "receipt_voucher",
      payment: "payment_voucher",
    };
    const category = categoryMap[v.voucherType];
    if (!category) continue;
    push(
      makeRow({
        category,
        documentId: v.id,
        documentNo: v.voucherNumber,
        title: `${ACCOUNTS_VOUCHER_CATEGORY_LABELS[category]} — ${v.voucherNumber}`,
        party: v.lines.find((l) => l.contactName)?.contactName ?? v.lines[0]?.ledgerName ?? "—",
        amount: Math.max(v.totalDebit, v.totalCredit),
        date: v.date,
        workflow: v.workflow,
        viewHref: `/accounts/vouchers/view/${v.id}`,
      }),
    );
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
}
