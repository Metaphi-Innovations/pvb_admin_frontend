import type { AccountsReportPlaceholderConfig } from "@/components/accounts/AccountsReportPlaceholderClient";

export const STOCK_REGISTER_REPORT: AccountsReportPlaceholderConfig = {
  title: "Stock Register",
  description: "Stock summary, detailed batch movement, and batch-wise transaction register.",
  searchPlaceholder: "Product, batch, voucher no.…",
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

/** @deprecated Use STOCK_REGISTER_REPORT — Stock Ledger folded into Stock Register Batch Wise. */
export const STOCK_LEDGER_REPORT = STOCK_REGISTER_REPORT;
export const AUDIT_TRAIL_REPORT: AccountsReportPlaceholderConfig = {
  title: "Audit Trail",
  description: "Voucher alteration register — created, modified and deleted accounting entries.",
  searchPlaceholder: "Voucher no., particular, user…",
  columns: [
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "voucherType", label: "Voucher Type" },
    { key: "voucherNo", label: "Voucher No.", mono: true },
    { key: "user", label: "User" },
    { key: "action", label: "Action" },
    { key: "particular", label: "Particular" },
    { key: "beforeAlteration", label: "Before Alteration" },
    { key: "afterAlteration", label: "After Alteration" },
    { key: "status", label: "Status" },
  ],
};
