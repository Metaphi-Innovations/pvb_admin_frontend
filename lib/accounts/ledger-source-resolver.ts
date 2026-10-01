/**
 * Resolve ledger transaction rows to source document pages for drill-down.
 */

import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadExpenses } from "@/app/(app)/accounts/expenses/expense-data";
import {
  VOUCHER_TYPE_LABELS,
  type AccountingVoucher,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/vouchers/voucher-data";

export interface SourceDocumentLink {
  href: string;
  label: string;
  sourceModule: string;
}

const SOURCE_MODULE_LABELS: Record<VoucherTypeCode, string> = {
  sales: "Sales Invoice",
  purchase: "Purchase Bill",
  receipt: "Receipt Voucher",
  payment: "Payment Voucher",
  journal: "Journal Voucher",
  contra: "Contra Voucher",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

function voucherViewHref(voucherId: number): string {
  return `/accounts/vouchers/view/${voucherId}`;
}

function findInvoiceByRef(ref: string) {
  const trimmed = ref.trim();
  if (!trimmed) return undefined;
  return loadInvoices().find(
    (inv) =>
      inv.invoiceNo === trimmed ||
      inv.referenceNo === trimmed ||
      trimmed.includes(inv.invoiceNo),
  );
}

function findPurchaseByRef(ref: string) {
  const trimmed = ref.trim();
  if (!trimmed) return undefined;
  return loadPurchaseInvoices().find(
    (inv) =>
      inv.invoiceNo === trimmed ||
      inv.vendorInvoiceNo === trimmed ||
      inv.grnNo === trimmed ||
      trimmed.includes(inv.invoiceNo),
  );
}

function findCreditNoteByRef(ref: string) {
  const trimmed = ref.trim();
  if (!trimmed) return undefined;
  return loadCreditNotes().find((n) => n.creditNoteNo === trimmed || trimmed.includes(n.creditNoteNo));
}

function findDebitNoteByRef(ref: string) {
  const trimmed = ref.trim();
  if (!trimmed) return undefined;
  return loadDebitNotes().find((n) => n.debitNoteNo === trimmed || trimmed.includes(n.debitNoteNo));
}

function findExpenseByRef(ref: string) {
  const trimmed = ref.trim();
  if (!trimmed) return undefined;
  return loadExpenses().find(
    (e) => e.expenseNumber === trimmed || e.sourceReferenceNo === trimmed,
  );
}

/** Bank reconciliation postings often reference statement lines in narration. */
function bankReconHref(v: AccountingVoucher): string | null {
  const narration = `${v.narration} ${v.referenceNo}`.toLowerCase();
  if (
    narration.includes("bank recon") ||
    narration.includes("reconciliation") ||
    narration.includes("statement line") ||
    narration.includes("bank categor")
  ) {
    return "/accounts/banking/transactions";
  }
  return null;
}

/** Inventory / stock valuation journal entries. */
function inventoryHref(v: AccountingVoucher): string | null {
  const text = `${v.narration} ${v.referenceNo}`.toLowerCase();
  if (
    text.includes("grn") ||
    text.includes("stock") ||
    text.includes("inventory") ||
    text.includes("batch") ||
    text.includes("warehouse transfer") ||
    text.includes("cogs")
  ) {
    if (text.includes("warehouse transfer") || text.includes("stock transfer")) {
      return "/accounts/transactions/inventory-adjustments";
    }
    return "/accounts/reports/stock-valuation";
  }
  return null;
}

export function resolveSourceDocumentLink(v: AccountingVoucher): SourceDocumentLink {
  const ref = v.referenceNo?.trim() || "";
  const moduleLabel = SOURCE_MODULE_LABELS[v.voucherType] ?? VOUCHER_TYPE_LABELS[v.voucherType];

  switch (v.voucherType) {
    case "sales": {
      const inv = findInvoiceByRef(ref);
      if (inv) {
        return {
          href: `/accounts/transactions/invoices/${inv.id}`,
          label: "View Sales Invoice",
          sourceModule: "Sales Invoice",
        };
      }
      break;
    }
    case "purchase": {
      const bill = findPurchaseByRef(ref);
      if (bill) {
        return {
          href: `/accounts/purchase-invoices/${bill.id}`,
          label: "View Purchase Bill",
          sourceModule: "Purchase Bill",
        };
      }
      break;
    }
    case "credit_note": {
      const note = findCreditNoteByRef(ref);
      if (note) {
        return {
          href: `/accounts/transactions/credit-notes/${note.id}`,
          label: "View Credit Note",
          sourceModule: "Credit Note",
        };
      }
      break;
    }
    case "debit_note": {
      const note = findDebitNoteByRef(ref);
      if (note) {
        return {
          href: `/accounts/transactions/debit-notes/${note.id}`,
          label: "View Debit Note",
          sourceModule: "Debit Note",
        };
      }
      break;
    }
    case "receipt":
      return {
        href: voucherViewHref(v.id),
        label: "View Receipt Voucher",
        sourceModule: "Receipt Voucher",
      };
    case "payment": {
      const expense = findExpenseByRef(ref);
      if (expense) {
        return {
          href: `/accounts/transactions/expenses/${expense.id}`,
          label: "View Expense Claim",
          sourceModule: "Expense Claim",
        };
      }
      return {
        href: voucherViewHref(v.id),
        label: "View Payment Voucher",
        sourceModule: "Payment Voucher",
      };
    }
    case "contra":
      return {
        href: voucherViewHref(v.id),
        label: "View Contra Voucher",
        sourceModule: "Contra Voucher",
      };
    case "journal": {
      const recon = bankReconHref(v);
      if (recon) {
        return {
          href: recon,
          label: "View Bank Transaction",
          sourceModule: "Bank Reconciliation",
        };
      }
      const stock = inventoryHref(v);
      if (stock) {
        return {
          href: stock,
          label: "View Stock Valuation",
          sourceModule: "Inventory / Stock Valuation",
        };
      }
      const inv = findInvoiceByRef(ref);
      if (inv) {
        return {
          href: `/accounts/transactions/invoices/${inv.id}`,
          label: "View Sales Invoice",
          sourceModule: "Sales Invoice",
        };
      }
      const bill = findPurchaseByRef(ref);
      if (bill) {
        return {
          href: `/accounts/purchase-invoices/${bill.id}`,
          label: "View Purchase Bill",
          sourceModule: "Purchase Bill",
        };
      }
      return {
        href: voucherViewHref(v.id),
        label: "View Journal Voucher",
        sourceModule: "Journal Voucher",
      };
    }
  }

  const fallbackInvoice = findInvoiceByRef(ref);
  if (fallbackInvoice) {
    return {
      href: `/accounts/transactions/invoices/${fallbackInvoice.id}`,
      label: "View Sales Invoice",
      sourceModule: "Sales Invoice",
    };
  }

  const fallbackBill = findPurchaseByRef(ref);
  if (fallbackBill) {
    return {
      href: `/accounts/purchase-invoices/${fallbackBill.id}`,
      label: "View Purchase Bill",
      sourceModule: "Purchase Bill",
    };
  }

  const recon = bankReconHref(v);
  if (recon) {
    return {
      href: recon,
      label: "View Bank Transaction",
      sourceModule: "Bank Reconciliation",
    };
  }

  const stock = inventoryHref(v);
  if (stock) {
    return {
      href: stock,
      label: "View Stock Valuation",
      sourceModule: "Inventory / Stock Valuation",
    };
  }

  return {
    href: voucherViewHref(v.id),
    label: `View ${moduleLabel}`,
    sourceModule: moduleLabel,
  };
}
