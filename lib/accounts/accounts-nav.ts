import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet,
  FolderTree,
  Landmark,
  NotebookPen,
  Receipt,
  Scale,
  Tags,
  TrendingUp,
} from "lucide-react";

export const CHART_OF_ACCOUNTS_HREF = "/accounts/masters/chart-of-accounts";
export const ACCOUNTS_HOME_HREF = CHART_OF_ACCOUNTS_HREF;
export const JOURNAL_VOUCHER_HREF = "/accounts/vouchers/journal";
export const REPORTS_HOME_HREF = "/accounts/reports/trial-balance";

export interface AccountsNavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface AccountsNavGroup {
  id: "masters" | "vouchers" | "reports";
  label: string;
  icon: LucideIcon;
  items: AccountsNavLink[];
}

/** Journal only — other voucher types will be added later */
export const VOUCHER_NAV_ITEMS: AccountsNavLink[] = [
  { label: "Journal", href: JOURNAL_VOUCHER_HREF, icon: NotebookPen },
];

export const REPORTS_NAV_ITEMS: AccountsNavLink[] = [
  { label: "Trial Balance", href: "/accounts/reports/trial-balance", icon: Scale },
  { label: "Ledger", href: "/accounts/reports/ledger", icon: BookOpen },
  { label: "Day Book", href: "/accounts/reports/day-book", icon: CalendarDays },
  { label: "Cash Book", href: "/accounts/reports/cash-book", icon: Banknote },
  { label: "Bank Book", href: "/accounts/reports/bank-book", icon: Landmark },
  { label: "Balance Sheet", href: "/accounts/reports/balance-sheet", icon: FileSpreadsheet },
  { label: "Profit & Loss", href: "/accounts/reports/pl", icon: TrendingUp },
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
    ],
  },
  {
    id: "vouchers",
    label: "Vouchers",
    icon: Receipt,
    items: VOUCHER_NAV_ITEMS,
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

export function isAccountsNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === JOURNAL_VOUCHER_HREF && pathname.startsWith("/accounts/vouchers/journal")) {
    return true;
  }
  if (href === CHART_OF_ACCOUNTS_HREF && pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) return true;
  if (href.startsWith("/accounts/masters/") && pathname.startsWith(href)) return true;
  if (href.startsWith("/accounts/reports/") && pathname.startsWith(href)) return true;
  return false;
}

export function accountsMegaMenuGroups() {
  return ACCOUNTS_NAV_GROUPS.map((group) => ({
    label: group.label,
    description:
      group.id === "masters"
        ? "Chart of accounts, ledgers, financial years and voucher types."
        : group.id === "vouchers"
          ? "Journal voucher entry and listing."
          : "Trial balance, ledgers, day book, cash book and financial statements.",
    icon: group.icon,
    children: group.items.map(({ label, href }) => ({ label, href })),
  }));
}
