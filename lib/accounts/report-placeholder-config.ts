import type { AccountsReportPlaceholderConfig } from "@/components/accounts/AccountsReportPlaceholderClient";

export const CUSTOMER_LEDGER_REPORT: AccountsReportPlaceholderConfig = {
  title: "Customer Ledger",
  description: "Party-wise customer account ledger with voucher-wise debit and credit entries.",
  searchPlaceholder: "Customer, voucher no., reference…",
  columns: [
    { key: "date", label: "Date" },
    { key: "voucherNo", label: "Voucher No.", mono: true },
    { key: "particulars", label: "Particulars" },
    { key: "debit", label: "Debit", align: "right", money: true },
    { key: "credit", label: "Credit", align: "right", money: true },
    { key: "balance", label: "Balance", align: "right", money: true },
  ],
};

export const SUPPLIER_LEDGER_REPORT: AccountsReportPlaceholderConfig = {
  title: "Supplier Ledger",
  description: "Party-wise supplier account ledger with voucher-wise debit and credit entries.",
  searchPlaceholder: "Supplier, voucher no., reference…",
  columns: [
    { key: "date", label: "Date" },
    { key: "voucherNo", label: "Voucher No.", mono: true },
    { key: "particulars", label: "Particulars" },
    { key: "debit", label: "Debit", align: "right", money: true },
    { key: "credit", label: "Credit", align: "right", money: true },
    { key: "balance", label: "Balance", align: "right", money: true },
  ],
};

export const JOURNAL_REGISTER_REPORT: AccountsReportPlaceholderConfig = {
  title: "Journal Register",
  description: "Register of all journal vouchers with ledger-wise debit and credit lines.",
  searchPlaceholder: "Voucher no., ledger, narration…",
  columns: [
    { key: "date", label: "Date" },
    { key: "voucherNo", label: "Voucher No.", mono: true },
    { key: "ledger", label: "Ledger" },
    { key: "debit", label: "Debit", align: "right", money: true },
    { key: "credit", label: "Credit", align: "right", money: true },
    { key: "narration", label: "Narration" },
  ],
};

export const STOCK_LEDGER_REPORT: AccountsReportPlaceholderConfig = {
  title: "Stock Ledger",
  description: "Item-wise stock movement register with inward, outward and running balance.",
  searchPlaceholder: "Item, batch, voucher no.…",
  columns: [
    { key: "date", label: "Date" },
    { key: "voucherNo", label: "Voucher No.", mono: true },
    { key: "item", label: "Item" },
    { key: "inQty", label: "In Qty", align: "right" },
    { key: "outQty", label: "Out Qty", align: "right" },
    { key: "balanceQty", label: "Balance Qty", align: "right" },
    { key: "value", label: "Value", align: "right", money: true },
  ],
};
export const AUDIT_TRAIL_REPORT: AccountsReportPlaceholderConfig = {
  title: "Audit Trail",
  description: "Chronological log of accounting actions, approvals and data changes.",
  searchPlaceholder: "User, module, reference, action…",
  columns: [
    { key: "dateTime", label: "Date & Time" },
    { key: "user", label: "User" },
    { key: "module", label: "Module" },
    { key: "action", label: "Action" },
    { key: "reference", label: "Reference", mono: true },
    { key: "details", label: "Details" },
  ],
};
