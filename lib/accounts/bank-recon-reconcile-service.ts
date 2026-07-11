/**
 * Bank reconciliation workspace — reconcile, pending, review, skip actions.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import type { BankReconActivityEvent } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import {
  listOutstandingInvoicesForPartyLedger,
  type UnpaidInvoiceOption,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  categorizeBankTransaction,
  canCategorizeTransaction,
} from "@/lib/accounts/bank-recon-categorize-service";
import type {
  BankReconCategorizeCategory,
  CategorizeAllocationLine,
} from "@/lib/accounts/bank-recon-categorize-types";
import {
  resolveCustomerIdForLedger,
  resolveVendorIdForLedger,
} from "@/lib/accounts/invoice-ledger-match";
import {
  getBankReconTransactionById,
  notifyRegisterUpdated,
  upsertBankReconTransaction,
  type BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";
import { validateInvoiceAllocations } from "@/lib/accounts/bank-recon-manual-service";

export type ReconcileAgainstType = "invoice" | "advance" | "on_account";

export type ReconcileSaveAction = "reconcile" | "pending" | "review" | "skip";

export interface ReconcileFormInput {
  statementTransactionId: string;
  bankAccountId: string;
  ledgerId: number;
  againstType: ReconcileAgainstType;
  bookDate: string;
  reconciliationAmount: number;
  voucherTypeLabel: string;
  remarks: string;
  allocations?: CategorizeAllocationLine[];
  advanceHandling?: "keep_advance" | "apply_later";
}

const CURRENT_USER = ACCOUNTS_CURRENT_USER;

function activity(
  label: string,
  detail: string,
  tone: BankReconActivityEvent["tone"] = "blue",
): BankReconActivityEvent {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    detail,
    actor: CURRENT_USER,
    timestamp: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    tone,
  };
}

export function inferVoucherTypeLabel(isDeposit: boolean): string {
  return isDeposit ? "Receipt Voucher" : "Payment Voucher";
}

export function inferReconcileCategory(
  ledger: ChartOfAccount,
  isDeposit: boolean,
  againstType: ReconcileAgainstType,
): {
  category: BankReconCategorizeCategory;
  customerId?: number | null;
  vendorId?: number | null;
  ledgerId?: number | null;
} {
  const customerId = resolveCustomerIdForLedger(ledger.id, ledger.accountName);
  const vendorId = resolveVendorIdForLedger(ledger.id, ledger.accountName);

  if (isDeposit) {
    if (customerId) {
      return {
        category: againstType === "advance" ? "customer_advance" : "customer_receipt",
        customerId,
      };
    }
    const name = ledger.accountName.toLowerCase();
    if (ledger.accountType === "Income" || name.includes("income") || name.includes("interest")) {
      return { category: name.includes("interest") ? "interest_income" : "other_income", ledgerId: ledger.id };
    }
    return { category: "other_receipt", ledgerId: ledger.id };
  }

  if (vendorId) {
    return { category: "vendor_payment", vendorId };
  }
  const name = ledger.accountName.toLowerCase();
  if (ledger.accountType === "Expense" || name.includes("expense") || name.includes("charges")) {
    return {
      category: name.includes("bank charge") ? "bank_charges" : "expense",
      ledgerId: ledger.id,
    };
  }
  return { category: "other_payment", ledgerId: ledger.id };
}

export function loadPartyInvoicesForReconcile(
  ledgerId: number,
  ledgerName: string,
  direction: "Deposit" | "Withdrawal",
): UnpaidInvoiceOption[] {
  return listOutstandingInvoicesForPartyLedger(ledgerId, ledgerName, direction);
}

export function validateReconcileAllocations(
  allocations: Record<string, string>,
  invoices: UnpaidInvoiceOption[],
  bankAmount: number,
): string | null {
  const errors = validateInvoiceAllocations(allocations, invoices, bankAmount);
  return errors.allocations ?? Object.values(errors)[0] ?? null;
}

export function getDisplayReconciliationStatus(row: BankReconTransactionRecord): string {
  if (row.matchStatus === "Matched") return "Reconciled";
  if (row.reconciliationStatus === "Pending Review") return "Pending Review";
  if (row.verificationStatus === "Review Required") return "Pending Review";
  if (row.matchStatus === "Pending") return "Pending";
  if (row.matchStatus === "Suggested Match") return "Suggested";
  if (row.matchStatus === "Excluded") return "Excluded";
  return row.reconciliationStatus ?? "Unreconciled";
}

export function getEntrySourceLabel(source: BankReconTransactionRecord["source"]): "Bank Statement" | "Manual" {
  return source === "Manual" ? "Manual" : "Bank Statement";
}

export function canReconcileTransaction(record: BankReconTransactionRecord): boolean {
  return canCategorizeTransaction(record);
}

export function applyReconcileStatusAction(
  statementTransactionId: string,
  action: Exclude<ReconcileSaveAction, "reconcile" | "skip">,
  remarks?: string,
): { ok: boolean; error?: string } {
  const stmt = getBankReconTransactionById(statementTransactionId);
  if (!stmt) return { ok: false, error: "Transaction not found." };

  const updated: BankReconTransactionRecord = { ...stmt };

  if (action === "pending") {
    updated.matchStatus = "Pending";
    updated.reconciliationStatus = "Unreconciled";
    updated.internalRemarks = remarks?.trim() || stmt.internalRemarks;
    updated.activity = [
      ...stmt.activity,
      activity("Saved as pending", remarks?.trim() || "Reconciliation deferred", "amber"),
    ];
  } else if (action === "review") {
    updated.matchStatus = "Pending";
    updated.reconciliationStatus = "Pending Review";
    updated.verificationStatus = "Review Required";
    updated.internalRemarks = remarks?.trim() || stmt.internalRemarks;
    updated.activity = [
      ...stmt.activity,
      activity("Marked for review", remarks?.trim() || "Requires reviewer attention", "amber"),
    ];
  }

  upsertBankReconTransaction(updated);
  notifyRegisterUpdated();
  return { ok: true };
}

export function executeReconcile(input: ReconcileFormInput): { ok: boolean; error?: string; voucherNumber?: string } {
  const stmt = getBankReconTransactionById(input.statementTransactionId);
  if (!stmt) return { ok: false, error: "Transaction not found." };
  if (!canCategorizeTransaction(stmt)) {
    return { ok: false, error: "This transaction is already reconciled or cannot be processed." };
  }

  const ledger = loadChartOfAccounts().find((l) => l.id === input.ledgerId);
  if (!ledger) return { ok: false, error: "Select a valid ledger." };
  if (!input.bookDate.trim()) return { ok: false, error: "Date as per books is required." };
  if (input.reconciliationAmount <= 0) return { ok: false, error: "Reconciliation amount must be greater than zero." };

  const isDeposit = (stmt.deposit ?? 0) > 0;
  const inferred = inferReconcileCategory(ledger, isDeposit, input.againstType);

  const result = categorizeBankTransaction({
    statementTransactionId: input.statementTransactionId,
    bankAccountId: input.bankAccountId,
    category: inferred.category,
    transactionDate: input.bookDate,
    referenceNo: stmt.reference || stmt.utrNumber || undefined,
    narration: input.remarks.trim() || stmt.narration,
    remarks: input.remarks.trim() || undefined,
    customerId: inferred.customerId ?? null,
    vendorId: inferred.vendorId ?? null,
    ledgerId: inferred.ledgerId ?? input.ledgerId,
    accountAmount: input.reconciliationAmount,
    bankAmount: input.reconciliationAmount,
    advanceHandling:
      input.againstType === "advance"
        ? "keep_advance"
        : input.againstType === "on_account"
          ? "apply_later"
          : input.advanceHandling,
    allocations: input.allocations,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const refreshed = getBankReconTransactionById(input.statementTransactionId);
  if (refreshed) {
    upsertBankReconTransaction({
      ...refreshed,
      bookDate: input.bookDate,
      reconciliationStatus: "Reconciled",
      reconciliationDate: input.bookDate,
      expectedVoucherType: input.voucherTypeLabel as BankReconTransactionRecord["expectedVoucherType"],
      activity: [
        ...refreshed.activity,
        activity("Reconciled", `${input.voucherTypeLabel} · ${result.voucherNumber ?? ""}`, "emerald"),
      ],
    });
    notifyRegisterUpdated();
  }

  return { ok: true, voucherNumber: result.voucherNumber };
}
