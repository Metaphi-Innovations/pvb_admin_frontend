import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Settings2,
  Settings,
  Building2,
  GitBranch,
  Network,
  BadgeCheck,
  Users,
  UserCog,
  UserRound,
  FileText,
  Target,
  Leaf,
  ScrollText,
  Wallet,
  LogOut,
  Bell,
  Plane,
  Radio,
  LayoutDashboard,
} from "lucide-react";

export type HrNavGroupId =
  | "attendance"
  | "reimbursements"
  | "requests"
  | "settings"
  | "people"
  | "masters";

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
  /**
   * When false, HrModuleShell omits the left contextual rail for this section
   * (content uses full module width). Default true.
   * Employees uses horizontal workspace tabs instead of a single-item sidebar.
   */
  showContextualSidebar?: boolean;
}

export interface HrBreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Contextual left-rail groups for the HR module.
 * Top navbar selects the parent; this rail shows only the active group’s links.
 *
 * Configuration masters live under Settings only.
 * Legacy policy/claims routes are remapped (see ROUTE_PREFIXES) so they do not
 * reappear as separate left-nav groups.
 */
export const HR_NAV_GROUPS: HrNavGroup[] = [
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
      { label: "Attendance Roster", href: "/hr/attendance/roster", icon: Users },
      { label: "Attendance Reports", href: "/hr/attendance/reports", icon: FileText },
      { label: "Attendance Sync", href: "/hr/attendance/sync", icon: Settings2 },
    ],
  },
  {
    id: "reimbursements",
    label: "Reimbursements",
    description: "Travel and expense claim approval",
    icon: Wallet,
    items: [
      { label: "Reimbursements", href: "/hr/reimbursements", icon: Wallet },
      { label: "Travel Requests", href: "/hr/travel-requests", icon: Plane },
    ],
  },
  {
    id: "requests",
    label: "Requests",
    description: "Temporary leave approval inbox",
    icon: ClipboardList,
    items: [
      { label: "Leave Requests", href: "/hr/requests", icon: ClipboardList },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Organization and HR configuration",
    icon: Settings,
    /** Full Settings IA is rendered by HrSettingsSidebar from settings-catalog. */
    items: [
      { label: "Overview", href: "/hr/settings", icon: Settings },
      { label: "Company Profile", href: "/hr/settings/organization/company", icon: Building2 },
      { label: "Branches", href: "/hr/settings/organization/branches", icon: GitBranch },
      { label: "Departments", href: "/hr/settings/organization/departments", icon: Network },
      { label: "Designations", href: "/hr/settings/organization/designations", icon: BadgeCheck },
      { label: "Employee Types", href: "/hr/settings/organization/employee-types", icon: Users },
      { label: "Employment Statuses", href: "/hr/settings/organization/employment-statuses", icon: UserCog },
      { label: "Leave Types", href: "/hr/settings/leave/leave-types", icon: Leaf },
      { label: "Leave Policies", href: "/hr/settings/leave/leave-policies", icon: ScrollText },
    ],
  },
  {
    id: "people",
    label: "Employees",
    description: "Manage employee records and profiles",
    icon: Users,
    items: [
      { label: "Employee Directory", href: "/hr/employees", icon: Users },
      { label: "Payroll", href: "/hr/payroll", icon: Wallet },
      { label: "HR Letters", href: "/hr/hr-letters", icon: ScrollText },
      { label: "Offboarding", href: "/hr/offboarding", icon: LogOut },
      { label: "Notifications", href: "/hr/notifications", icon: Bell },
    ],
  },
  {
    id: "masters",
    label: "Masters",
    description: "Legacy operational masters",
    icon: Target,
    items: [
      { label: "Monthly Targets", href: "/hr/masters/monthly-target", icon: Target },
      // TA/DA Policy (Legacy) removed from nav — route /hr/masters/tada-policy preserved
    ],
  },
];

/**
 * Legacy routes remap into operational/settings groups so left nav does not
 * resurrect removed mega-menu cards.
 */
const ROUTE_PREFIXES: { prefix: string; id: HrNavGroupId }[] = [
  { prefix: "/hr/settings", id: "settings" },
  { prefix: "/hr/notifications", id: "people" },
  // Legacy SF policy → Settings shell (Travel Policy is canonical)
  { prefix: "/hr/sales-force-policy", id: "settings" },
  { prefix: "/hr/reimbursements", id: "reimbursements" },
  { prefix: "/hr/travel-requests", id: "reimbursements" },
  // Legacy TA/DA claims → Reimbursements shell (route + store preserved)
  { prefix: "/hr/claims", id: "reimbursements" },
  { prefix: "/hr/requests", id: "requests" },
  { prefix: "/hr/sales-force-attendance", id: "attendance" },
  { prefix: "/hr/attendance", id: "attendance" },
  { prefix: "/hr/payroll", id: "people" },
  { prefix: "/hr/hr-letters", id: "people" },
  { prefix: "/hr/offboarding", id: "people" },
  { prefix: "/hr/employees", id: "people" },
  { prefix: "/hr/masters", id: "masters" },
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

/** Whether this HR section renders the left contextual sidebar. */
export function hrSectionShowsContextualSidebar(id: HrNavGroupId): boolean {
  return getHrNavGroup(id).showContextualSidebar !== false;
}

/** Active link detection — operational routes only (config tabs removed from Attendance). */
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

  // Exact match for settings home; prefix for nested routes
  if (baseNorm === "/hr/settings") {
    return path === "/hr/settings";
  }
  if (baseNorm === "/hr/sales-force-attendance") {
    // Legacy SF route redirects to dashboard — keep highlight on Dashboard when redirected
    return path === baseNorm || path === "/hr/attendance/dashboard";
  }
  // Employee Directory — list, create, profile, and edit
  if (baseNorm === "/hr/employees") {
    return path === "/hr/employees" || path.startsWith("/hr/employees/");
  }
  if (baseNorm === "/hr/hr-letters") {
    return path === "/hr/hr-letters" || path.startsWith("/hr/hr-letters/");
  }
  if (baseNorm === "/hr/payroll") {
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
    // Do not highlight Reimbursements when on legacy TA/DA claim routes
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
      // Lazy path parse without importing settings catalog into every consumer cycle
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
  return [{ label: "HR", href: "/hr/attendance/dashboard" }, ...crumbs];
}
