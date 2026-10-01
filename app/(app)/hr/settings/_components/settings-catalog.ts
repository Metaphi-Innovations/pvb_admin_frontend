import type { LucideIcon } from "lucide-react";
import {
  Building2,
  GitBranch,
  Network,
  BadgeCheck,
  Users,
  UserCog,
  ClipboardList,
  FileCheck,
  ListChecks,
  Sparkles,
  Timer,
  CalendarDays,
  Shield,
  Smartphone,
  Leaf,
  ScrollText,
  Calculator,
  Wallet,
  FileText,
  Plane,
  Receipt,
  Landmark,
  Scale,
  Bell,
  Mail,
  LayoutDashboard,
} from "lucide-react";

export type SettingsItemStatus = "available" | "coming_soon";

export interface SettingsNavItem {
  id: string;
  label: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  status: SettingsItemStatus;
}

export interface SettingsGroup {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  items: SettingsNavItem[];
}

export interface SettingsSidebarLink {
  id: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  sectionLabel?: string;
  status: SettingsItemStatus;
}

/** HR Settings IA — Organization Setup is available; other categories are planned. */
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: "organization",
    label: "Organization Setup",
    description: "Company identity and structural masters used across HR.",
    icon: Building2,
    items: [
      {
        id: "company",
        label: "Company Profile",
        description: "Legal name, tax IDs, and registered address",
        href: "/hr/settings/organization/company",
        icon: Building2,
        status: "available",
      },
      {
        id: "branches",
        label: "Branches",
        description: "Head office, branches, and work locations",
        href: "/hr/settings/organization/branches",
        icon: GitBranch,
        status: "available",
      },
      {
        id: "departments",
        label: "Departments",
        description: "Organizational departments",
        href: "/hr/settings/organization/departments",
        icon: Network,
        status: "available",
      },
      {
        id: "designations",
        label: "Designations",
        description: "Job titles and levels",
        href: "/hr/settings/organization/designations",
        icon: BadgeCheck,
        status: "available",
      },
      {
        id: "employee-types",
        label: "Employee Types",
        description: "Permanent, contract, intern, and more",
        href: "/hr/settings/organization/employee-types",
        icon: Users,
        status: "available",
      },
      {
        id: "employment-statuses",
        label: "Employment Statuses",
        description: "Active, probation, notice, exited",
        href: "/hr/settings/organization/employment-statuses",
        icon: UserCog,
        status: "available",
      },
    ],
  },
  {
    id: "onboarding",
    label: "Employee Onboarding Setup",
    description: "Joiner checklist and welcome configuration.",
    icon: ClipboardList,
    items: [
      {
        id: "mandatory-docs",
        label: "Mandatory Documents",
        description: "Documents required at joining",
        href: "/hr/settings/onboarding/mandatory-documents",
        icon: FileCheck,
        status: "available",
      },
      {
        id: "joining-checklist",
        label: "Joining Checklist",
        description: "Admin checklist for day-one readiness",
        href: "/hr/settings/onboarding/joining-checklist",
        icon: ClipboardList,
        status: "available",
      },
      {
        id: "welcome-workflow",
        label: "Welcome Workflow",
        description: "Invitation and welcome steps",
        href: "/hr/settings/onboarding/welcome-workflow",
        icon: Sparkles,
        status: "available",
      },
      {
        id: "mandatory-profile",
        label: "Mandatory Profile Sections",
        description: "Which profile blocks count toward completion",
        href: "/hr/settings/onboarding/mandatory-profile",
        icon: UserCog,
        status: "available",
      },
    ],
  },
  {
    id: "attendance",
    label: "Attendance Settings",
    description: "Shifts, offs, holidays, and capture policy.",
    icon: Timer,
    items: [
      {
        id: "shift",
        label: "Shift Setup",
        description: "Working hours and grace",
        href: "/hr/settings/attendance/shift-setup",
        icon: Timer,
        status: "available", // unlocked — live Shift Setup master
      },
      {
        id: "holiday-cal",
        label: "Holiday Calendar",
        description: "Public and optional holiday dates",
        href: "/hr/settings/attendance/holiday-calendar",
        icon: CalendarDays,
        status: "available",
      },
      { id: "att-policy", label: "Attendance Policy", description: "Reusable attendance rules assignable to employees", href: "/hr/settings/attendance/attendance-policy", icon: Shield, status: "available" },
      {
        id: "attendance-modes",
        label: "Attendance Modes",
        description: "Mobile punch, office location, and face verification",
        href: "/hr/settings/attendance/attendance-modes",
        icon: Smartphone,
        status: "available",
      },
    ],
  },
  {
    id: "leave",
    label: "Leave and Holiday Settings",
    description: "Leave types and policies.",
    icon: Leaf,
    items: [
      {
        id: "leave-types",
        label: "Leave Types",
        description: "Casual, sick, optional, and custom types",
        href: "/hr/settings/leave/leave-types",
        icon: Leaf,
        status: "available",
      },
      {
        id: "leave-policies",
        label: "Leave Policies",
        description: "Eligibility and carry-forward",
        href: "/hr/settings/leave/leave-policies",
        icon: ScrollText,
        status: "available",
      },
      {
        id: "leave-holiday",
        label: "Holiday Calendar",
        description: "Optional holiday dates (Attendance)",
        href: "/hr/settings/attendance/holiday-calendar",
        icon: CalendarDays,
        status: "available",
      },
    ],
  },
  {
    id: "payroll",
    label: "Payroll Settings",
    description: "Salary structures and payroll cycle.",
    icon: Wallet,
    items: [
      {
        id: "salary-components",
        label: "Salary Components",
        description: "Earnings, deductions, and contributions",
        href: "/hr/settings/payroll/salary-components",
        icon: Wallet,
        status: "available",
      },
      {
        id: "salary-structures",
        label: "Salary Structures",
        description: "Structure templates",
        href: "/hr/settings/payroll/salary-structures",
        icon: FileText,
        status: "available",
      },
      {
        id: "payroll-cycle",
        label: "Payroll Cycle",
        description: "Cut-off and pay dates",
        href: "/hr/settings/payroll/payroll-cycle",
        icon: CalendarDays,
        status: "available",
      },
      {
        id: "lop-rules",
        label: "LOP Rules",
        description: "Loss of pay calculation",
        href: "/hr/settings/payroll/lop-rules",
        icon: Calculator,
        status: "available",
      },
      {
        id: "payslip-template",
        label: "Payslip Template",
        description: "Managed in Template Management",
        href: "/hr/settings/templates?type=payslip",
        icon: FileText,
        status: "available",
      },
    ],
  },
  {
    id: "reimbursement",
    label: "Reimbursement Settings",
    description: "Central Travel Policy plus non-travel expense categories.",
    icon: Plane,
    items: [
      {
        id: "travel-policy",
        label: "Travel Policy",
        description: "Sales Force Travel Policy — entitlements, city class, KM, exclusions and claim rules",
        href: "/hr/settings/reimbursement/travel-policy",
        icon: Plane,
        status: "available",
      },
      {
        id: "expense-cats",
        label: "Expense Categories",
        description: "Non-travel claim types (mobile, medical, office, other)",
        icon: Receipt,
        status: "coming_soon",
      },
    ],
  },
  {
    id: "statutory",
    label: "Statutory Compliance",
    description: "PF, ESI, PT, and LWF configuration.",
    icon: Landmark,
    items: [
      {
        id: "pf",
        label: "PF",
        description: "Provident Fund / EPF contribution rules",
        href: "/hr/settings/statutory/pf",
        icon: Landmark,
        status: "available",
      },
      {
        id: "esi",
        label: "ESI",
        description: "ESI eligibility and contribution rules",
        href: "/hr/settings/statutory/esi",
        icon: Landmark,
        status: "available",
      },
      {
        id: "pt",
        label: "Professional Tax",
        description: "State-wise PT rules and slabs",
        href: "/hr/settings/statutory/professional-tax",
        icon: Scale,
        status: "available",
      },
      {
        id: "lwf",
        label: "LWF",
        description: "State-wise Labour Welfare Fund rules",
        href: "/hr/settings/statutory/lwf",
        icon: Scale,
        status: "available",
      },
    ],
  },
  {
    id: "tax",
    label: "Tax Settings",
    description: "Tax regime and Form 16 configuration.",
    icon: Scale,
    items: [
      {
        id: "tax-regime",
        label: "Tax Regime",
        description: "Old / new regime defaults",
        href: "/hr/settings/tax/tax-regime",
        icon: Scale,
        status: "available",
      },
      { id: "declaration-cats", label: "Declaration Categories", description: "Investment sections", icon: ListChecks, status: "coming_soon" },
      {
        id: "tds",
        label: "TDS Settings",
        description: "TDS calculation rules and income slabs",
        href: "/hr/settings/tax/tds",
        icon: Calculator,
        status: "available",
      },
      { id: "form16", label: "Form 16 Configuration", description: "Form 16 Part B setup", icon: FileText, status: "coming_soon" },
    ],
  },
  {
    id: "letters",
    label: "HR Letter Settings",
    description: "Offer, appointment, and other letter templates.",
    icon: Mail,
    items: [
      {
        id: "template-management",
        label: "Template Management",
        description: "Central HR document templates",
        href: "/hr/settings/templates",
        icon: FileText,
        status: "available",
      },
      { id: "issue-rules", label: "Issue Rules", description: "When letters can be issued", icon: Shield, status: "coming_soon" },
    ],
  },
  {
    id: "notifications",
    label: "Notification Settings",
    description: "Central HR event notifications for employees, managers and HR.",
    icon: Bell,
    items: [
      {
        id: "hr-notifications",
        label: "HR Notifications",
        description: "Event recipients, channels, reminders, and in-app delivery",
        href: "/hr/settings/notifications",
        icon: Bell,
        status: "available",
      },
    ],
  },
];

/** Flat sidebar links: Overview + all category items (section labels between groups). */
export function buildSettingsSidebarLinks(): SettingsSidebarLink[] {
  const overview: SettingsSidebarLink = {
    id: "overview",
    label: "Overview",
    href: "/hr/settings",
    icon: LayoutDashboard,
    status: "available",
  };

  const items: SettingsSidebarLink[] = [overview];

  for (const group of SETTINGS_GROUPS) {
    group.items.forEach((item, index) => {
      const unlocked = item.status === "available" && !!item.href;
      items.push({
        id: `${group.id}-${item.id}`,
        label: item.label,
        href: unlocked ? item.href : undefined,
        icon: item.icon,
        sectionLabel: index === 0 ? group.label : undefined,
        status: unlocked ? "available" : "coming_soon",
      });
    });
  }

  return items;
}

export function getSettingsProgress() {
  const all = SETTINGS_GROUPS.flatMap((g) => g.items);
  const available = all.filter((i) => i.status === "available").length;
  const categoriesReady = SETTINGS_GROUPS.filter((g) =>
    g.items.some((i) => i.status === "available"),
  ).length;
  return {
    availableCount: available,
    totalCount: all.length,
    categoriesReady,
    categoriesTotal: SETTINGS_GROUPS.length,
  };
}

function normalizeSettingsPath(path: string): string {
  const p = path.split("?")[0].replace(/\/$/, "");
  return p || "/";
}

/**
 * HR Settings sidebar active-state helper.
 * - Exact page match for leaf routes
 * - Prefix match only for genuine child paths of the same item
 * - Query-bearing hrefs (e.g. ?type=payslip) win over path-only siblings
 * - Never activates two siblings that share an overlapping path segment
 */
export function isSettingsMenuItemActive(
  pathname: string,
  search: string,
  href: string | undefined,
  allHrefs: readonly (string | undefined)[] = [],
): boolean {
  if (!href) return false;

  const path = normalizeSettingsPath(pathname);
  const [hrefPathRaw, hrefQuery = ""] = href.split("?");
  const hrefPath = normalizeSettingsPath(hrefPathRaw);

  if (hrefPath === "/hr/settings") {
    return path === "/hr/settings";
  }

  const have = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  const queryMatches = (query: string) => {
    if (!query) return true;
    const want = new URLSearchParams(query);
    for (const [k, v] of want.entries()) {
      if (have.get(k) !== v) return false;
    }
    return true;
  };

  // Query-specific link: exact path + required query params
  if (hrefQuery) {
    return path === hrefPath && queryMatches(hrefQuery);
  }

  // Path must match exactly or be a child of this href
  const isExact = path === hrefPath;
  const isChild = path.startsWith(`${hrefPath}/`);
  if (!isExact && !isChild) return false;

  // If a sibling with the same path + matching query exists, defer to that sibling
  if (isExact) {
    const querySiblingWins = allHrefs.some((other) => {
      if (!other || other === href) return false;
      const [op, oq = ""] = other.split("?");
      if (normalizeSettingsPath(op) !== hrefPath || !oq) return false;
      return queryMatches(oq);
    });
    if (querySiblingWins) return false;
    return true;
  }

  // Child-route prefix: only win if no longer/more-specific sibling path also matches
  const betterSibling = allHrefs.some((other) => {
    if (!other || other === href) return false;
    const [op, oq = ""] = other.split("?");
    const otherPath = normalizeSettingsPath(op);
    if (otherPath === "/hr/settings") return false;
    if (otherPath === hrefPath) return false;
    if (!(path === otherPath || path.startsWith(`${otherPath}/`))) return false;
    // Prefer longer path prefix
    if (otherPath.length > hrefPath.length) return true;
    // Prefer query-exact sibling on exact other path
    if (path === otherPath && oq && queryMatches(oq)) return true;
    return false;
  });

  return !betterSibling;
}

export function resolveSettingsNavLabel(
  pathname: string,
  search = "",
): string | null {
  if (pathname === "/hr/settings" || pathname === "/hr/settings/") return "Overview";

  const candidates: { label: string; href: string }[] = [];
  for (const group of SETTINGS_GROUPS) {
    for (const item of group.items) {
      if (!item.href || item.status !== "available") continue;
      candidates.push({ label: item.label, href: item.href });
    }
  }
  const allHrefs = candidates.map((c) => c.href);
  const hit = candidates.find((c) =>
    isSettingsMenuItemActive(pathname, search, c.href, allHrefs),
  );
  return hit?.label ?? null;
}
