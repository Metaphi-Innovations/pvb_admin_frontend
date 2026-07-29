/**
 * Read-only Bank Reconciliation display helpers.
 * Single source of truth: BankReconTallyLink in localStorage.
 * Does not mutate vouchers, ledgers, or postings.
 */

import {
  getAllManualDemoMovements,
  getManualDemoAccount,
  manualDemoBookId,
  manualDemoVoucherId,
  type ManualDemoBookMovement,
} from "@/lib/accounts/bank-recon-manual-demo-overlay";
import {
  findActiveLinkForBook,
  loadTallyLinks,
} from "@/lib/accounts/bank-recon-tally-store";
import type { BankReconTallyLink } from "@/lib/accounts/bank-recon-tally-types";
import {
  loadVouchers,
  saveVouchers,
  type AccountingVoucher,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";

/** Marker so demo display stubs stay editable=false and out of posted ledgers. */
export const BANK_RECON_DEMO_VOUCHER_REF = "BANK-RECON-DEMO";

export interface BankReconDisplayInfo {
  statusLabel: "Reconciled" | "Unreconciled" | "Marked for Review";
  bankDate: string | null;
  reconciledBy: string | null;
  reconciledAt: string | null;
  linkId: string | null;
  isReconciled: boolean;
}

const UNRECONCILED_DISPLAY: BankReconDisplayInfo = {
  statusLabel: "Unreconciled",
  bankDate: null,
  reconciledBy: null,
  reconciledAt: null,
  linkId: null,
  isReconciled: false,
};

function fromLink(link: BankReconTallyLink | null | undefined): BankReconDisplayInfo {
  if (!link) return UNRECONCILED_DISPLAY;
  if (link.status === "RECONCILED") {
    return {
      statusLabel: "Reconciled",
      bankDate: link.bankDate,
      reconciledBy: link.reconciledBy,
      reconciledAt: link.reconciledAt,
      linkId: link.id,
      isReconciled: true,
    };
  }
  if (link.status === "MARKED_FOR_REVIEW") {
    return {
      statusLabel: "Marked for Review",
      bankDate: link.bankDate,
      reconciledBy: link.reconciledBy,
      reconciledAt: link.reconciledAt,
      linkId: link.id,
      isReconciled: false,
    };
  }
  return UNRECONCILED_DISPLAY;
}

function preferActiveLink(a: BankReconTallyLink, b: BankReconTallyLink): BankReconTallyLink {
  if (a.status === "RECONCILED" && b.status !== "RECONCILED") return a;
  if (b.status === "RECONCILED" && a.status !== "RECONCILED") return b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

/** Resolve display info from persisted tally links only. */
export function getBankReconDisplayForVoucher(opts: {
  voucherId?: number | null;
  voucherNumber?: string | null;
  bookTransactionId?: string | null;
}): BankReconDisplayInfo {
  if (typeof window === "undefined") return UNRECONCILED_DISPLAY;

  if (opts.bookTransactionId) {
    return fromLink(findActiveLinkForBook(opts.bookTransactionId));
  }

  const links = loadTallyLinks().filter(
    (l) => l.status === "RECONCILED" || l.status === "MARKED_FOR_REVIEW",
  );
  if (links.length === 0) return UNRECONCILED_DISPLAY;

  let match: BankReconTallyLink | undefined;

  if (opts.voucherId != null) {
    const byId = links.filter((l) => l.voucherId === opts.voucherId);
    if (byId.length > 0) {
      match = byId.reduce(preferActiveLink);
    }
  }

  if (!match && opts.voucherNumber?.trim()) {
    const needle = opts.voucherNumber.trim().toLowerCase();
    for (const m of getAllManualDemoMovements()) {
      if (m.voucherNumber.toLowerCase() !== needle) continue;
      const bookId = manualDemoBookId(m.bankAccountId, m.key);
      match = findActiveLinkForBook(bookId) ?? undefined;
      if (match) break;
    }
  }

  return fromLink(match);
}

export function formatBankReconAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function voucherTypeCode(m: ManualDemoBookMovement): VoucherTypeCode {
  const code = (m.voucherTypeCode || "").toLowerCase();
  if (code === "receipt" || code === "payment" || code === "contra" || code === "journal") {
    return code;
  }
  const label = m.voucherType.toLowerCase();
  if (label.includes("receipt")) return "receipt";
  if (label.includes("contra")) return "contra";
  if (label.includes("journal")) return "journal";
  return "payment";
}

function buildDemoLines(
  m: ManualDemoBookMovement,
  bankLabel: string,
): { lines: VoucherLine[]; totalDebit: number; totalCredit: number } {
  const amount = m.deposit || m.withdrawal;
  const type = voucherTypeCode(m);
  const partyName = m.particulars;
  const bankName = bankLabel;

  if (type === "receipt") {
    const lines: VoucherLine[] = [
      {
        id: 1,
        ledgerId: null,
        ledgerName: bankName,
        debit: amount,
        credit: 0,
        remarks: m.instrumentNumber || "",
      },
      {
        id: 2,
        ledgerId: null,
        ledgerName: partyName,
        debit: 0,
        credit: amount,
        remarks: m.narration || "",
      },
    ];
    return { lines, totalDebit: amount, totalCredit: amount };
  }

  if (type === "contra") {
    const lines: VoucherLine[] = [
      {
        id: 1,
        ledgerId: null,
        ledgerName: partyName,
        debit: amount,
        credit: 0,
        remarks: m.instrumentNumber || "",
      },
      {
        id: 2,
        ledgerId: null,
        ledgerName: bankName,
        debit: 0,
        credit: amount,
        remarks: m.narration || "",
      },
    ];
    return { lines, totalDebit: amount, totalCredit: amount };
  }

  // payment (default)
  const lines: VoucherLine[] = [
    {
      id: 1,
      ledgerId: null,
      ledgerName: partyName,
      debit: amount,
      credit: 0,
      remarks: m.narration || "",
    },
    {
      id: 2,
      ledgerId: null,
      ledgerName: bankName,
      debit: 0,
      credit: amount,
      remarks: m.instrumentNumber || "",
    },
  ];
  return { lines, totalDebit: amount, totalCredit: amount };
}

/**
 * Upsert draft Payment/Receipt/Contra stubs for recon overlay movements.
 * status=draft so they never enter GL / Bank Book running balances.
 */
export function ensureManualDemoDisplayVouchers(): void {
  if (typeof window === "undefined") return;

  const list = [...loadVouchers()];
  let changed = false;
  const byAccountIndex = new Map<string, number>();

  for (const m of getAllManualDemoMovements()) {
    const index = byAccountIndex.get(m.bankAccountId) ?? 0;
    byAccountIndex.set(m.bankAccountId, index + 1);
    const id = manualDemoVoucherId(m.bankAccountId, index);
    const acct = getManualDemoAccount(m.bankAccountId);
    const bankLabel = acct?.accountNickname || acct?.bankName || "Bank Account";
    const { lines, totalDebit, totalCredit } = buildDemoLines(m, bankLabel);
    const next: AccountingVoucher = {
      id,
      voucherType: voucherTypeCode(m),
      voucherNumber: m.voucherNumber,
      date: m.voucherDate,
      financialYearId: null,
      financialYearName: "",
      referenceNo: BANK_RECON_DEMO_VOUCHER_REF,
      narration: m.narration || m.particulars,
      lines,
      totalDebit,
      totalCredit,
      status: "draft",
      entryMode: "simple",
      paymentMode: m.instrumentNumber ? "Bank" : undefined,
      createdBy: "Admin User",
      updatedBy: "Admin User",
    };

    const existingIdx = list.findIndex((v) => v.id === id);
    if (existingIdx < 0) {
      list.push(next);
      changed = true;
      continue;
    }
    const existing = list[existingIdx]!;
    if (existing.referenceNo !== BANK_RECON_DEMO_VOUCHER_REF) continue;
    const same =
      existing.voucherNumber === next.voucherNumber &&
      existing.date === next.date &&
      existing.narration === next.narration &&
      existing.totalDebit === next.totalDebit &&
      existing.totalCredit === next.totalCredit &&
      existing.status === "draft";
    if (same) continue;
    list[existingIdx] = {
      ...existing,
      ...next,
      id: existing.id,
      status: "draft",
      referenceNo: BANK_RECON_DEMO_VOUCHER_REF,
    };
    changed = true;
  }

  if (changed) saveVouchers(list);
}

export function isBankReconDemoVoucher(voucher: {
  referenceNo?: string;
  id?: number;
}): boolean {
  if (voucher.referenceNo === BANK_RECON_DEMO_VOUCHER_REF) return true;
  const id = voucher.id;
  if (id == null) return false;
  return id >= 920_000 && id < 923_000;
}
