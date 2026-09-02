import type { BalanceSide } from "@/lib/accounts/money-format";

export const CASH_BOOK_VOUCHER_TYPE_OPTIONS: { value: string; label: string }[] = [
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

export type CashBookRowKind = "opening" | "transaction";

export type CashBookSortKey = "date" | "voucherNo" | "voucherType" | "receipt" | "payment";

export interface CashBookLedgerOption {
  id: string;
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string;
  subGroupName?: string;
  subGroupCode?: string;
}

export interface CashBookDisplayRow {
  kind: CashBookRowKind;
  id: string;
  rowKey?: string;
  voucherId: string | null;
  date: string;
  voucherNo: string;
  voucherType: string;
  particular: string;
  particularLedgerId?: string | null;
  narration: string;
  reference: string;
  status: string;
  receipt: number;
  payment: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  voucherHref: string | null;
}

export interface CashBookSummary {
  ledgerId: string | null;
  ledgerName: string;
  ledgerCode?: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
}

export interface CashBookStatement {
  summary: CashBookSummary;
  openingRow: CashBookDisplayRow;
  transactionRows: CashBookDisplayRow[];
  displayRows: CashBookDisplayRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatCashBookDate(iso: string): string {
  if (!iso) return "—";
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  if (!y || !m || !d) return iso;
  const monthIdx = parseInt(m, 10) - 1;
  return `${d}-${MONTHS[monthIdx] || m}-${y}`;
}
