import type { LucideIcon } from "lucide-react";

import {

  ArrowLeftRight,

  Banknote,

  BarChart3,

  BookMarked,

  BookOpen,

  Building2,

  CalendarRange,

  ClipboardList,

  CreditCard,

  FileSpreadsheet,

  FileText,

  FolderTree,

  Landmark,

  Layers,

  NotebookPen,

  Package,

  Receipt,

  Scale,

  Settings,

  ShoppingBag,

  ShoppingCart,

  Tags,

  TrendingUp,

  Truck,

  Users,

  Wallet,

  Boxes,

  ClipboardCheck,

} from "lucide-react";



export const CHART_OF_ACCOUNTS_HREF = "/accounts/masters/chart-of-accounts";

export const ACCOUNTS_HOME_HREF = CHART_OF_ACCOUNTS_HREF;

export const ACCOUNTING_SETTINGS_HREF = "/accounts/settings";

export const VOUCHERS_HUB_HREF = "/accounts/vouchers";

export const JOURNAL_VOUCHER_HREF = "/accounts/vouchers/journal";

export const REPORTS_HOME_HREF = "/accounts/reports/trial-balance";



export interface AccountsNavLink {

  label: string;

  href: string;

  icon: LucideIcon;

}



export type AccountsNavGroupId = "masters" | "transactions" | "receivables" | "payables" | "banking" | "reports";



export interface AccountsNavGroup {

  id: AccountsNavGroupId;

  label: string;

  icon: LucideIcon;

  items: AccountsNavLink[];

}



/** Setup screens reachable only via Masters → Accounting Settings (routes unchanged). */

export const ACCOUNTING_SETTINGS_SETUP_LINKS: AccountsNavLink[] = [

  { label: "Financial Years", href: "/accounts/masters/financial-years", icon: CalendarRange },

  { label: "Voucher Types", href: "/accounts/masters/voucher-types", icon: Tags },

  { label: "GST Settings", href: "/settings/gst-tax-configuration", icon: Layers },

  { label: "TDS Settings", href: "/masters/tds", icon: Receipt },

  { label: "Voucher Numbering", href: "/accounts/masters/voucher-types", icon: Tags },

  { label: "Posting Defaults", href: `${ACCOUNTING_SETTINGS_HREF}#posting-defaults`, icon: Settings },

  { label: "Accounting Preferences", href: `${ACCOUNTING_SETTINGS_HREF}#accounting-preferences`, icon: Settings },

];



export const VOUCHER_NAV_ITEMS: AccountsNavLink[] = [

  { label: "Receipt Voucher", href: "/accounts/vouchers?tab=receipt", icon: Wallet },

  { label: "Payment Voucher", href: "/accounts/vouchers?tab=payment", icon: CreditCard },

  { label: "Journal Voucher", href: JOURNAL_VOUCHER_HREF, icon: NotebookPen },

  { label: "Contra Voucher", href: "/accounts/vouchers?tab=contra", icon: ArrowLeftRight },

];



export const LEDGERS_NAV_ITEMS: AccountsNavLink[] = [

  { label: "All Ledgers", href: "/accounts/masters/ledgers", icon: BookMarked },

];



export const SALES_NAV_ITEMS: AccountsNavLink[] = [

  { label: "Pending Tax Invoices", href: "/accounts/sales/pending-tax-invoices", icon: ClipboardList },

  { label: "Sales Invoices", href: "/accounts/transactions/invoices", icon: FileText },

  { label: "Sales Register", href: "/accounts/reports/sales-register", icon: Receipt },

  { label: "Customer Outstanding", href: "/accounts/receivables/outstanding", icon: Users },

];



/** Trimmed sales sidebar (no COA tree on sales screens) */
export const SALES_SIDEBAR_ITEMS: AccountsNavLink[] = [
  { label: "Pending Tax Invoices", href: "/accounts/sales/pending-tax-invoices", icon: ClipboardList },
  { label: "Sales Invoices", href: "/accounts/transactions/invoices", icon: FileText },
  { label: "Customer Outstanding", href: "/accounts/receivables/outstanding", icon: Users },
  { label: "Credit Notes", href: "/accounts/transactions/credit-notes", icon: Receipt },
];

/** Trimmed purchases sidebar */
export const PURCHASES_SIDEBAR_ITEMS: AccountsNavLink[] = [
  { label: "Pending Supplier Bills", href: "/accounts/purchases/pending-vendor-bills", icon: ClipboardList },
  { label: "Purchase Invoices", href: "/accounts/purchase-invoices", icon: Truck },
  { label: "Supplier Outstanding", href: "/accounts/payables/outstanding", icon: Truck },
  { label: "Debit Notes", href: "/accounts/transactions/debit-notes", icon: FileText },
];

/** Trimmed vouchers sidebar */
export const VOUCHERS_SIDEBAR_ITEMS: AccountsNavLink[] = VOUCHER_NAV_ITEMS;

export type ContextualSidebarId = "sales" | "purchases" | "vouchers" | "claims";

export function isSalesContextRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/accounts/sales/") ||
    pathname.startsWith("/accounts/transactions/invoices") ||
    pathname.startsWith("/accounts/receivables/") ||
    pathname.startsWith("/accounts/transactions/credit-notes")
  );
}

export function isPurchasesContextRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/accounts/purchases/") ||
    pathname.startsWith("/accounts/purchase-invoices") ||
    pathname.startsWith("/accounts/payables/") ||
    pathname.startsWith("/accounts/transactions/debit-notes")
  );
}

export function isVouchersContextRoute(pathname: string): boolean {
  return pathname.startsWith("/accounts/vouchers");
}

export function isClaimsContextRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/accounts/claims") ||
    pathname.startsWith("/accounts/purchases/hr-claims") ||
    pathname.startsWith("/accounts/transactions/expenses")
  );
}

export function resolveContextualSidebar(pathname: string): ContextualSidebarId | null {
  if (isSalesContextRoute(pathname)) return "sales";
  if (isPurchasesContextRoute(pathname)) return "purchases";
  if (isVouchersContextRoute(pathname)) return "vouchers";
  if (isClaimsContextRoute(pathname)) return "claims";
  return null;
}

/** @deprecated Use isSalesContextRoute */
export function isSalesAccountsRoute(pathname: string): boolean {
  return isSalesContextRoute(pathname);
}

export function isChartOfAccountsRoute(pathname: string): boolean {
  return pathname === CHART_OF_ACCOUNTS_HREF || pathname.startsWith(`${CHART_OF_ACCOUNTS_HREF}/`);
}



export const PURCHASES_NAV_ITEMS: AccountsNavLink[] = [

  { label: "Pending Supplier Bills", href: "/accounts/purchases/pending-vendor-bills", icon: ClipboardList },

  { label: "Purchase Invoices", href: "/accounts/purchase-invoices", icon: Truck },

  { label: "Purchase Register", href: "/accounts/reports/purchase-register", icon: Receipt },

  { label: "Supplier Outstanding", href: "/accounts/payables/outstanding", icon: Truck },

];



export const INVENTORY_NAV_ITEMS: AccountsNavLink[] = [

  { label: "Items", href: "/accounts/masters/items", icon: Package },

  { label: "Stock Opening", href: "/accounts/masters/stock-opening", icon: Boxes },

  { label: "Stock Valuation", href: "/accounts/reports/stock-valuation", icon: BarChart3 },

  { label: "Inventory Register", href: "/accounts/reports/inventory-register", icon: BookOpen },

];



export const CLAIMS_NAV_ITEMS: AccountsNavLink[] = [

  { label: "Pending Claims", href: "/accounts/claims?tab=pending", icon: ClipboardList },

  { label: "Claims Payable", href: "/accounts/claims?tab=payable", icon: Wallet },

  { label: "Paid Claims", href: "/accounts/claims?tab=paid", icon: Wallet },

];



/** Trimmed claims sidebar */
export const CLAIMS_SIDEBAR_ITEMS: AccountsNavLink[] = [
  ...CLAIMS_NAV_ITEMS,
  { label: "Claims Payment", href: "/accounts/transactions/expenses", icon: Wallet },
];



export const BANKING_NAV_ITEMS: AccountsNavLink[] = [

  { label: "Bank Book", href: "/accounts/reports/bank-book", icon: BookOpen },

  { label: "Cash Book", href: "/accounts/reports/cash-book", icon: Banknote },

  { label: "Bank Reconciliation", href: "/accounts/banking/reconciliation", icon: Scale },

];



export const REPORTS_NAV_ITEMS: AccountsNavLink[] = [

  { label: "Trial Balance", href: "/accounts/reports/trial-balance", icon: Scale },

  { label: "Profit & Loss", href: "/accounts/reports/pl", icon: TrendingUp },

  { label: "Balance Sheet", href: "/accounts/reports/balance-sheet", icon: FileSpreadsheet },

  { label: "Customer Outstanding", href: "/accounts/receivables/outstanding", icon: Users },

  { label: "GST Summary", href: "/accounts/reports/gst", icon: Layers },

  { label: "Sales Register", href: "/accounts/reports/sales-register", icon: Receipt },

  { label: "Purchase Register", href: "/accounts/reports/purchase-register", icon: Receipt },

  { label: "Stock Valuation", href: "/accounts/reports/stock-valuation", icon: BarChart3 },

  { label: "Claims Register", href: "/accounts/claims?tab=paid", icon: ClipboardCheck },

];



/** Demo accounting menu — Masters */
export const ACCOUNTS_MASTERS_NAV: AccountsNavLink[] = [
  { label: "Chart of Accounts", href: CHART_OF_ACCOUNTS_HREF, icon: FolderTree },
  { label: "Ledgers", href: "/accounts/masters/ledgers", icon: BookMarked },
];

/** Demo accounting menu — Transactions */
export const ACCOUNTS_TRANSACTIONS_NAV: AccountsNavLink[] = [
  { label: "Pending Invoices", href: "/accounts/sales/pending-tax-invoices", icon: ClipboardList },
  { label: "Sales Invoice", href: "/accounts/transactions/invoices", icon: FileText },
  { label: "Purchase Invoice", href: "/accounts/purchase-invoices", icon: Truck },
  { label: "Credit Note", href: "/accounts/transactions/credit-notes", icon: Receipt },
  { label: "Debit Note", href: "/accounts/transactions/debit-notes", icon: FileText },
  { label: "Receipt Voucher", href: "/accounts/vouchers?tab=receipt", icon: Wallet },
  { label: "Payment Voucher", href: "/accounts/vouchers?tab=payment", icon: CreditCard },
  { label: "Journal Voucher", href: JOURNAL_VOUCHER_HREF, icon: NotebookPen },
  { label: "Contra Voucher", href: "/accounts/vouchers?tab=contra", icon: ArrowLeftRight },
];

/** Demo accounting menu — Receivables */
export const ACCOUNTS_RECEIVABLES_NAV: AccountsNavLink[] = [
  { label: "Customer Outstanding", href: "/accounts/receivables/outstanding", icon: Users },
  { label: "Customer Ageing", href: "/accounts/receivables/ageing", icon: CalendarRange },
  { label: "Collection Tracking", href: "/accounts/receivables/collections", icon: TrendingUp },
  { label: "Receipt Allocation", href: "/accounts/receivables/receipt-allocation", icon: Receipt },
];

/** Demo accounting menu — Payables */
export const ACCOUNTS_PAYABLES_NAV: AccountsNavLink[] = [
  { label: "Supplier Outstanding", href: "/accounts/payables/outstanding", icon: Truck },
  { label: "Supplier Ageing", href: "/accounts/payables/ageing", icon: CalendarRange },
];

/** Demo accounting menu — Banking */
export const ACCOUNTS_BANKING_NAV: AccountsNavLink[] = [
  { label: "Bank Accounts", href: "/accounts/banking/bank-accounts", icon: Landmark },
  { label: "Bank Book", href: "/accounts/reports/bank-book", icon: BookOpen },
  { label: "Cash Book", href: "/accounts/reports/cash-book", icon: Banknote },
  { label: "Fund Transfer", href: "/accounts/banking/fund-transfer", icon: ArrowLeftRight },
  { label: "Bank Reconciliation", href: "/accounts/banking/reconciliation", icon: Scale },
];

/** Demo accounting menu — Reports */
export const ACCOUNTS_REPORTS_NAV: AccountsNavLink[] = [
  { label: "Trial Balance", href: "/accounts/reports/trial-balance", icon: Scale },
  { label: "Profit & Loss", href: "/accounts/reports/pl", icon: TrendingUp },
  { label: "Balance Sheet", href: "/accounts/reports/balance-sheet", icon: FileSpreadsheet },
  { label: "Cash Flow", href: "/accounts/reports/cash-flow", icon: TrendingUp },
  { label: "General Ledger", href: "/accounts/reports/ledger", icon: BookOpen },
  { label: "Day Book", href: "/accounts/reports/day-book", icon: BookMarked },
  { label: "GST Summary", href: "/accounts/reports/gst", icon: Layers },
  { label: "Sales Register", href: "/accounts/reports/sales-register", icon: Receipt },
  { label: "Purchase Register", href: "/accounts/reports/purchase-register", icon: Receipt },
  { label: "Stock Valuation", href: "/accounts/reports/stock-valuation", icon: BarChart3 },
  { label: "Inventory Register", href: "/accounts/reports/inventory-register", icon: Package },
  { label: "Customer Outstanding", href: "/accounts/receivables/outstanding", icon: Users },
  { label: "Supplier Outstanding", href: "/accounts/payables/outstanding", icon: Truck },
];

export const ACCOUNTS_NAV_GROUPS: AccountsNavGroup[] = [
  { id: "masters", label: "Masters", icon: FolderTree, items: ACCOUNTS_MASTERS_NAV },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight, items: ACCOUNTS_TRANSACTIONS_NAV },
  { id: "receivables", label: "Receivables", icon: Users, items: ACCOUNTS_RECEIVABLES_NAV },
  { id: "payables", label: "Payables", icon: Truck, items: ACCOUNTS_PAYABLES_NAV },
  { id: "banking", label: "Banking", icon: Landmark, items: ACCOUNTS_BANKING_NAV },
  { id: "reports", label: "Reports", icon: BarChart3, items: ACCOUNTS_REPORTS_NAV },
];



export const ACCOUNTS_NAV_ITEMS = ACCOUNTS_NAV_GROUPS.flatMap((g) => g.items);



/** Map route prefixes to sidebar group for pages not listed in nav items. */
const ROUTE_GROUP_PREFIXES: { prefix: string; groupId: AccountsNavGroupId }[] = [
  { prefix: CHART_OF_ACCOUNTS_HREF, groupId: "masters" },
  { prefix: "/accounts/masters/", groupId: "masters" },
  { prefix: "/accounts/settings", groupId: "masters" },
  { prefix: "/accounts/transactions/", groupId: "transactions" },
  { prefix: "/accounts/vouchers", groupId: "transactions" },
  { prefix: "/accounts/sales/", groupId: "transactions" },
  { prefix: "/accounts/purchases/", groupId: "transactions" },
  { prefix: "/accounts/receivables/", groupId: "receivables" },
  { prefix: "/accounts/payables/", groupId: "payables" },
  { prefix: "/accounts/banking/", groupId: "banking" },
  { prefix: "/accounts/bank-reconciliation", groupId: "banking" },
  { prefix: "/accounts/reports/", groupId: "reports" },
  { prefix: "/accounts/dashboard", groupId: "masters" },
];



export function resolveAccountsNavGroupId(pathname: string): AccountsNavGroupId {

  for (const { prefix, groupId } of ROUTE_GROUP_PREFIXES) {

    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {

      return groupId;

    }

  }

  return "masters";

}



export interface BreadcrumbItem {

  label: string;

  href?: string;

}



export function accountsBreadcrumb(

  section: string,

  page: string,

  pageHref?: string,

): BreadcrumbItem[] {

  return [

    { label: "Accounts", href: ACCOUNTS_HOME_HREF },

    { label: section },

    { label: page, href: pageHref },

  ];

}



export function isAccountsNavActive(pathname: string, href: string): boolean {

  if (pathname === href) return true;



  const hrefBase = href.split("#")[0].split("?")[0];



  if (href.includes("?")) {

    const [base, query] = href.split("?");

    if (pathname === base || pathname.startsWith(`${base}/`)) {

      if (typeof window !== "undefined") {

        const params = new URLSearchParams(window.location.search);

        const expected = new URLSearchParams(query);

        for (const [k, v] of expected.entries()) {

          if (params.get(k) !== v) return false;

        }

        return true;

      }

      return false;

    }

  }



  if (href.includes("#")) {

    if (pathname === hrefBase || pathname.startsWith(`${hrefBase}/`)) {

      if (typeof window !== "undefined") {

        return window.location.hash === href.slice(href.indexOf("#"));

      }

      return pathname === hrefBase;

    }

  }



  if (href === JOURNAL_VOUCHER_HREF && pathname.startsWith("/accounts/vouchers/journal")) {

    return true;

  }

  if (href === CHART_OF_ACCOUNTS_HREF && pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) return true;

  if (href.startsWith("/accounts/masters/ledgers") && pathname.startsWith("/accounts/masters/ledgers")) {

    if (typeof window === "undefined") {

      return href === "/accounts/masters/ledgers" && pathname === href;

    }

    const params = new URLSearchParams(window.location.search);

    if (href.includes("type=")) {

      const expected = new URLSearchParams(href.split("?")[1] ?? "");

      for (const [k, v] of expected.entries()) {

        if (params.get(k) !== v) return false;

      }

      return pathname === "/accounts/masters/ledgers" || pathname.startsWith("/accounts/masters/ledgers/");

    }

    return pathname === "/accounts/masters/ledgers" && !params.get("type");

  }

  if (href.startsWith("/accounts/masters/") && pathname.startsWith(hrefBase)) return true;

  if (href.startsWith("/accounts/reports/") && pathname === hrefBase) return true;

  if (href.startsWith("/accounts/receivables/") && pathname.startsWith(hrefBase)) return true;

  if (href.startsWith("/accounts/payables/") && pathname.startsWith(hrefBase)) return true;

  if (href.startsWith("/accounts/sales/") && pathname.startsWith(hrefBase)) return true;

  if (href.startsWith("/accounts/purchases/") && pathname.startsWith(hrefBase)) return true;

  if (href.startsWith("/accounts/banking/") && pathname.startsWith(hrefBase)) return true;

  if (href.startsWith("/accounts/transactions/") && pathname.startsWith(hrefBase)) return true;

  if (href === ACCOUNTING_SETTINGS_HREF && pathname.startsWith(ACCOUNTING_SETTINGS_HREF)) return true;

  if (href.startsWith("/accounts/claims") && pathname.startsWith("/accounts/claims")) return true;

  if (href.startsWith("/accounts/inventory/") && pathname.startsWith(hrefBase)) return true;



  return false;

}



const GROUP_DESCRIPTIONS: Record<AccountsNavGroupId, string> = {
  masters: "Chart of accounts and ledgers — accounting structure and balances.",
  transactions: "Sales, purchase, credit/debit notes, vouchers, and journal entries.",
  receivables: "Customer outstanding, ageing, collections and receipt allocation.",
  payables: "Supplier outstanding and ageing reports.",
  banking: "Bank accounts, books, fund transfers and reconciliation.",
  reports: "Trial balance, P&L, balance sheet and financial reports.",
};



/** Short one-line hints for mega-menu items */

const NAV_ITEM_SHORT_DESCRIPTIONS: Record<string, string> = {

  "Chart of Accounts": "View-only account hierarchy",

  "Cost Centers": "Department and cost allocation structure",

  "Accounting Settings": "Financial years, GST, TDS and posting defaults",

  "Pending Tax Invoices": "Dispatch-ready orders awaiting invoice",

  "Sales Invoices": "Create and post tax invoices",

  "Sales Register": "All sales voucher summary",

  "Customer Outstanding": "Open customer balances",

  "Pending Supplier Bills": "GRN-completed bills to enter",

  "Purchase Invoices": "Supplier bills and GST input",

  "Purchase Register": "All purchase voucher summary",

  "Supplier Outstanding": "Open supplier balances",

  "All Ledgers": "Filter by customer, supplier, bank and more",

  "Inventory Ledger": "Stock ledger under COA",

  "Claims Payable": "Approved claims awaiting payment",

  "Claims Register": "Paid employee claims history",

  "Bank Reconciliation": "Match bank statement lines",

  "Trial Balance": "Debit/credit summary by ledger",

  "GST Summary": "Output and input GST summary",

};



const SETUP_LINK_DESCRIPTIONS: Record<string, string> = {

  "Financial Years": "Accounting year open and close",

  "Voucher Types": "System voucher type configuration",

  "GST Settings": "LUT, GSTIN and SEZ supply settings",

  "TDS Settings": "TDS section rates and applicability",

  "Voucher Numbering": "Prefix and series per voucher type",

  "Posting Defaults": "Auto-posting and default ledgers",

  "Accounting Preferences": "Approval workflow and ERP mappings",

};



/** Left / right column order for mega-menu (remaining groups split evenly) */
const MEGA_MENU_COLUMN_ORDER: Partial<Record<AccountsNavGroupId, { left: string[]; right: string[] }>> = {
  masters: {
    left: ["Chart of Accounts", "Ledgers"],
    right: [],
  },
  transactions: {
    left: ["Pending Invoices", "Sales Invoice", "Purchase Invoice", "Credit Note", "Debit Note"],
    right: ["Receipt Voucher", "Payment Voucher", "Journal Voucher", "Contra Voucher"],
  },
  receivables: {
    left: ["Customer Outstanding", "Customer Ageing"],
    right: ["Collection Tracking", "Receipt Allocation"],
  },
  payables: {
    left: ["Supplier Outstanding"],
    right: ["Supplier Ageing"],
  },
  banking: {
    left: ["Bank Accounts", "Bank Book", "Cash Book"],
    right: ["Fund Transfer", "Bank Reconciliation"],
  },
  reports: {
    left: ["Trial Balance", "Profit & Loss", "Balance Sheet", "Cash Flow", "General Ledger", "Day Book"],
    right: ["GST Summary", "Sales Register", "Purchase Register", "Stock Valuation", "Customer Outstanding"],
  },
};

export interface AccountsMegaMenuChild {

  label: string;

  href: string;

  icon?: LucideIcon;

  description?: string;

}



export function arrangeAccountsMegaMenuColumns(

  groupId: AccountsNavGroupId,

  children: AccountsMegaMenuChild[],

): { left: AccountsMegaMenuChild[]; right: AccountsMegaMenuChild[] } {

  const order = MEGA_MENU_COLUMN_ORDER[groupId];

  const byLabel = new Map(children.map((c) => [c.label, c]));

  if (order) {

    return {

      left: order.left.map((l) => byLabel.get(l)).filter((c): c is AccountsMegaMenuChild => !!c),

      right: order.right.map((l) => byLabel.get(l)).filter((c): c is AccountsMegaMenuChild => !!c),

    };

  }

  const mid = Math.ceil(children.length / 2);

  return { left: children.slice(0, mid), right: children.slice(mid) };

}



export function accountsMegaMenuGroups() {

  return ACCOUNTS_NAV_GROUPS.map((group) => ({

    id: group.id,

    label: group.label,

    description: GROUP_DESCRIPTIONS[group.id],

    icon: group.icon,

    children: group.items.map(({ label, href, icon }) => ({

      label,

      href,

      icon,

      description: NAV_ITEM_SHORT_DESCRIPTIONS[label],

    })),

  }));

}



export function accountingSettingsSetupLinks() {

  return ACCOUNTING_SETTINGS_SETUP_LINKS.map(({ label, href, icon }) => ({

    label,

    href,

    icon,

    description: SETUP_LINK_DESCRIPTIONS[label],

  }));

}


