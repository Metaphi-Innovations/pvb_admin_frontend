import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Settings,
  Users,
  UserRound,
  FileText,
  ScrollText,
  Wallet,
  LogOut,
  Plane,
  Radio,
  LayoutDashboard,
  FileCheck2,
  History,
} from "lucide-react";

export type HrNavGroupId =
  | "people"
  | "attendance"
  | "requests"
  | "reimbursements"
  | "payroll"
  | "letters"
  | "offboarding"
  | "settings";

export interface HrNavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional subsection label rendered above this item */
  sectionLabel?: string;
}

export interface HrNavGroup {
  id: HrNavGroupId;
  label: string;
  description: string;
  icon: LucideIcon;
  items: HrNavLink[];
}

/** Default entry when opening HR from the top navbar. */
export const HR_MODULE_ENTRY_HREF = "/hr/employees";

export interface HrBreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Canonical HR module navigation — used by the persistent left sidebar
 * and (compact) top HR entry links. Settings deep-nav uses settings-catalog.
 */
export const HR_NAV_GROUPS: HrNavGroup[] = [
  {
    id: "people",
    label: "Employees",
    description: "Manage employee records and profiles",
    icon: Users,
    items: [{ label: "Employee Directory", href: "/hr/employees", icon: Users }],
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Attendance for all employees",
    icon: CalendarCheck,
    items: [
      { label: "Attendance Dashboard", href: "/hr/attendance/dashboard", icon: LayoutDashboard },
      { label: "Live Attendance", href: "/hr/attendance/live", icon: Radio },
      { label: "Daily Attendance", href: "/hr/attendance/daily", icon: CalendarDays },
      { label: "Employee Attendance", href: "/hr/attendance/employees", icon: UserRound },
      { label: "Company Roster", href: "/hr/attendance/roster", icon: Users },
      { label: "Attendance Reports", href: "/hr/attendance/reports", icon: FileText },
    ],
  },
  {
    id: "requests",
    label: "Requests",
    description: "Review and manage employee leave requests.",
    icon: ClipboardList,
    items: [{ label: "Leave Requests", href: "/hr/requests", icon: ClipboardList }],
  },
  {
    id: "reimbursements",
    label: "Travel & Expenses",
    description: "Travel requests and expense claim review",
    icon: Wallet,
    items: [
      { label: "Travel Requests", href: "/hr/travel-requests", icon: Plane },
      { label: "Reimbursements / Claims", href: "/hr/reimbursements", icon: Wallet },
    ],
  },
  {
    id: "payroll",
    label: "Payroll",
    description: "Payroll runs, payslips, and Form 16",
    icon: Wallet,
    items: [
      { label: "Payroll", href: "/hr/payroll", icon: Wallet },
      { label: "Payroll History", href: "/hr/payroll/history", icon: History },
      { label: "Payslips", href: "/hr/payroll/payslips", icon: FileText },
      { label: "Form 16", href: "/hr/payroll/form-16", icon: FileCheck2 },
    ],
  },
  {
    id: "letters",
    label: "HR Letters",
    description: "Issue and manage HR letters",
    icon: ScrollText,
    items: [{ label: "HR Letters", href: "/hr/hr-letters", icon: ScrollText }],
  },
  {
    id: "offboarding",
    label: "Offboarding",
    description: "Resignations, clearance, and exits",
    icon: LogOut,
    items: [{ label: "Offboarding", href: "/hr/offboarding", icon: LogOut }],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Organization and HR configuration",
    icon: Settings,
    /** Leaf in module rail; Settings catalog replaces this rail inside /hr/settings/*. */
    items: [{ label: "Settings", href: "/hr/settings", icon: Settings }],
  },
];

/** First child href — used when opening a module from the sidebar header. */
export function getHrGroupLandingHref(group: HrNavGroup): string {
  return group.items[0]?.href ?? HR_MODULE_ENTRY_HREF;
}

/**
 * Expandable groups show children under a collapsible header.
 * Leaf modules (label matches sole child) are single clickable rows.
 */
export function hrGroupIsExpandable(group: HrNavGroup): boolean {
  if (group.items.length === 0) return false;
  if (group.items.length > 1) return true;
  return group.items[0].label !== group.label;
}

/** Flat top-nav entry links derived from the same canonical groups (no nested submenus). */
export function getHrTopNavChildren(): { label: string; href: string }[] {
  return HR_NAV_GROUPS.map((g) => ({
    label: g.label,
    href: getHrGroupLandingHref(g),
  }));
}

/**
 * Legacy routes remap into operational/settings groups so left nav does not
 * resurrect removed mega-menu cards.
 */
const ROUTE_PREFIXES: { prefix: string; id: HrNavGroupId }[] = [
  { prefix: "/hr/settings", id: "settings" },
  // Inbox preserved; config stays under Settings — use settings shell for deep link
  { prefix: "/hr/notifications", id: "settings" },
  { prefix: "/hr/sales-force-policy", id: "settings" },
  { prefix: "/hr/reimbursements", id: "reimbursements" },
  { prefix: "/hr/travel-requests", id: "reimbursements" },
  { prefix: "/hr/claims", id: "reimbursements" },
  { prefix: "/hr/requests", id: "requests" },
  { prefix: "/hr/sales-force-attendance", id: "attendance" },
  { prefix: "/hr/attendance", id: "attendance" },
  { prefix: "/hr/payroll", id: "payroll" },
  { prefix: "/hr/hr-letters", id: "letters" },
  { prefix: "/hr/offboarding", id: "offboarding" },
  { prefix: "/hr/employees", id: "people" },
  // Legacy masters — no HR nav group; park under settings shell
  { prefix: "/hr/masters", id: "settings" },
];

export function resolveHrNavGroupId(pathname: string): HrNavGroupId {
  const path = pathname.replace(/\/$/, "") || pathname;
  for (const { prefix, id } of ROUTE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return id;
  }
  return "attendance";
}

export function getHrNavGroup(id: HrNavGroupId): HrNavGroup {
  return HR_NAV_GROUPS.find((g) => g.id === id) ?? HR_NAV_GROUPS[0];
}

/**
 * Persistent HR sidebar is always shown on /hr/* routes.
 * Settings uses the Settings catalog view instead of the module accordion.
 */
export function hrSectionShowsContextualSidebar(_id: HrNavGroupId): boolean {
  return true;
}

/** Active link detection — operational routes only. */
export function isHrNavActive(pathname: string, href: string, search = ""): boolean {
  const [base, query] = href.split("?");
  const path = pathname.replace(/\/$/, "") || pathname;
  const baseNorm = base.replace(/\/$/, "") || base;

  if (query) {
    if (path !== baseNorm) return false;
    const want = new URLSearchParams(query);
    const have = new URLSearchParams(search);
    for (const [k, v] of want.entries()) {
      if (have.get(k) !== v) return false;
    }
    return true;
  }

  if (baseNorm === "/hr/settings") {
    return path === "/hr/settings";
  }
  if (baseNorm === "/hr/sales-force-attendance") {
    return path === baseNorm || path === "/hr/attendance/dashboard";
  }
  if (baseNorm === "/hr/employees") {
    return path === "/hr/employees" || path.startsWith("/hr/employees/");
  }
  if (baseNorm === "/hr/hr-letters") {
    return path === "/hr/hr-letters" || path.startsWith("/hr/hr-letters/");
  }
  if (baseNorm === "/hr/payroll/form-16") {
    return path === "/hr/payroll/form-16" || path.startsWith("/hr/payroll/form-16/");
  }
  if (baseNorm === "/hr/payroll/history") {
    return path === "/hr/payroll/history" || path.startsWith("/hr/payroll/history/");
  }
  if (baseNorm === "/hr/payroll/payslips") {
    return path === "/hr/payroll/payslips" || path.startsWith("/hr/payroll/payslips/");
  }
  if (baseNorm === "/hr/payroll") {
    if (
      path.startsWith("/hr/payroll/form-16") ||
      path.startsWith("/hr/payroll/history") ||
      path.startsWith("/hr/payroll/payslips")
    ) {
      return false;
    }
    return path === "/hr/payroll" || path.startsWith("/hr/payroll/");
  }
  if (baseNorm === "/hr/offboarding") {
    return path === "/hr/offboarding" || path.startsWith("/hr/offboarding/");
  }
  if (baseNorm === "/hr/claims/tada/new") {
    return path === "/hr/claims/tada/new";
  }
  if (baseNorm === "/hr/claims/tada") {
    if (path === "/hr/claims/tada/new") return false;
    return path === "/hr/claims/tada" || path.startsWith("/hr/claims/tada/");
  }
  if (baseNorm === "/employee/claims") {
    return path === "/employee/claims" || path.startsWith("/employee/claims/");
  }
  if (baseNorm === "/hr/reimbursements") {
    if (path.startsWith("/hr/claims")) return false;
    return path === "/hr/reimbursements" || path.startsWith("/hr/reimbursements/");
  }
  if (baseNorm === "/hr/travel-requests") {
    return path === "/hr/travel-requests" || path.startsWith("/hr/travel-requests/");
  }
  if (baseNorm === "/employee/travel-requests") {
    return path === "/employee/travel-requests" || path.startsWith("/employee/travel-requests/");
  }
  if (baseNorm === "/hr/requests") {
    return path === "/hr/requests" || path.startsWith("/hr/requests/");
  }
  if (baseNorm === "/hr/attendance/live") {
    return path === "/hr/attendance/live" || path.startsWith("/hr/attendance/live/");
  }
  if (baseNorm === "/hr/attendance/daily") {
    return path === "/hr/attendance/daily" || path.startsWith("/hr/attendance/daily/");
  }
  if (baseNorm === "/hr/attendance/dashboard") {
    return path === "/hr/attendance/dashboard" || path === "/hr/attendance" || path === "/hr/attendance/";
  }
  if (baseNorm === "/hr/attendance/employees") {
    return (
      path === "/hr/attendance/employees" ||
      path.startsWith("/hr/attendance/employees/") ||
      /^\/hr\/attendance\/\d+/.test(path)
    );
  }
  if (baseNorm === "/hr/attendance/roster") {
    return path === "/hr/attendance/roster" || path.startsWith("/hr/attendance/roster/");
  }
  if (baseNorm === "/hr/attendance/reports") {
    return path === "/hr/attendance/reports" || path.startsWith("/hr/attendance/reports/");
  }
  if (baseNorm === "/hr/attendance/sync") {
    return path === "/hr/attendance/sync" || path.startsWith("/hr/attendance/sync/");
  }
  if (baseNorm === "/hr/attendance") {
    if (
      path.startsWith("/hr/attendance/reports") ||
      path.startsWith("/hr/attendance/sync") ||
      path.startsWith("/hr/attendance/live") ||
      path.startsWith("/hr/attendance/daily") ||
      path.startsWith("/hr/attendance/dashboard") ||
      path.startsWith("/hr/attendance/roster") ||
      path.startsWith("/hr/attendance/employees")
    ) {
      return false;
    }
    return path === "/hr/attendance" || path.startsWith("/hr/attendance/");
  }
  if (path === baseNorm) return true;
  if (path.startsWith(`${baseNorm}/`)) return true;
  return false;
}

export function resolveHrNavLabel(href: string): string {
  if (href.startsWith("/hr/settings")) {
    try {
      if (href === "/hr/settings" || href === "/hr/settings/") return "Overview";
      const map: Record<string, string> = {
        "/hr/settings/organization/company": "Company Profile",
        "/hr/settings/organization/branches": "Branches",
        "/hr/settings/organization/departments": "Departments",
        "/hr/settings/organization/designations": "Designations",
        "/hr/settings/organization/employee-types": "Employee Types",
        "/hr/settings/organization/employment-statuses": "Employment Statuses",
        "/hr/settings/onboarding/mandatory-documents": "Mandatory Documents",
        "/hr/settings/onboarding/joining-checklist": "Joining Checklist",
        "/hr/settings/onboarding/welcome-workflow": "Welcome Workflow",
        "/hr/settings/attendance/shift-setup": "Shift Setup",
        "/hr/settings/attendance/holiday-calendar": "Holiday Calendar",
        "/hr/settings/attendance/attendance-policy": "Attendance Policy",
        "/hr/settings/attendance/attendance-modes": "Attendance Modes",
        "/hr/settings/reimbursement/travel-policy": "Travel Policy",
        "/hr/settings/leave/leave-types": "Leave Types",
        "/hr/settings/leave/leave-policies": "Leave Policies",
        "/hr/settings/payroll/payroll-cycle": "Payroll Cycle",
        "/hr/settings/payroll/salary-components": "Salary Components",
        "/hr/settings/payroll/salary-structures": "Salary Structures",
        "/hr/settings/payroll/lop-rules": "LOP Rules",
        "/hr/settings/notifications": "HR Notifications",
      };
      const path = href.split("?")[0].replace(/\/$/, "");
      if (map[path]) return map[path];
    } catch {
      /* fall through */
    }
    return "Settings";
  }
  const path = href.split("?")[0].replace(/\/$/, "") || href;
  let best: { label: string; len: number } | null = null;
  for (const g of HR_NAV_GROUPS) {
    for (const i of g.items) {
      const base = i.href.split("?")[0].replace(/\/$/, "") || i.href;
      if (path === base || path.startsWith(`${base}/`)) {
        if (!best || base.length > best.len) {
          best = { label: i.label, len: base.length };
        }
      }
    }
  }
  return best?.label ?? "page";
}

export function hrBreadcrumb(...crumbs: HrBreadcrumbItem[]): HrBreadcrumbItem[] {
  return [{ label: "HR", href: HR_MODULE_ENTRY_HREF }, ...crumbs];
}
