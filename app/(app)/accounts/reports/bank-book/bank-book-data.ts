import type { BalanceSide } from "@/lib/accounts/money-format";

export const BANK_BOOK_VOUCHER_TYPES = [
  "Opening Balance",
  "Receipt Voucher",
  "Payment Voucher",
  "Contra Voucher",
  "Journal Voucher",
  "Sales Voucher",
  "Purchase Voucher",
  "Debit Note",
  "Credit Note",
  "Fund Transfer",
] as const;

export type BankBookVoucherType = (typeof BANK_BOOK_VOUCHER_TYPES)[number] | string;

export const BANK_BOOK_VOUCHER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "RECEIPT", label: "Receipt Voucher" },
  { value: "PAYMENT", label: "Payment Voucher" },
  { value: "CONTRA", label: "Contra Voucher" },
  { value: "SALES", label: "Sales Voucher" },
  { value: "PURCHASE", label: "Purchase Voucher" },
  { value: "JOURNAL", label: "Journal Voucher" },
  { value: "DEBIT_NOTE", label: "Debit Note" },
  { value: "CREDIT_NOTE", label: "Credit Note" },
];

export type BankBookSortKey = "date" | "voucherNo" | "voucherType" | "receipt" | "payment";

export type BankBookRowKind = "opening" | "transaction";

export interface BankBookAccountOption {
  bankAccountId: string;
  ledgerId: string;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  maskedAccountNumber: string;
  label: string;
}

export interface BankBookDisplayRow {
  kind: BankBookRowKind;
  rowKey: string;
  voucherId: string | null;
  date: string;
  voucherType: string;
  voucherNo: string;
  particular: string;
  particularLedgerId: string | null;
  narration: string;
  reference: string;
  status: string;
  receipt: number;
  payment: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  bankDate: string | null;
  reconStatus: string;
  voucherHref: string | null;
}

export interface BankBookSummary {
  bankAccountId: string | null;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  maskedAccountNumber: string;
  ledgerId: string | null;
  ledgerName: string | null;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
}

export interface BankBookStatement {
  summary: BankBookSummary;
  openingRow: BankBookDisplayRow;
  transactionRows: BankBookDisplayRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatBankBookDate(iso: string): string {
  if (!iso) return "—";
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  if (!y || !m || !d) return iso;
  const monthIdx = parseInt(m, 10) - 1;
  return `${d}-${MONTHS[monthIdx] || m}-${y}`;
}

export function maskAccountNumber(acc: string): string {
  if (!acc) return "—";
  const clean = acc.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}
