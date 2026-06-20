import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadChartOfAccounts, nextId } from "@/app/(app)/accounts/data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { listBankAccountSelectOptions } from "@/lib/accounts/bank-accounts-data";

export type FundTransferType =
  | "bank_to_bank"
  | "cash_to_bank"
  | "bank_to_cash"
  | "branch_transfer";

export type FundTransferStatus = "draft" | "posted" | "cancelled";

export interface FundTransferRecord {
  id: number;
  transferDate: string;
  transferType: FundTransferType;
  fromAccountId: number;
  fromAccountName: string;
  toAccountId: number;
  toAccountName: string;
  amount: number;
  referenceNumber: string;
  remarks: string;
  status: FundTransferStatus;
  voucherId: number | null;
  branch: string;
  createdBy: string;
  updatedBy: string;
}

export interface CreateFundTransferInput {
  transferDate: string;
  transferType: FundTransferType;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  referenceNumber: string;
  remarks: string;
  post?: boolean;
}

const STORAGE_KEY = "ds_accounts_fund_transfers_v1";

export const FUND_TRANSFER_TYPE_LABELS: Record<FundTransferType, string> = {
  bank_to_bank: "Bank to Bank",
  cash_to_bank: "Cash to Bank",
  bank_to_cash: "Bank to Cash",
  branch_transfer: "Branch Transfer",
};

function loadAll(): FundTransferRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FundTransferRecord[];
  } catch {
    return [];
  }
}

function saveAll(list: FundTransferRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function loadFundTransfers(): FundTransferRecord[] {
  return loadAll().sort((a, b) => b.transferDate.localeCompare(a.transferDate));
}

export function getFundTransferById(id: number): FundTransferRecord | undefined {
  return loadAll().find((t) => t.id === id);
}

export function listTransferAccountOptions(transferType: FundTransferType): {
  from: { id: number; label: string }[];
  to: { id: number; label: string }[];
} {
  const bankOptions = listBankAccountSelectOptions().map((b) => ({
    id: b.coaLedgerId,
    label: b.label,
  }));
  const cashOptions = getLedgersUnderSubGroupName("Cash-in-Hand").map((l) => ({
    id: l.id,
    label: l.accountName,
  }));

  switch (transferType) {
    case "bank_to_bank":
      return { from: bankOptions, to: bankOptions };
    case "cash_to_bank":
      return { from: cashOptions, to: bankOptions };
    case "bank_to_cash":
      return { from: bankOptions, to: cashOptions };
    case "branch_transfer":
      return { from: cashOptions, to: cashOptions };
  }
}

function resolveAccountName(ledgerId: number): string {
  const ledger = loadChartOfAccounts().find((r) => r.id === ledgerId);
  return ledger?.accountName ?? `Ledger #${ledgerId}`;
}

function generateReference(existing: FundTransferRecord[]): string {
  const nums = existing
    .map((t) => t.referenceNumber.match(/FT-(\d+)/)?.[1])
    .filter(Boolean)
    .map((n) => parseInt(n!, 10));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `FT-${String(next).padStart(4, "0")}`;
}

function postTransferVoucher(transfer: FundTransferRecord): AccountingVoucher {
  const voucher = createVoucher("contra", {
    date: transfer.transferDate,
    referenceNo: transfer.referenceNumber,
    narration: transfer.remarks || `Fund transfer ${transfer.fromAccountName} → ${transfer.toAccountName}`,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: transfer.toAccountId,
        ledgerName: transfer.toAccountName,
        debit: transfer.amount,
        credit: 0,
        remarks: `Transfer in — ${transfer.referenceNumber}`,
      },
      {
        id: 2,
        ledgerId: transfer.fromAccountId,
        ledgerName: transfer.fromAccountName,
        debit: 0,
        credit: transfer.amount,
        remarks: `Transfer out — ${transfer.referenceNumber}`,
      },
    ],
  });

  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucher.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber: transfer.referenceNumber };
    saveVouchers(list);
  }
  return { ...voucher, voucherNumber: transfer.referenceNumber };
}

export function createFundTransfer(input: CreateFundTransferInput): FundTransferRecord {
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("From and To accounts must be different.");
  }
  if (input.amount <= 0) throw new Error("Transfer amount must be greater than zero.");
  if (!input.transferDate) throw new Error("Transfer date is required.");

  const list = loadAll();
  const fromName = resolveAccountName(input.fromAccountId);
  const toName = resolveAccountName(input.toAccountId);

  const row: FundTransferRecord = {
    id: nextId(list),
    transferDate: input.transferDate,
    transferType: input.transferType,
    fromAccountId: input.fromAccountId,
    fromAccountName: fromName,
    toAccountId: input.toAccountId,
    toAccountName: toName,
    amount: input.amount,
    referenceNumber: input.referenceNumber.trim() || generateReference(list),
    remarks: input.remarks.trim(),
    status: input.post ? "posted" : "draft",
    voucherId: null,
    branch: "Head Office",
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };

  if (input.post) {
    const voucher = postTransferVoucher(row);
    row.voucherId = voucher.id;
    row.status = "posted";
  }

  list.push(row);
  saveAll(list);
  return row;
}

export function postFundTransfer(id: number): FundTransferRecord {
  const list = loadAll();
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Fund transfer not found.");
  const transfer = list[idx];
  if (transfer.status === "posted") return transfer;
  if (transfer.status === "cancelled") throw new Error("Cancelled transfers cannot be posted.");

  const voucher = postTransferVoucher(transfer);
  list[idx] = {
    ...transfer,
    status: "posted",
    voucherId: voucher.id,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  saveAll(list);
  return list[idx];
}

export function saveFundTransferSeed(records: FundTransferRecord[]): void {
  if (typeof window === "undefined") return;
  saveAll(records);
}
