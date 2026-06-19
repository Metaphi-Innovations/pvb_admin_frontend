/**
 * Payables — derived from posted purchase vouchers on Trade Payables ledgers.
 */

import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { formatMoney } from "@/lib/accounts/money-format";

export interface VendorOutstandingRow {
  vendorName: string;
  ledgerId: number;
  billCount: number;
  totalDebit: number;
  totalCredit: number;
  outstanding: number;
  lastTransactionDate: string;
}

export interface EmployeeClaimPayableRow {
  employeeName: string;
  claimNo: string;
  amount: number;
  dueDate: string;
  status: "pending" | "approved" | "overdue";
}

function payableLedgerIds(): Set<number> {
  return new Set(
    getLedgersUnderSubGroupName("Trade Payables / Sundry Creditors").map((l) => l.id),
  );
}

function expensesPayableLedgerIds(): Set<number> {
  return new Set(getLedgersUnderSubGroupName("Expenses Payable").map((l) => l.id));
}

export function computeVendorOutstanding(): VendorOutstandingRow[] {
  const ledgerIds = payableLedgerIds();
  const vouchers = loadVouchers().filter((v) => v.status === "posted" || v.status === "approved");
  const map = new Map<string, VendorOutstandingRow>();

  for (const v of vouchers) {
    for (const line of v.lines) {
      if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) continue;
      const key = line.ledgerName || String(line.ledgerId);
      const row = map.get(key) ?? {
        vendorName: key,
        ledgerId: line.ledgerId,
        billCount: 0,
        totalDebit: 0,
        totalCredit: 0,
        outstanding: 0,
        lastTransactionDate: v.date,
      };
      row.totalDebit += Number(line.debit) || 0;
      row.totalCredit += Number(line.credit) || 0;
      if (v.date > row.lastTransactionDate) row.lastTransactionDate = v.date;
      if (v.voucherType === "purchase") row.billCount += 1;
      map.set(key, row);
    }
  }

  return Array.from(map.values())
    .map((r) => ({ ...r, outstanding: r.totalCredit - r.totalDebit }))
    .filter((r) => r.outstanding > 0.01)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function computeEmployeeClaimsPayable(): EmployeeClaimPayableRow[] {
  const ledgerIds = expensesPayableLedgerIds();
  const vouchers = loadVouchers().filter(
    (v) =>
      (v.status === "posted" || v.status === "approved") &&
      v.narration.toLowerCase().includes("claim"),
  );
  const rows: EmployeeClaimPayableRow[] = [];

  for (const v of vouchers) {
    for (const line of v.lines) {
      if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) continue;
      if ((Number(line.credit) || 0) <= 0) continue;
      rows.push({
        employeeName: line.ledgerName,
        claimNo: v.referenceNo || v.voucherNumber,
        amount: Number(line.credit) || 0,
        dueDate: v.date,
        status: "approved",
      });
    }
  }
  return rows;
}

export function computeDuePayments(): { party: string; amount: number; dueDate: string; type: string }[] {
  const vendors = computeVendorOutstanding().map((v) => ({
    party: v.vendorName,
    amount: v.outstanding,
    dueDate: v.lastTransactionDate,
    type: "Vendor",
  }));
  const claims = computeEmployeeClaimsPayable().map((c) => ({
    party: c.employeeName,
    amount: c.amount,
    dueDate: c.dueDate,
    type: "Employee Claim",
  }));
  return [...vendors, ...claims].sort((a, b) => b.amount - a.amount);
}

export function formatPayable(amount: number): string {
  return formatMoney(amount);
}
