/**
 * Read-only Accounting Impact documentation for Accounts transaction screens.
 * Developer guide only — does not drive posting, validation, or calculations.
 */

export type AccountingImpactDocKey =
  | "payment_voucher"
  | "receipt_voucher"
  | "contra_voucher"
  | "journal_voucher"
  | "sales_invoice"
  | "service_invoice"
  | "purchase_invoice"
  | "credit_note"
  | "debit_note"
  | "inventory_adjustment"
  | "bank_recon_adjustment";

export interface AccountingCoaPath {
  /** Primary head → … → leaf label (display tree). */
  path: string[];
  /** selected | system | master | voucher */
  origin?: "selected" | "system" | "master" | "voucher" | "auto";
}

export interface AccountingImpactDoc {
  title: string;
  /** Short note that this is documentation only. */
  docNote?: string;
  /** Journal-style entry lines, e.g. "Dr  Selected Bank / Cash Ledger". */
  entryLines: string[];
  /** Optional secondary entry block (e.g. COGS). */
  secondaryEntryTitle?: string;
  secondaryEntryLines?: string[];
  coaTrees: AccountingCoaPath[];
  reportsUpdated: string[];
  /** Where posting data / ledger identity comes from. */
  sources: string[];
}

const COMMON_REPORTS_CORE = [
  "Day Book",
  "Ledger",
  "Trial Balance",
] as const;

export const ACCOUNTING_IMPACT_DOCS: Record<AccountingImpactDocKey, AccountingImpactDoc> = {
  payment_voucher: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change voucher behaviour.",
    entryLines: [
      "Dr  Selected Vendor / Expense / Other Ledger",
      "Cr  Selected Bank / Cash Ledger",
    ],
    coaTrees: [
      {
        path: ["Expenses / Liabilities", "Selected Vendor / Expense / Payable"],
        origin: "selected",
      },
      {
        path: ["Assets", "Current Assets", "Bank Accounts / Cash-in-Hand", "Selected Bank / Cash"],
        origin: "selected",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Bank Book / Cash Book",
      "Balance Sheet",
      "Profit & Loss (expense payments)",
    ],
    sources: [
      "Bank / Cash Ledger → Bank Account Master or COA Cash-in-Hand",
      "Vendor Ledger → Vendor Master (Sundry Creditors)",
      "Expense / Other Ledger → COA (user-selected)",
      "Voucher Entry → Accounting Voucher (Payment)",
      "TDS (if applied) → TDS Master / TDS Payable COA",
    ],
  },

  receipt_voucher: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change voucher behaviour.",
    entryLines: [
      "Dr  Selected Bank / Cash Ledger",
      "Cr  Selected Customer / Income / Other Ledger",
    ],
    coaTrees: [
      {
        path: ["Assets", "Current Assets", "Bank Accounts / Cash-in-Hand", "Selected Bank / Cash"],
        origin: "selected",
      },
      {
        path: ["Assets / Income / Liabilities", "Selected Customer / Income / Other"],
        origin: "selected",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Bank Book / Cash Book",
      "Balance Sheet",
      "Profit & Loss (income receipts)",
    ],
    sources: [
      "Bank / Cash Ledger → Bank Account Master or COA Cash-in-Hand",
      "Customer Ledger → Customer Master (Sundry Debtors)",
      "Income / Other Ledger → COA (user-selected)",
      "Voucher Entry → Accounting Voucher (Receipt)",
    ],
  },

  contra_voucher: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change voucher behaviour.",
    entryLines: [
      "Dr  Destination Bank / Cash / OD / CC Ledger",
      "Cr  Source Bank / Cash / OD / CC Ledger",
    ],
    coaTrees: [
      {
        path: ["Assets", "Current Assets", "Bank / Cash / OD / CC", "Selected Destination Account"],
        origin: "selected",
      },
      {
        path: ["Assets", "Current Assets", "Bank / Cash / OD / CC", "Selected Source Account"],
        origin: "selected",
      },
    ],
    reportsUpdated: [...COMMON_REPORTS_CORE, "Bank Book / Cash Book", "Balance Sheet"],
    sources: [
      "Bank / Cash / OD / CC Ledgers → Bank Account Master or COA",
      "Voucher Entry → Accounting Voucher (Contra)",
    ],
  },

  journal_voucher: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change voucher behaviour.",
    entryLines: [
      "Dr  Selected Ledger(s) — user-entered lines",
      "Cr  Selected Ledger(s) — user-entered lines",
      "(Total Debit must equal Total Credit)",
    ],
    coaTrees: [
      {
        path: ["Any Primary Head", "Selected COA Ledger(s)"],
        origin: "selected",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Profit & Loss (P&L ledgers)",
      "Balance Sheet (BS ledgers)",
    ],
    sources: [
      "All ledgers → Chart of Accounts (user-selected)",
      "Voucher Entry → Accounting Voucher (Journal)",
    ],
  },

  sales_invoice: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change invoice behaviour.",
    entryLines: [
      "Dr  Customer (Sundry Debtors)",
      "Cr  Product Sales",
      "Cr  Output GST (CGST / SGST / IGST as applicable)",
    ],
    secondaryEntryTitle: "Inventory (COGS) — product sales only",
    secondaryEntryLines: [
      "Dr  Cost of Goods Sold",
      "Cr  Stock in Hand",
    ],
    coaTrees: [
      {
        path: ["Assets", "Current Assets", "Sundry Debtors", "Selected Customer"],
        origin: "master",
      },
      {
        path: ["Income", "Direct Income", "Sales", "Product Sales"],
        origin: "system",
      },
      {
        path: ["Liabilities", "Current Liabilities", "Duties & Taxes", "Output CGST / SGST / IGST"],
        origin: "system",
      },
      {
        path: ["Assets", "Current Assets", "Inventory", "Stock in Hand"],
        origin: "system",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Sales Register",
      "Profit & Loss",
      "Balance Sheet",
      "GST Summary / GSTR-1 (as applicable)",
    ],
    sources: [
      "Customer → Customer Master → Sundry Debtors ledger",
      "Product / Qty / Rate → Dispatch / Sales Order (goods invoice)",
      "GST rates → Product Master / line tax %",
      "Product Sales Ledger → System COA (sys:PRODUCT_SALES)",
      "Output GST → System COA (Duties & Taxes)",
      "Stock in Hand / COGS → System COA (inventory posting)",
    ],
  },

  service_invoice: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change invoice behaviour.",
    entryLines: [
      "Dr  Customer (Sundry Debtors)",
      "Cr  Service Income (or selected Income Ledger)",
      "Cr  Output GST (CGST / SGST / IGST as applicable)",
    ],
    coaTrees: [
      {
        path: ["Assets", "Current Assets", "Sundry Debtors", "Selected Customer"],
        origin: "master",
      },
      {
        path: ["Income", "Direct Income", "Service Revenue", "Service Income / Selected Income"],
        origin: "selected",
      },
      {
        path: ["Liabilities", "Current Liabilities", "Duties & Taxes", "Output CGST / SGST / IGST"],
        origin: "system",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Sales Register",
      "Profit & Loss",
      "Balance Sheet",
      "GST Summary (as applicable)",
    ],
    sources: [
      "Customer → Customer Master → Sundry Debtors ledger",
      "Service lines → Service Invoice entry (manual)",
      "Income Ledger → Selected Income ledger, or default Service Income under Service Revenue",
      "Output GST → System COA (Duties & Taxes)",
      "Never Product Sales; never auto-create General",
    ],
  },

  purchase_invoice: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change invoice behaviour.",
    entryLines: [
      "Dr  Stock in Hand (taxable purchase value)",
      "Dr  Input GST (CGST / SGST / IGST as applicable)",
      "Cr  Vendor (Sundry Creditors)",
    ],
    coaTrees: [
      {
        path: ["Assets", "Current Assets", "Inventory", "Stock in Hand"],
        origin: "system",
      },
      {
        path: ["Assets", "Current Assets", "Duties & Taxes", "Input CGST / SGST / IGST"],
        origin: "system",
      },
      {
        path: ["Liabilities", "Current Liabilities", "Sundry Creditors", "Selected Vendor"],
        origin: "master",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Purchase Register",
      "Profit & Loss",
      "Balance Sheet",
      "GST Summary / GSTR-2 (as applicable)",
    ],
    sources: [
      "Vendor → Vendor Master → Sundry Creditors ledger",
      "Purchase lines / Qty / Rate → PO / GRN / direct purchase entry",
      "Stock in Hand → System COA (sys:STOCK_IN_HAND)",
      "Input GST → System COA (Duties & Taxes)",
      "TDS (if applied) → TDS Master / TDS Payable COA",
    ],
  },

  credit_note: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change credit note behaviour.",
    entryLines: [
      "Dr  Product Sales / Sales Return (or adjustment / scheme expense ledger)",
      "Dr  Output GST (reversal as applicable)",
      "Cr  Customer (reduce receivable)",
    ],
    coaTrees: [
      {
        path: ["Income", "Direct Income", "Sales", "Product Sales (system)"],
        origin: "system",
      },
      {
        path: ["Liabilities", "Current Liabilities", "Duties & Taxes", "Output GST"],
        origin: "system",
      },
      {
        path: ["Assets", "Current Assets", "Sundry Debtors", "Selected Customer"],
        origin: "master",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Sales Register",
      "Profit & Loss",
      "Balance Sheet",
      "GST Summary (as applicable)",
    ],
    sources: [
      "Customer → Customer Master → Sundry Debtors ledger",
      "Against Sales Invoice → Sales Invoice module",
      "Product Sales / revenue reverse → System COA (sales_revenue → Product Sales)",
      "Output GST reverse → System COA",
      "Scheme / adjustment ledger → COA (when applicable)",
    ],
  },

  debit_note: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — does not post or change debit note behaviour.",
    entryLines: [
      "Dr  Vendor (reduce payable)",
      "Cr  Stock in Hand / Purchase return (or selected adjustment ledger)",
      "Cr  Input GST (reversal as applicable)",
    ],
    coaTrees: [
      {
        path: ["Liabilities", "Current Liabilities", "Sundry Creditors", "Selected Vendor"],
        origin: "master",
      },
      {
        path: ["Assets", "Current Assets", "Inventory", "Stock in Hand"],
        origin: "system",
      },
      {
        path: ["Assets", "Current Assets", "Duties & Taxes", "Input GST"],
        origin: "system",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Purchase Register",
      "Profit & Loss",
      "Balance Sheet",
      "GST Summary (as applicable)",
    ],
    sources: [
      "Vendor → Vendor Master → Sundry Creditors ledger",
      "Against Purchase Invoice / GRN → Purchase Invoice module",
      "Stock in Hand / purchase return → System COA (purchase_inventory)",
      "Input GST reverse → System COA",
      "Standalone adjustment ledger → COA (user-selected, when applicable)",
    ],
  },

  inventory_adjustment: {
    title: "Accounting Impact",
    docNote: "Documentation for developers — shown when stock reconciliation posts to accounts.",
    entryLines: [
      "Shortage:  Dr  Inventory Loss / Stock Adjustment Expense  ·  Cr  Stock in Hand",
      "Surplus:   Dr  Stock in Hand  ·  Cr  Stock Adjustment Gain / Other Income",
    ],
    coaTrees: [
      {
        path: ["Assets", "Current Assets", "Inventory", "Stock in Hand"],
        origin: "system",
      },
      {
        path: ["Expenses / Income", "Stock Adjustment Expense or Gain"],
        origin: "auto",
      },
    ],
    reportsUpdated: [...COMMON_REPORTS_CORE, "Profit & Loss", "Balance Sheet"],
    sources: [
      "Physical qty / variance → Warehouse Stock Reconciliation",
      "Stock in Hand → System COA (sys:STOCK_IN_HAND)",
      "Gain / Loss ledgers → COA (inventory accounting bootstrap)",
    ],
  },

  bank_recon_adjustment: {
    title: "Accounting Impact",
    docNote:
      "Documentation for developers — categorising an unmatched bank line creates a receipt, payment, contra, or journal voucher.",
    entryLines: [
      "Dr / Cr  Selected Bank Ledger (statement bank account)",
      "Dr / Cr  Selected Offset Ledger (depends on categorisation type)",
    ],
    coaTrees: [
      {
        path: ["Assets", "Current Assets", "Bank Accounts", "Reconciled Bank Ledger"],
        origin: "master",
      },
      {
        path: ["Offset account", "Selected Income / Expense / Party / Transfer Ledger"],
        origin: "selected",
      },
    ],
    reportsUpdated: [
      ...COMMON_REPORTS_CORE,
      "Bank Book",
      "Bank Reconciliation",
      "Balance Sheet",
    ],
    sources: [
      "Bank Ledger → Bank Account Master linked to statement",
      "Statement line → Bank Reconciliation import / workspace",
      "Offset ledger → user selection on Categorise / Add Transaction",
      "Posted voucher → Accounting Voucher (Receipt / Payment / Contra / Journal)",
    ],
  },
};

export function getAccountingImpactDoc(key: AccountingImpactDocKey): AccountingImpactDoc {
  return ACCOUNTING_IMPACT_DOCS[key];
}
