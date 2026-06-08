import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Database as DatabaseIcon,
  ShoppingCart,
  BarChart3,
  UserCheck,
  Wallet,
  CalendarDays,
  Monitor,
  Settings,
  Palette,
  CalendarCheck,
  Settings2,
  Receipt,
  Warehouse,
  ArrowLeftRight,
  PieChart,
} from "lucide-react";

export interface NavChild {
  label: string;
  href: string;
}

export interface NavGroup {
  label: string;
  description?: string;
  icon?: LucideIcon;
  children: NavChild[];
}

export type NavMenuLayout = "grid" | "sidebar";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  iconOnly?: boolean;
  children?: NavChild[];
  groupedChildren?: NavGroup[];
  /** sidebar = left categories + right links on hover (HR-style mega menu) */
  menuLayout?: NavMenuLayout;
}

/** Lightweight route config only — no page/form/table imports. */
export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    children: [
      { label: "Geography", href: "/masters/geography" },
      { label: "Department", href: "/user-management/department" },
      { label: "Roles", href: "/user-management/roles" },
      { label: "User", href: "/user-management/employee" },
    ],
  },
  {
    id: "masters",
    label: "Masters",
    icon: BookOpen,
    children: [
      { label: "Category", href: "/masters/categories" },
      { label: "Segment", href: "/masters/segment" },
      { label: "Formulation", href: "/masters/formulation" },
      { label: "CFU", href: "/masters/cfu" },
      { label: "Unit", href: "/masters/uom" },
      { label: "Scheme", href: "/masters/scheme" },
      { label: "Customers", href: "/masters/customers" },
      { label: "Customer Type", href: "/masters/customer-types" },
      { label: "Vendor Master", href: "/masters/vendors" },
      { label: "Products", href: "/masters/products" },
      { label: "Warehouse", href: "/masters/warehouse" },
      { label: "HSN", href: "/masters/hsn" },
      { label: "GST", href: "/masters/gst" },
      { label: "TDS", href: "/masters/tds" },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    children: [
      { label: "Purchase Requests", href: "/procurement/purchase-requests" },
      { label: "Purchase Orders", href: "/procurement/purchase-orders" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: BarChart3,
    children: [
      { label: "Sales Orders", href: "/sales/orders" },
      { label: "Invoices", href: "/sales/invoices" },
      { label: "Dispatch", href: "/sales/dispatch" },
      { label: "Collections", href: "/sales/collections" },
      { label: "Targets", href: "/sales/targets" },
      { label: "Beat Plan", href: "/sales/beat-plan" },
    ],
  },
  {
    id: "warehouse",
    label: "Warehouse",
    icon: Warehouse,
    children: [
      { label: "GRN & QC", href: "/warehouse/grnqc" },
      { label: "Stock Overview", href: "/warehouse/stockoverview" },
      { label: "Packing", href: "/warehouse/packing" },
      { label: "Dispatch", href: "/warehouse/dispatch" },
      { label: "Reorder Level", href: "/warehouse/reorder-level" },
    ],
  },
  {
    id: "hr",
    label: "HR",
    icon: UserCheck,
    href: "/hr/sales-force-attendance",
    menuLayout: "sidebar",
    groupedChildren: [
      {
        label: "Attendance",
        description: "Sales Force attendance summary, holidays, and week off rules.",
        icon: CalendarCheck,
        children: [
          { label: "Attendance Summary", href: "/hr/sales-force-attendance" },
          { label: "Holiday Setup", href: "/hr/sales-force-attendance?tab=holidays" },
          { label: "Week Off Setup", href: "/hr/sales-force-attendance?tab=weekoffs" },
        ],
      },
      {
        label: "Sales Force TA/DA Policy Master",
        description: "Role + City Category + Claim Category = Eligible Amount. Sales Force only.",
        icon: Settings2,
        children: [{ label: "Policy Master", href: "/hr/sales-force-policy" }],
      },
      {
        label: "TA/DA Claims",
        description: "HR monitoring and validation of Sales Force TA/DA claims.",
        icon: Receipt,
        children: [{ label: "Claims", href: "/hr/claims/tada" }],
      },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: Wallet,
    href: "/accounts",
    menuLayout: "sidebar",
    groupedChildren: [
      {
        label: "Transactions",
        description: "Invoices, payments, journals and other accounting entries.",
        icon: ArrowLeftRight,
        children: [
          { label: "Invoices", href: "/accounts/transactions/invoices" },
          { label: "Credit Notes", href: "/accounts/transactions/credit-notes" },
          { label: "Purchase", href: "/accounts/transactions/purchase" },
          { label: "Debit Notes", href: "/accounts/transactions/debit-notes" },
          { label: "Expenses", href: "/accounts/transactions/expenses" },
          { label: "Payments", href: "/accounts/transactions/payments" },
          { label: "Reconciliation", href: "/accounts/transactions/reconciliation" },
          { label: "Journal", href: "/accounts/transactions/journal" },
        ],
      },
      {
        label: "Reports",
        description: "Financial reporting and summaries.",
        icon: PieChart,
        children: [
          { label: "Trial Balance", href: "/accounts/reports/trial-balance" },
          { label: "P&L", href: "/accounts/reports/pl" },
          { label: "Balance Sheet", href: "/accounts/reports/balance-sheet" },
        ],
      },
    ],
  },
  {
    id: "database",
    label: "Database",
    icon: DatabaseIcon,
    children: [
      { label: "Farmer", href: "/database/farmer" },
      { label: "Distributor", href: "/database/distributor" },
    ],
  },
  {
    id: "event",
    label: "Event",
    icon: CalendarDays,
    children: [
      { label: "Events", href: "/events" },
      { label: "Attendance", href: "/events/attendance" },
      { label: "Feedback", href: "/events/feedback" },
    ],
  },
  {
    id: "demo",
    label: "Demo",
    icon: Monitor,
    children: [
      { label: "Listing Demo", href: "/listing-demo" },
      { label: "Form Demo", href: "/form-demo" },
    ],
  },
  {
    id: "template",
    label: "Template",
    icon: Palette,
    href: "/template",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    iconOnly: true,
    href: "/settings",
  },
];

export function collectNavHrefs(items: NavItem[] = NAV_ITEMS): string[] {
  const hrefs = new Set<string>();
  for (const item of items) {
    if (item.href) hrefs.add(item.href);
    item.children?.forEach((c) => hrefs.add(c.href));
    item.groupedChildren?.forEach((g) => g.children.forEach((c) => hrefs.add(c.href)));
  }
  return Array.from(hrefs);
}
