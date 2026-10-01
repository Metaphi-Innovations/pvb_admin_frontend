import {
  getExpenseById,
  loadExpenses,
  markExpensePaid,
  saveExpenses,
  type PaymentMode,
} from "@/app/(app)/accounts/expenses/expense-data";
import { createVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";

export interface PayClaimInput {
  claimId: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  paymentReferenceNo: string;
  bankLedgerId: number;
  employeePayableLedgerId?: number;
  paymentRemarks?: string;
}

/** Pending → Claims Payable → Payment Voucher → Paid */
export function payClaimFromAccounts(input: PayClaimInput): { ok: true } | { ok: false; error: string } {
  const expense = getExpenseById(input.claimId);
  if (!expense) return { ok: false, error: "Claim not found." };
  if (expense.status !== "approved") return { ok: false, error: "Only approved claims can be paid." };
  if (expense.paidStatus === "paid") return { ok: false, error: "Claim is already paid." };

  const records = loadChartOfAccounts();
  const payable =
    (input.employeePayableLedgerId
      ? findLedgerById(input.employeePayableLedgerId, records)
      : null) ??
    records.find(
      (r) =>
        r.nodeLevel === "ledger" &&
        (r.accountName.toLowerCase().includes("employee payable") ||
          r.accountName.toLowerCase().includes("expenses payable")),
    );
  if (!payable) {
    return { ok: false, error: "Employee Payable ledger not found in Chart of Accounts." };
  }
  const bank = findLedgerById(input.bankLedgerId, records);
  if (!bank) return { ok: false, error: "Select a valid bank ledger." };

  const amount = expense.approvedAmount || expense.claimedAmount || expense.totalAmount;
  if (amount <= 0) return { ok: false, error: "Approved amount must be greater than zero." };

  const lines = [
    { id: 1, ledgerId: payable.id, ledgerName: payable.accountName, debit: amount, credit: 0, remarks: expense.expenseNumber },
    { id: 2, ledgerId: bank.id, ledgerName: bank.accountName, debit: 0, credit: amount, remarks: expense.expenseNumber },
  ];

  createVoucher("payment", {
    date: input.paymentDate,
    referenceNo: input.paymentReferenceNo,
    narration: input.paymentRemarks || `Claim payment — ${expense.expenseNumber}`,
    status: "posted",
    lines,
  });

  const updated = markExpensePaid(expense, {
    paymentDate: input.paymentDate,
    paymentMode: input.paymentMode,
    paymentReferenceNo: input.paymentReferenceNo,
    paidAmount: amount,
    paymentRemarks: input.paymentRemarks || `Paid via ${input.paymentMode}`,
  });

  const all = loadExpenses();
  const idx = all.findIndex((e) => e.id === updated.id);
  if (idx >= 0) {
    all[idx] = updated;
    saveExpenses(all);
  }

  return { ok: true };
}

export function listPayableClaims() {
  return loadExpenses().filter((e) => e.status === "approved" && e.paidStatus !== "paid");
}
