import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadChartOfAccounts, nextId, type ChartOfAccount } from "@/app/(app)/accounts/data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import {
  listBankAccountSelectOptions,
  loadBankAccountMasters,
} from "@/lib/accounts/bank-accounts-data";
import { isBankAccountLedger } from "@/lib/accounts/bank-coa-utils";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";

export type FundTransferMode =
  | "neft"
  | "rtgs"
  | "imps"
  | "upi"
  | "cheque"
  | "cash_deposit"
  | "cash_withdrawal";

export type FundTransferStatus = "completed" | "cancelled";

export interface FundTransferRecord {
  id: number;
  transferDate: string;
  transferNo: string;
  transferMode: FundTransferMode;
  fromAccountId: number;
  fromAccountName: string;
  toAccountId: number;
  toAccountName: string;
  amount: number;
  referenceNo: string;
  narration: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  status: FundTransferStatus;
  voucherId: number | null;
  financialYearId: number | null;
  createdBy: string;
  updatedBy: string;
  createdDate: string;
  updatedDate: string;
}

export interface CreateFundTransferInput {
  transferDate: string;
  transferMode: FundTransferMode;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  referenceNo: string;
  narration: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
}

export interface FundTransferFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  financialYearId?: number | "all";
  fromAccountId?: number | "all";
  toAccountId?: number | "all";
  transferMode?: FundTransferMode | "all";
}

export interface FundTransferAccountingLine {
  ledgerName: string;
  debit: number;
  credit: number;
}

const STORAGE_KEY = "ds_accounts_fund_transfers_v2";

export const FUND_TRANSFER_MODE_LABELS: Record<FundTransferMode, string> = {
  neft: "NEFT",
  rtgs: "RTGS",
  imps: "IMPS",
  upi: "UPI",
  cheque: "Cheque",
  cash_deposit: "Cash Deposit",
  cash_withdrawal: "Cash Withdrawal",
};

export const FUND_TRANSFER_MODES = Object.keys(FUND_TRANSFER_MODE_LABELS) as FundTransferMode[];

const REFERENCE_REQUIRED_MODES: FundTransferMode[] = ["neft", "rtgs", "imps", "upi", "cheque"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isCashLedger(ledger: ChartOfAccount): boolean {
  const cashIds = new Set(getLedgersUnderSubGroupName("Cash-in-Hand").map((l) => l.id));
  return cashIds.has(ledger.id);
}

export function formatTransferAccountName(ledgerId: number): string {
  const master = loadBankAccountMasters().find((m) => m.coaLedgerId === ledgerId);
  if (master) {
    const typeLabel =
      master.accountType === "OD"
        ? "OD Account"
        : master.accountType === "CC"
          ? "CC Account"
          : master.accountType === "Savings"
            ? "Savings Account"
            : "Current Account";
    return `${master.bankName} ${typeLabel}`;
  }

  const ledger = loadChartOfAccounts().find((r) => r.id === ledgerId);
  if (!ledger) return `Ledger #${ledgerId}`;
  if (ledger.accountName.toLowerCase().includes("petty")) return "Cash in Hand";
  return ledger.accountName;
}

export function listAllTransferAccountOptions(): { id: number; label: string }[] {
  const bankOptions = listBankAccountSelectOptions().map((b) => ({
    id: b.coaLedgerId,
    label: formatTransferAccountName(b.coaLedgerId),
  }));
  const cashOptions = getLedgersUnderSubGroupName("Cash-in-Hand").map((l) => ({
    id: l.id,
    label: formatTransferAccountName(l.id),
  }));
  const seen = new Set<number>();
  return [...bankOptions, ...cashOptions].filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

export function listTransferAccountOptions(mode: FundTransferMode): {
  from: { id: number; label: string }[];
  to: { id: number; label: string }[];
} {
  const bankOptions = listBankAccountSelectOptions().map((b) => ({
    id: b.coaLedgerId,
    label: formatTransferAccountName(b.coaLedgerId),
  }));
  const cashOptions = getLedgersUnderSubGroupName("Cash-in-Hand").map((l) => ({
    id: l.id,
    label: formatTransferAccountName(l.id),
  }));

  switch (mode) {
    case "cash_deposit":
      return { from: cashOptions, to: bankOptions };
    case "cash_withdrawal":
      return { from: bankOptions, to: cashOptions };
    default:
      return { from: bankOptions, to: bankOptions };
  }
}

export function getAvailableTransferBalance(ledgerId: number): number {
  const ledger = loadChartOfAccounts().find((r) => r.id === ledgerId);
  if (!ledger) return 0;
  const bal = computeLedgerCurrentBalance(ledger);
  return bal.balanceType === "Debit" ? bal.amount : 0;
}

function resolveFinancialYearId(date: string): number | null {
  const fy = loadFinancialYears().find((y) => date >= y.startDate && date <= y.endDate);
  return fy?.id ?? null;
}

function normalizeLegacyRecord(raw: Record<string, unknown>): FundTransferRecord | null {
  if (!raw.id || !raw.transferDate) return null;

  const legacyType = raw.transferType as string | undefined;
  const legacyStatus = raw.status as string | undefined;
  const legacyMode = raw.transferMode as FundTransferMode | undefined;

  let transferMode: FundTransferMode = legacyMode ?? "neft";
  if (!legacyMode && legacyType) {
    if (legacyType === "cash_to_bank") transferMode = "cash_deposit";
    else if (legacyType === "bank_to_cash") transferMode = "cash_withdrawal";
    else transferMode = "neft";
  }

  const status: FundTransferStatus = legacyStatus === "cancelled" ? "cancelled" : "completed";

  const transferNo =
    (raw.transferNo as string) ||
    (raw.referenceNumber as string) ||
    generateTransferNo([]);

  return {
    id: Number(raw.id),
    transferDate: String(raw.transferDate),
    transferNo,
    transferMode,
    fromAccountId: Number(raw.fromAccountId),
    fromAccountName: String(raw.fromAccountName ?? formatTransferAccountName(Number(raw.fromAccountId))),
    toAccountId: Number(raw.toAccountId),
    toAccountName: String(raw.toAccountName ?? formatTransferAccountName(Number(raw.toAccountId))),
    amount: Number(raw.amount),
    referenceNo: String(raw.referenceNo ?? raw.referenceNumber ?? ""),
    narration: String(raw.narration ?? raw.remarks ?? ""),
    attachmentName: raw.attachmentName as string | undefined,
    attachmentDataUrl: raw.attachmentDataUrl as string | undefined,
    status,
    voucherId: raw.voucherId != null ? Number(raw.voucherId) : null,
    financialYearId:
      raw.financialYearId != null
        ? Number(raw.financialYearId)
        : resolveFinancialYearId(String(raw.transferDate)),
    createdBy: String(raw.createdBy ?? ACCOUNTS_CURRENT_USER),
    updatedBy: String(raw.updatedBy ?? ACCOUNTS_CURRENT_USER),
    createdDate: String(raw.createdDate ?? raw.transferDate ?? todayStr()),
    updatedDate: String(raw.updatedDate ?? raw.transferDate ?? todayStr()),
  };
}

function loadAll(): FundTransferRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return parsed
      .map((item) => normalizeLegacyRecord(item as Record<string, unknown>))
      .filter((r): r is FundTransferRecord => r != null);
  } catch {
    return [];
  }
}

function saveAll(list: FundTransferRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function loadFundTransfers(): FundTransferRecord[] {
  return loadAll().sort((a, b) => {
    const dateCmp = b.transferDate.localeCompare(a.transferDate);
    if (dateCmp !== 0) return dateCmp;
    return b.transferNo.localeCompare(a.transferNo);
  });
}

export function getFundTransferById(id: number): FundTransferRecord | undefined {
  return loadAll().find((t) => t.id === id);
}

export function generateTransferNo(existing?: FundTransferRecord[]): string {
  const list = existing ?? loadAll();
  const nums = list
    .map((t) => t.transferNo.match(/FT-(\d+)/)?.[1])
    .filter(Boolean)
    .map((n) => parseInt(n!, 10));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `FT-${String(next).padStart(4, "0")}`;
}

export function peekNextTransferNo(): string {
  return generateTransferNo();
}

export function validateFundTransferInput(
  input: CreateFundTransferInput,
  options?: { skipBalanceCheck?: boolean },
): string | null {
  if (!input.transferDate) return "Transfer date is required.";
  if (!input.fromAccountId || !input.toAccountId) return "From Account and To Account are required.";
  if (input.fromAccountId === input.toAccountId) return "From Account and To Account cannot be the same.";
  if (!input.amount || input.amount <= 0) return "Amount must be greater than zero.";

  const fromLedger = loadChartOfAccounts().find((r) => r.id === input.fromAccountId);
  const toLedger = loadChartOfAccounts().find((r) => r.id === input.toAccountId);
  if (!fromLedger || !toLedger) return "Selected account could not be found.";

  const fromIsCash = isCashLedger(fromLedger);
  const fromIsBank = isBankAccountLedger(fromLedger);
  const toIsCash = isCashLedger(toLedger);
  const toIsBank = isBankAccountLedger(toLedger);

  if (input.transferMode === "cash_deposit") {
    if (!fromIsCash || !toIsBank) {
      return "Cash Deposit requires From Account as Cash and To Account as Bank.";
    }
  } else if (input.transferMode === "cash_withdrawal") {
    if (!fromIsBank || !toIsCash) {
      return "Cash Withdrawal requires From Account as Bank and To Account as Cash.";
    }
  } else {
    if (!fromIsBank || !toIsBank) {
      return "This transfer mode requires both accounts to be bank accounts.";
    }
  }

  if (REFERENCE_REQUIRED_MODES.includes(input.transferMode) && !input.referenceNo.trim()) {
    return `Reference No. is required for ${FUND_TRANSFER_MODE_LABELS[input.transferMode]}.`;
  }

  if (!options?.skipBalanceCheck) {
    const available = getAvailableTransferBalance(input.fromAccountId);
    if (input.amount > available) {
      return `Insufficient balance in ${formatTransferAccountName(input.fromAccountId)}. Available: ₹${available.toLocaleString("en-IN")}.`;
    }
  }

  return null;
}

function postTransferVoucher(transfer: FundTransferRecord): AccountingVoucher {
  const voucher = createVoucher("contra", {
    date: transfer.transferDate,
    referenceNo: transfer.referenceNo || transfer.transferNo,
    narration:
      transfer.narration ||
      `Fund transfer ${transfer.fromAccountName} → ${transfer.toAccountName}`,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: transfer.toAccountId,
        ledgerName: transfer.toAccountName,
        debit: transfer.amount,
        credit: 0,
        remarks: `Transfer in — ${transfer.transferNo}`,
      },
      {
        id: 2,
        ledgerId: transfer.fromAccountId,
        ledgerName: transfer.fromAccountName,
        debit: 0,
        credit: transfer.amount,
        remarks: `Transfer out — ${transfer.transferNo}`,
      },
    ],
  });

  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucher.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber: transfer.transferNo };
    saveVouchers(list);
  }
  return { ...voucher, voucherNumber: transfer.transferNo };
}

export function buildAccountingEntryPreview(
  transfer: Pick<
    FundTransferRecord,
    "fromAccountName" | "toAccountName" | "amount"
  >,
): FundTransferAccountingLine[] {
  return [
    { ledgerName: transfer.toAccountName, debit: transfer.amount, credit: 0 },
    { ledgerName: transfer.fromAccountName, debit: 0, credit: transfer.amount },
  ];
}

export function filterFundTransfers(
  records: FundTransferRecord[],
  filters: FundTransferFilters,
): FundTransferRecord[] {
  const q = filters.search?.trim().toLowerCase() ?? "";

  return records.filter((r) => {
    if (filters.dateFrom && r.transferDate < filters.dateFrom) return false;
    if (filters.dateTo && r.transferDate > filters.dateTo) return false;
    if (
      filters.financialYearId &&
      filters.financialYearId !== "all" &&
      r.financialYearId !== filters.financialYearId
    ) {
      return false;
    }
    if (
      filters.fromAccountId &&
      filters.fromAccountId !== "all" &&
      r.fromAccountId !== filters.fromAccountId
    ) {
      return false;
    }
    if (
      filters.toAccountId &&
      filters.toAccountId !== "all" &&
      r.toAccountId !== filters.toAccountId
    ) {
      return false;
    }
    if (
      filters.transferMode &&
      filters.transferMode !== "all" &&
      r.transferMode !== filters.transferMode
    ) {
      return false;
    }
    if (q) {
      const haystack = [
        r.transferNo,
        r.referenceNo,
        r.fromAccountName,
        r.toAccountName,
        r.narration,
        FUND_TRANSFER_MODE_LABELS[r.transferMode],
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export type FundTransferSortKey =
  | "transferDate"
  | "transferNo"
  | "fromAccountName"
  | "toAccountName"
  | "amount"
  | "transferMode"
  | "referenceNo"
  | "status";

export function sortFundTransfers(
  records: FundTransferRecord[],
  sortKey: FundTransferSortKey,
  sortDir: "asc" | "desc",
): FundTransferRecord[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortKey];
    const bv = (b as unknown as Record<string, unknown>)[sortKey];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });
}

export function createFundTransfer(input: CreateFundTransferInput): FundTransferRecord {
  const validationError = validateFundTransferInput(input);
  if (validationError) throw new Error(validationError);

  const list = loadAll();
  const fromName = formatTransferAccountName(input.fromAccountId);
  const toName = formatTransferAccountName(input.toAccountId);
  const now = todayStr();

  const row: FundTransferRecord = {
    id: nextId(list),
    transferDate: input.transferDate,
    transferNo: generateTransferNo(list),
    transferMode: input.transferMode,
    fromAccountId: input.fromAccountId,
    fromAccountName: fromName,
    toAccountId: input.toAccountId,
    toAccountName: toName,
    amount: input.amount,
    referenceNo: input.referenceNo.trim(),
    narration: input.narration.trim(),
    attachmentName: input.attachmentName,
    attachmentDataUrl: input.attachmentDataUrl,
    status: "completed",
    voucherId: null,
    financialYearId: resolveFinancialYearId(input.transferDate),
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdDate: now,
    updatedDate: now,
  };

  const voucher = postTransferVoucher(row);
  row.voucherId = voucher.id;

  list.push(row);
  saveAll(list);
  return row;
}

export function saveFundTransferSeed(records: FundTransferRecord[]): void {
  if (typeof window === "undefined") return;
  saveAll(records);
}

/** @deprecated Use FUND_TRANSFER_MODE_LABELS */
export const FUND_TRANSFER_TYPE_LABELS = FUND_TRANSFER_MODE_LABELS;

/** @deprecated Use FundTransferMode */
export type FundTransferType = FundTransferMode;
