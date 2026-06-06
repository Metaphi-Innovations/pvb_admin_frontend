import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ShoppingCart,
  BarChart3,
  UserCheck,
  Wallet,
  Wheat,
  CalendarDays,
  Monitor,
  Settings,
  Palette,
  CalendarCheck,
  Settings2,
  Receipt,
  BadgeCheck,
  Warehouse
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
    id: "hr",
    label: "HR",
    icon: UserCheck,
    href: "/hr/attendance",
    menuLayout: "sidebar",
    groupedChildren: [
      {
        label: "Attendance",
        description: "View employee check-in, status, and working hours.",
        icon: CalendarCheck,
        children: [{ label: "Attendance Records", href: "/hr/attendance" }],
      },
      {
        label: "TA/DA Configuration",
        description: "Sales Force policy — roles, cities, allowances & claim rules.",
        icon: Settings2,
        children: [
          { label: "Role / Grade Entitlement", href: "/hr/tada-config?tab=role" },
          { label: "City Category Master", href: "/hr/tada-config?tab=city" },
          { label: "Lodging & Boarding", href: "/hr/tada-config?tab=lodging" },
          { label: "Local Travel", href: "/hr/tada-config?tab=local" },
          { label: "KM Reimbursement", href: "/hr/tada-config?tab=km" },
          { label: "Incidental Allowance", href: "/hr/tada-config?tab=incidental" },
          { label: "Claim Type Master", href: "/hr/tada-config?tab=claimType" },
        ],
      },
      {
        label: "TA/DA Claims",
        description: "Create, submit, and track travel expense claims.",
        icon: Receipt,
        children: [
          { label: "All Claims", href: "/hr/claims/tada" },
          { label: "New Claim", href: "/hr/claims/tada/new" },
        ],
      },
      {
        label: "Approved Claims",
        description: "Approved claims for Accounts payment processing.",
        icon: BadgeCheck,
        children: [{ label: "Payment Queue", href: "/hr/claims/approved" }],
      },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: Wallet,
    href: "/accounts",
    groupedChildren: [
      {
        label: "Masters",
        children: [
          { label: "Chart of Accounts", href: "/accounts/masters/chart-of-accounts" },
          { label: "Ledgers", href: "/accounts/masters/ledgers" },
        ],
      },
      {
        label: "Transactions",
        children: [
          { label: "Purchase", href: "/accounts/transactions/purchase" },
          { label: "Sales", href: "/accounts/transactions/sales" },
          { label: "Purchase Return", href: "/accounts/transactions/purchase-return" },
          { label: "Sales Return", href: "/accounts/transactions/sales-return" },
          { label: "Payment", href: "/accounts/transactions/payment" },
          { label: "Bank Reconciliation", href: "/accounts/transactions/bank-reconciliation" },
          { label: "Journal", href: "/accounts/transactions/journal" },
        ],
      },
      {
        label: "Reports",
        children: [
          { label: "Trial Balance", href: "/accounts/reports/trial-balance" },
          { label: "P&L", href: "/accounts/reports/pl" },
          { label: "Balance Sheet", href: "/accounts/reports/balance-sheet" },
        ],
      },
    ],
  },
  {
    id: "farmer",
    label: "Farmer",
    icon: Wheat,
    href: "/farmer",
    // children: [
    //   { label: "Farmer Registry", href: "/farmer/registry" },
    //   { label: "Field Surveys", href: "/farmer/surveys" },
    //   { label: "Crop Calendar", href: "/farmer/crop-calendar" },
    //   { label: "Input Distribution", href: "/farmer/inputs" },
    //   { label: "FPO Management", href: "/farmer/fpo" },
    // ],
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
    id: "warehouse",
    label: "Warehouse",
    icon: Warehouse,
    children: [
      { label: "GRN & QC", href: "/warehouse/grnqc" },
      { label: "Stock Overview", href: "/warehouse/stockoverview" },
      { label: "Packing", href: "/warehouse/packing" },
      { label: "Dispatch", href: "/warehouse/dispatch" },
      { label: "Reorder Levels", href: "/warehouse/reorder-levels" },
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
