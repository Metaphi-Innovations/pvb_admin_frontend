import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
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
  Tags,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

export const CHART_OF_ACCOUNTS_HREF = "/accounts/masters/chart-of-accounts";
export const ACCOUNTS_HOME_HREF = CHART_OF_ACCOUNTS_HREF;
export const VOUCHERS_HUB_HREF = "/accounts/vouchers";
export const JOURNAL_VOUCHER_HREF = "/accounts/vouchers/journal";
export const REPORTS_HOME_HREF = "/accounts/reports/trial-balance";

export interface AccountsNavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export type AccountsNavGroupId =
  | "masters"
  | "transactions"
  | "receivables"
  | "payables"
  | "banking"
  | "reports";

export interface AccountsNavGroup {
  id: AccountsNavGroupId;
  label: string;
  icon: LucideIcon;
  items: AccountsNavLink[];
}

export const VOUCHER_NAV_ITEMS: AccountsNavLink[] = [
  { label: "Receipt Voucher", href: "/accounts/vouchers?tab=receipt", icon: Wallet },
  { label: "Payment Voucher", href: "/accounts/vouchers?tab=payment", icon: CreditCard },
  { label: "Journal Voucher", href: JOURNAL_VOUCHER_HREF, icon: NotebookPen },
  { label: "Contra Voucher", href: "/accounts/vouchers?tab=contra", icon: ArrowLeftRight },
  { label: "Sales Invoices", href: "/accounts/transactions/invoices", icon: FileText },
  { label: "Purchase Invoices", href: "/accounts/transactions/purchase", icon: Truck },
  { label: "Credit Notes", href: "/accounts/transactions/credit-notes", icon: FileText },
  { label: "Debit Notes", href: "/accounts/transactions/debit-notes", icon: FileText },
  { label: "Employee Claims", href: "/accounts/transactions/expenses", icon: Users },
  { label: "Inventory Adjustments", href: "/accounts/transactions/inventory-adjustments", icon: Package },
];

export const RECEIVABLES_NAV_ITEMS: AccountsNavLink[] = [
  { label: "Customer Outstanding", href: "/accounts/receivables/outstanding", icon: Users },
  { label: "Customer Ageing", href: "/accounts/receivables/ageing", icon: CalendarDays },
  { label: "Collection Tracking", href: "/accounts/receivables/collections", icon: ClipboardList },
  { label: "Receipt Allocation", href: "/accounts/receivables/receipt-allocation", icon: Wallet },
];

export const PAYABLES_NAV_ITEMS: AccountsNavLink[] = [
  { label: "Vendor Outstanding", href: "/accounts/payables/outstanding", icon: Truck },
  { label: "Vendor Ageing", href: "/accounts/payables/ageing", icon: CalendarDays },
  { label: "Employee Claims Payable", href: "/accounts/payables/employee-claims", icon: Users },
  { label: "Due Payments", href: "/accounts/payables/due-payments", icon: CreditCard },
  { label: "Payment Runs", href: "/accounts/payables/payment-runs", icon: Receipt },
];

export const BANKING_NAV_ITEMS: AccountsNavLink[] = [
  { label: "Bank Accounts", href: "/accounts/banking/bank-accounts", icon: Landmark },
  { label: "Bank Book", href: "/accounts/reports/bank-book", icon: BookOpen },
  { label: "Cash Book", href: "/accounts/reports/cash-book", icon: Banknote },
  { label: "Fund Transfer", href: "/accounts/banking/fund-transfer", icon: ArrowLeftRight },
  { label: "Bank Reconciliation", href: "/accounts/banking/reconciliation", icon: Scale },
];

export const REPORTS_NAV_ITEMS: AccountsNavLink[] = [
  { label: "Trial Balance", href: "/accounts/reports/trial-balance", icon: Scale },
  { label: "Profit & Loss", href: "/accounts/reports/pl", icon: TrendingUp },
  { label: "Balance Sheet", href: "/accounts/reports/balance-sheet", icon: FileSpreadsheet },
  { label: "Cash Flow", href: "/accounts/reports/cash-flow", icon: TrendingDown },
  { label: "General Ledger", href: "/accounts/reports/ledger", icon: BookOpen },
  { label: "Day Book", href: "/accounts/reports/day-book", icon: CalendarDays },
  { label: "Customer Outstanding", href: "/accounts/reports/receivables", icon: Users },
  { label: "Vendor Outstanding", href: "/accounts/reports/payables", icon: Truck },
  { label: "GST Summary", href: "/accounts/reports/gst", icon: Layers },
  { label: "Sales Register", href: "/accounts/reports/sales-register", icon: FileText },
  { label: "Purchase Register", href: "/accounts/reports/purchase-register", icon: Truck },
  { label: "Stock Valuation", href: "/accounts/reports/stock-valuation", icon: Package },
  { label: "Branch-wise Reports", href: "/accounts/reports/branch-wise", icon: Building2 },
];

export const ACCOUNTS_NAV_GROUPS: AccountsNavGroup[] = [
  {
    id: "masters",
    label: "Masters",
    icon: FolderTree,
    items: [
      { label: "Chart of Accounts", href: CHART_OF_ACCOUNTS_HREF, icon: FolderTree },
      { label: "Ledgers", href: "/accounts/masters/ledgers", icon: BookMarked },
      { label: "Financial Years", href: "/accounts/masters/financial-years", icon: CalendarRange },
      { label: "Voucher Types", href: "/accounts/masters/voucher-types", icon: Tags },
      { label: "Bank Accounts", href: "/accounts/masters/bank-accounts", icon: Landmark },
      { label: "Cost Centers", href: "/accounts/masters/cost-centers", icon: Building2 },
      { label: "Accounting Settings", href: "/accounts/settings", icon: Settings },
    ],
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: Receipt,
    items: VOUCHER_NAV_ITEMS,
  },
  {
    id: "receivables",
    label: "Receivables",
    icon: Users,
    items: RECEIVABLES_NAV_ITEMS,
  },
  {
    id: "payables",
    label: "Payables",
    icon: Truck,
    items: PAYABLES_NAV_ITEMS,
  },
  {
    id: "banking",
    label: "Banking",
    icon: Landmark,
    items: BANKING_NAV_ITEMS,
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    items: REPORTS_NAV_ITEMS,
  },
];

export const ACCOUNTS_NAV_ITEMS = ACCOUNTS_NAV_GROUPS.flatMap((g) => g.items);

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

const PREFIX_MATCHERS: { prefix: string; href: string }[] = [
  { prefix: "/accounts/vouchers/journal", href: JOURNAL_VOUCHER_HREF },
  { prefix: "/accounts/vouchers", href: VOUCHERS_HUB_HREF },
  { prefix: CHART_OF_ACCOUNTS_HREF, href: CHART_OF_ACCOUNTS_HREF },
  { prefix: "/accounts/masters/", href: "" },
  { prefix: "/accounts/transactions/", href: "" },
  { prefix: "/accounts/receivables/", href: "" },
  { prefix: "/accounts/payables/", href: "" },
  { prefix: "/accounts/banking/", href: "" },
  { prefix: "/accounts/reports/", href: "" },
  { prefix: "/accounts/settings", href: "/accounts/settings" },
];

export function isAccountsNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;

  if (href.includes("?tab=")) {
    const [base, query] = href.split("?");
    if (pathname === base || pathname.startsWith(base + "/")) {
      return typeof window !== "undefined"
        ? window.location.search.includes(query)
        : false;
    }
  }

  if (href === JOURNAL_VOUCHER_HREF && pathname.startsWith("/accounts/vouchers/journal")) {
    return true;
  }
  if (href === CHART_OF_ACCOUNTS_HREF && pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) return true;
  if (href.startsWith("/accounts/masters/") && pathname.startsWith(href)) return true;
  if (href.startsWith("/accounts/reports/") && pathname === href) return true;
  if (href.startsWith("/accounts/receivables/") && pathname.startsWith(href)) return true;
  if (href.startsWith("/accounts/payables/") && pathname.startsWith(href)) return true;
  if (href.startsWith("/accounts/banking/") && pathname.startsWith(href)) return true;
  if (href.startsWith("/accounts/transactions/") && pathname.startsWith(href)) return true;
  if (href === "/accounts/settings" && pathname.startsWith("/accounts/settings")) return true;

  return false;
}

const GROUP_DESCRIPTIONS: Record<AccountsNavGroupId, string> = {
  masters: "Chart of accounts, ledgers, financial years, voucher types and settings.",
  transactions: "Receipts, payments, journals, invoices, notes and inventory adjustments.",
  receivables: "Customer outstanding, ageing analysis and collection tracking.",
  payables: "Vendor outstanding, employee claims payable and due payments.",
  banking: "Bank accounts, cash book, fund transfers and reconciliation.",
  reports: "Trial balance, financial statements, GST and stock valuation reports.",
};

export function accountsMegaMenuGroups() {
  return ACCOUNTS_NAV_GROUPS.map((group) => ({
    label: group.label,
    description: GROUP_DESCRIPTIONS[group.id],
    icon: group.icon,
    children: group.items.map(({ label, href }) => ({ label, href })),
  }));
}
