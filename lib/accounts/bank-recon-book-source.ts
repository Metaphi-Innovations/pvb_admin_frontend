/**
 * Read-only adapter: posted bank-ledger voucher lines → reconciliation book rows.
 * Manual demo accounts use recon-only overlay fixtures (never write vouchers).
 */

import {
  canEditVoucher,
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { resolveCoaLedgerForV2BankAccount } from "@/lib/accounts/bank-recon-account-bridge";
import {
  buildBookEntries,
  type BookEntryRow,
} from "@/lib/accounts/banking-book-utils";
import { seedBankingDemoData } from "@/lib/accounts/banking-demo-seed";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  getManualDemoAccount,
  getManualDemoBookBalance,
  getManualDemoMovements,
  isManualDemoAccount,
  manualDemoBookId,
  manualDemoVoucherId,
} from "@/lib/accounts/bank-recon-manual-demo-overlay";
import {
  ensureBankReconLedgerLinks,
  getBookBalanceInfo,
} from "@/lib/accounts/bank-recon-ledger-link";

export interface RawBookTransaction {
  id: string;
  bankAccountId: string;
  voucherId: number;
  voucherDate: string;
  particulars: string;
  voucherType: string;
  voucherTypeCode: string;
  voucherNumber: string;
  instrumentNumber: string;
  instrumentDate: string | null;
  deposit: number;
  withdrawal: number;
  ledgerName: string;
  canEditVoucher: boolean;
  viewHref: string;
  editHref: string | null;
}

function voucherById(id: number): AccountingVoucher | undefined {
  return loadVouchers().find((v) => v.id === id);
}

function instrumentFromVoucher(v: AccountingVoucher | undefined): {
  number: string;
  date: string | null;
} {
  if (!v) return { number: "", date: null };
  const ref = (v.referenceNo ?? "").trim();
  return { number: ref, date: null };
}

export function bookTransactionId(bankAccountId: string, rowKey: string): string {
  return `book:${bankAccountId}:${rowKey}`;
}

export function parseBookTransactionId(id: string): {
  bankAccountId: string;
  rowKey: string;
} | null {
  if (!id.startsWith("book:")) return null;
  const rest = id.slice("book:".length);
  const idx = rest.indexOf(":");
  if (idx < 0) return null;
  return { bankAccountId: rest.slice(0, idx), rowKey: rest.slice(idx + 1) };
}

function loadManualDemoBooks(
  bankAccountId: string,
  dateFrom?: string,
  dateTo?: string,
): RawBookTransaction[] {
  const acct = getManualDemoAccount(bankAccountId);
  if (!acct) return [];
  return getManualDemoMovements(bankAccountId)
    .filter((m) => {
      if (dateFrom && m.voucherDate < dateFrom) return false;
      if (dateTo && m.voucherDate > dateTo) return false;
      return true;
    })
    .map((m, i) => {
      const voucherId = manualDemoVoucherId(bankAccountId, i);
      return {
        id: manualDemoBookId(bankAccountId, m.key),
        bankAccountId,
        voucherId,
        voucherDate: m.voucherDate,
        particulars: m.particulars,
        voucherType: m.voucherType,
        voucherTypeCode: m.voucherTypeCode,
        voucherNumber: m.voucherNumber,
        instrumentNumber: m.instrumentNumber,
        instrumentDate: m.instrumentDate,
        deposit: roundMoney(m.deposit),
        withdrawal: roundMoney(m.withdrawal),
        ledgerName: acct.accountNickname,
        canEditVoucher: false,
        viewHref: `#recon-voucher:${bankAccountId}:${m.key}`,
        editHref: null,
      };
    });
}

export function loadRawBookTransactions(
  bankAccountId: string,
  dateFrom?: string,
  dateTo?: string,
): RawBookTransaction[] {
  if (isManualDemoAccount(bankAccountId)) {
    return loadManualDemoBooks(bankAccountId, dateFrom, dateTo);
  }

  if (typeof window !== "undefined") {
    ensureBankReconLedgerLinks();
    seedBankingDemoData();
  }
  const ledger = resolveCoaLedgerForV2BankAccount(bankAccountId);
  if (!ledger) return [];

  const rows = buildBookEntries([ledger], { dateFrom, dateTo });
  return rows.map((row: BookEntryRow) => {
    const voucher = voucherById(row.voucherId);
    const instrument = instrumentFromVoucher(voucher);
    const editable = voucher ? canEditVoucher(voucher) : false;
    return {
      id: bookTransactionId(bankAccountId, row.rowKey),
      bankAccountId,
      voucherId: row.voucherId,
      voucherDate: row.date,
      particulars: row.particulars,
      voucherType: row.voucherTypeLabel,
      voucherTypeCode: row.voucherType,
      voucherNumber: row.voucherNo,
      instrumentNumber: instrument.number,
      instrumentDate: instrument.date,
      deposit: roundMoney(row.receipt),
      withdrawal: roundMoney(row.payment),
      ledgerName: row.ledgerName,
      canEditVoucher: editable,
      viewHref: `/accounts/vouchers/view/${row.voucherId}`,
      editHref: editable ? `/accounts/vouchers/edit/${row.voucherId}` : null,
    };
  });
}

/**
 * Balance as per Books from overlay (manual demo) or linked COA ledger.
 * Returns null when the recon account has no linked ledger (UI must not display ₹0).
 */
export function getBookBalanceForAccount(bankAccountId: string): number | null {
  if (isManualDemoAccount(bankAccountId)) {
    return getManualDemoBookBalance(bankAccountId);
  }
  if (typeof window !== "undefined") {
    ensureBankReconLedgerLinks();
  }
  return getBookBalanceInfo(bankAccountId).bookBalance;
}

export function amountOf(row: { deposit: number; withdrawal: number }): number {
  return roundMoney(row.deposit || row.withdrawal);
}

export function directionOf(row: {
  deposit: number;
  withdrawal: number;
}): "deposit" | "withdrawal" {
  return row.deposit > 0 ? "deposit" : "withdrawal";
}
