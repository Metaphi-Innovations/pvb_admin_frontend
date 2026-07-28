/**
 * Generic-ledger bill-wise references — additive store derived from posted voucher lines.
 * Party (customer/vendor) bill-wise continues to use receivables/payables allocation stores.
 */

import { loadChartOfAccounts } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  loadVouchers,
  type AccountingVoucher,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { roundMoney } from "@/lib/accounts/money-format";
import { isBillWiseEnabledLedger } from "@/lib/accounts/voucher-reference-types";
import {
  isCustomerPartyLedger,
  isVendorPartyLedger,
} from "@/lib/accounts/voucher-ledger-groups";

const STORAGE_KEY = "ds_accounts_generic_bill_wise_v1";

export type GenericBillWiseRefType =
  | "new_reference"
  | "against_invoice"
  | "advance"
  | "on_account";

export interface GenericBillWiseReference {
  id: number;
  ledgerId: number;
  referenceNo: string;
  referenceType: GenericBillWiseRefType;
  documentDate: string;
  dueDate: string;
  originalAmount: number;
  adjustedAmount: number;
  outstandingAmount: number;
  createdByVoucherId: number;
  createdByVoucherNo: string;
  status: "Pending" | "Partially Paid" | "Overdue" | "Settled" | "On Account" | "Advance";
}

interface GenericBillWiseStore {
  nextId: number;
  references: GenericBillWiseReference[];
}

function emptyStore(): GenericBillWiseStore {
  return { nextId: 1, references: [] };
}

function loadStore(): GenericBillWiseStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as GenericBillWiseStore;
    return {
      nextId: parsed.nextId ?? 1,
      references: Array.isArray(parsed.references) ? parsed.references : [],
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store: GenericBillWiseStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function daysOverdue(dueDate: string, asOf = new Date().toISOString().slice(0, 10)): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate.slice(0, 10));
  const asOfD = new Date(asOf.slice(0, 10));
  if (Number.isNaN(due.getTime()) || Number.isNaN(asOfD.getTime())) return 0;
  return Math.max(0, Math.floor((asOfD.getTime() - due.getTime()) / 86_400_000));
}

function deriveStatus(ref: GenericBillWiseReference): GenericBillWiseReference["status"] {
  if (ref.referenceType === "on_account") return "On Account";
  if (ref.referenceType === "advance") {
    return ref.outstandingAmount > 0.009 ? "Advance" : "Settled";
  }
  if (ref.outstandingAmount <= 0.009) return "Settled";
  if (ref.adjustedAmount > 0.009) return "Partially Paid";
  if (daysOverdue(ref.dueDate) > 0) return "Overdue";
  return "Pending";
}

function refreshStatus(ref: GenericBillWiseReference): GenericBillWiseReference {
  const outstanding = roundMoney(Math.max(0, ref.originalAmount - ref.adjustedAmount));
  const next = { ...ref, outstandingAmount: outstanding };
  return { ...next, status: deriveStatus(next) };
}

export function isGenericBillWiseLedger(
  ledgerId: number | null | undefined,
): boolean {
  if (ledgerId == null) return false;
  const records = loadChartOfAccounts();
  const ledger = records.find((r) => r.id === ledgerId);
  if (!ledger || !isBillWiseEnabledLedger(ledger)) return false;
  if (isCustomerPartyLedger(ledger, records) || isVendorPartyLedger(ledger, records)) {
    return false;
  }
  return true;
}

export function getOpenGenericBillWiseDocuments(ledgerId: number): Array<{
  id: number;
  no: string;
  documentDate: string;
  originalAmount: number;
  outstanding: number;
  href: string;
}> {
  return loadStore()
    .references.filter(
      (r) =>
        r.ledgerId === ledgerId &&
        r.outstandingAmount > 0.009 &&
        (r.referenceType === "new_reference" ||
          r.referenceType === "advance" ||
          r.referenceType === "against_invoice"),
    )
    .map((r) => ({
      id: r.id,
      no: r.referenceNo,
      documentDate: r.documentDate,
      originalAmount: r.originalAmount,
      outstanding: r.outstandingAmount,
      href: "",
    }));
}

export function getGenericBillWiseReferencesForLedger(
  ledgerId: number,
): GenericBillWiseReference[] {
  return loadStore()
    .references.filter(
      (r) =>
        r.ledgerId === ledgerId &&
        r.outstandingAmount > 0.009 &&
        r.referenceType !== "on_account",
    )
    .map(refreshStatus)
    .sort((a, b) => b.documentDate.localeCompare(a.documentDate));
}

function lineCreatesNewReference(line: VoucherLine): boolean {
  const t = line.billWiseReferenceType;
  return t === "new_reference" || t === "advance";
}

function lineAdjustsReference(line: VoucherLine): boolean {
  return line.billWiseReferenceType === "against_invoice" && line.billWiseReferenceId != null;
}

/**
 * Apply bill-wise effects for generic ledgers after a voucher is posted.
 * Safe no-op for party ledgers and non-bill-wise lines.
 */
export function applyGenericBillWiseFromPostedVoucher(voucher: AccountingVoucher): void {
  if (voucher.status !== "posted" && voucher.status !== "approved") return;

  const store = loadStore();
  let changed = false;

  for (const line of voucher.lines) {
    if (!line.ledgerId || !isGenericBillWiseLedger(line.ledgerId)) continue;

    const amount = roundMoney(Math.max(line.debit, line.credit));
    if (amount <= 0) continue;

    if (line.billWiseReferenceType === "on_account") {
      // Persist classification only — no outstanding bill.
      continue;
    }

    if (lineCreatesNewReference(line)) {
      const refNo =
        (line.billWiseReferenceNo || "").trim() ||
        `${voucher.voucherNumber}-${line.id}`;
      const already = store.references.some(
        (r) =>
          r.createdByVoucherId === voucher.id &&
          r.ledgerId === line.ledgerId &&
          r.referenceNo === refNo,
      );
      if (already) continue;

      const dueDate = (line.billWiseDueDate || voucher.date || "").slice(0, 10);
      const ref: GenericBillWiseReference = refreshStatus({
        id: store.nextId++,
        ledgerId: line.ledgerId,
        referenceNo: refNo,
        referenceType: (line.billWiseReferenceType as GenericBillWiseRefType) || "new_reference",
        documentDate: (voucher.date || "").slice(0, 10),
        dueDate,
        originalAmount: amount,
        adjustedAmount: 0,
        outstandingAmount: amount,
        createdByVoucherId: voucher.id,
        createdByVoucherNo: voucher.voucherNumber,
        status: "Pending",
      });
      store.references.push(ref);
      changed = true;
      continue;
    }

    if (lineAdjustsReference(line) && line.billWiseReferenceId != null) {
      const idx = store.references.findIndex((r) => r.id === line.billWiseReferenceId);
      if (idx < 0) continue;
      const current = store.references[idx];
      const adjust = Math.min(amount, current.outstandingAmount);
      store.references[idx] = refreshStatus({
        ...current,
        adjustedAmount: roundMoney(current.adjustedAmount + adjust),
      });
      changed = true;
    }
  }

  if (changed) saveStore(store);
}

/** Rebuild store from all posted vouchers (idempotent recovery). */
export function rebuildGenericBillWiseFromVouchers(): void {
  const store = emptyStore();
  const vouchers = loadVouchers().filter(
    (v) => v.status === "posted" || v.status === "approved",
  );
  saveStore(store);
  for (const v of vouchers) {
    applyGenericBillWiseFromPostedVoucher(v);
  }
}
