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
  /**
   * When true (default for available), item appears in the Settings sidebar.
   * Future/planned items stay in the catalog for metadata but are hidden from nav.
   */
  showInNav?: boolean;
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

/**
 * HR Settings IA — canonical sources of truth.
 * Future/planned items remain in the catalog (status: coming_soon, showInNav: false)
 * so they do not clutter the production sidebar or inflate core readiness %.
 */
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: "organization",
    label: "Organization Setup",
    description:
      "CLOSED — Company Profile, Branches, Departments, Designations, Employee Types, Employment Statuses.",
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
    description:
      "CLOSED — Mandatory Documents, Joining Checklist, Welcome Workflow, Mandatory Profile Sections.",
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
        description: "Which profile sections count toward completion %",
        href: "/hr/settings/onboarding/mandatory-profile",
        icon: ListChecks,
        status: "available",
      },
    ],
  },
  {
    id: "attendance",
    label: "Attendance Settings",
    description: "CLOSED — Shift, Holiday Calendar, Policy, Modes (canonical only).",
    icon: Timer,
    items: [
      {
        id: "shift",
        label: "Shift Setup",
        description: "Working hours, grace, break, and weekly offs",
        href: "/hr/settings/attendance/shift-setup",
        icon: Timer,
        status: "available",
      },
      {
        id: "holiday-cal",
        label: "Holiday Calendar",
        description: "Public and optional holiday dates (canonical)",
        href: "/hr/settings/attendance/holiday-calendar",
        icon: CalendarDays,
        status: "available",
      },
      {
        id: "att-policy",
        label: "Attendance Policy",
        description: "Reusable attendance rules assignable to employees",
        href: "/hr/settings/attendance/attendance-policy",
        icon: Shield,
        status: "available",
      },
      {
        id: "attendance-modes",
        label: "Attendance Modes",
        description: "Mobile / location / face capture configuration (not a second holiday or shift master)",
        href: "/hr/settings/attendance/attendance-modes",
        icon: Smartphone,
        status: "available",
      },
    ],
  },
  {
    id: "leave",
    label: "Leave Settings",
    description: "CLOSED — Leave Types + Leave Policies. Holidays from Attendance → Holiday Calendar.",
    icon: Leaf,
    items: [
      {
        id: "leave-types",
        label: "Leave Types",
        description: "Paid/unpaid leave type master",
        href: "/hr/settings/leave/leave-types",
        icon: Leaf,
        status: "available",
      },
      {
        id: "leave-policies",
        label: "Leave Policies",
        description: "Per-type monthly/yearly entitlement and carry-forward",
        href: "/hr/settings/leave/leave-policies",
        icon: ScrollText,
        status: "available",
      },
    ],
  },
  {
    id: "payroll",
    label: "Payroll Settings",
    description:
      "CLOSED — Components, Structures, Cycle, LOP. Payslip layout → Template Management.",
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
        description: "Reusable CTC calculation templates",
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
    ],
  },
  {
    id: "reimbursement",
    label: "Reimbursement Settings",
    description:
      "CLOSED — Travel Policy (core). Expense Categories are future (generic reimbursement).",
    icon: Plane,
    items: [
      {
        id: "travel-policy",
        label: "Travel Policy",
        description: "Entitlements, city class, KM, exclusions and claim rules",
        href: "/hr/settings/reimbursement/travel-policy",
        icon: Plane,
        status: "available",
      },
      {
        id: "expense-cats",
        label: "Expense Categories",
        description:
          "General employee reimbursement categories (future — not used by Travel Claims)",
        icon: Receipt,
        status: "coming_soon",
        showInNav: false,
      },
    ],
  },
  {
    id: "statutory",
    label: "Statutory Compliance",
    description: "CLOSED — PF, ESI, Professional Tax, LWF (canonical payroll rule sources).",
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
    description:
      "CLOSED — Tax Regime + TDS Settings (core). Declaration Categories / Form 16 are future.",
    icon: Scale,
    items: [
      {
        id: "tax-regime",
        label: "Tax Regime",
        description: "Old / new regime defaults and standard deduction",
        href: "/hr/settings/tax/tax-regime",
        icon: Scale,
        status: "available",
      },
      {
        id: "tds",
        label: "TDS Settings",
        description: "Income-tax slabs and cess for TDS projection",
        href: "/hr/settings/tax/tds",
        icon: Calculator,
        status: "available",
      },
      {
        id: "declaration-cats",
        label: "Declaration Categories",
        description: "Investment sections (future — not used by current Payroll/TDS)",
        icon: ListChecks,
        status: "coming_soon",
        showInNav: false,
      },
      {
        id: "form16",
        label: "Form 16 Configuration",
        description: "Form 16 Part B setup (future — not generated yet)",
        icon: FileText,
        status: "coming_soon",
        showInNav: false,
      },
    ],
  },
  {
    id: "letters",
    label: "HR Letter Settings",
    description:
      "CLOSED — Template Management is canonical. Issue Rules are future.",
    icon: FileText,
    items: [
      {
        id: "template-management",
        label: "Template Management",
        description: "Payslip, offer, appointment, and other HR templates",
        href: "/hr/settings/templates",
        icon: FileText,
        status: "available",
      },
      {
        id: "issue-rules",
        label: "Issue Rules",
        description: "When letters can be issued (future — not consumed yet)",
        icon: Shield,
        status: "coming_soon",
        showInNav: false,
      },
    ],
  },
  {
    id: "notifications",
    label: "Notification Settings",
    description:
      "CLOSED — HR Notifications (in-app). Email delivery / Push / Scheduler are future infrastructure.",
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

function isNavVisible(item: SettingsNavItem): boolean {
  if (item.status !== "available" || !item.href) return false;
  if (item.showInNav === false) return false;
  return true;
}

/** Flat sidebar links: Overview + available (non-future) category items only. */
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
    const visible = group.items.filter(isNavVisible);
    visible.forEach((item, index) => {
      items.push({
        id: `${group.id}-${item.id}`,
        label: item.label,
        href: item.href,
        icon: item.icon,
        sectionLabel: index === 0 ? group.label : undefined,
        status: "available",
      });
    });
  }

  return items;
}

/**
 * Core vs future readiness.
 * Core = available items (implemented screens).
 * Future = coming_soon items (intentionally not built — do not reduce core %).
 */
export function getSettingsProgress() {
  const all = SETTINGS_GROUPS.flatMap((g) => g.items);
  const coreItems = all.filter((i) => i.status === "available");
  const futureItems = all.filter((i) => i.status === "coming_soon");
  const categoriesWithCore = SETTINGS_GROUPS.filter((g) =>
    g.items.some((i) => i.status === "available"),
  ).length;

  return {
    /** @deprecated use coreReadyCount — kept for callers */
    availableCount: coreItems.length,
    /** @deprecated use coreTotalCount */
    totalCount: coreItems.length,
    coreReadyCount: coreItems.length,
    coreTotalCount: coreItems.length,
    futureCount: futureItems.length,
    categoriesReady: categoriesWithCore,
    categoriesTotal: SETTINGS_GROUPS.length,
  };
}

export function getCoreSettingsItems(): SettingsNavItem[] {
  return SETTINGS_GROUPS.flatMap((g) => g.items.filter((i) => i.status === "available"));
}

export function getFutureSettingsItems(): SettingsNavItem[] {
  return SETTINGS_GROUPS.flatMap((g) => g.items.filter((i) => i.status === "coming_soon"));
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

  if (hrefQuery) {
    return path === hrefPath && queryMatches(hrefQuery);
  }

  const isExact = path === hrefPath;
  const isChild = path.startsWith(`${hrefPath}/`);
  if (!isExact && !isChild) return false;

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

  const betterSibling = allHrefs.some((other) => {
    if (!other || other === href) return false;
    const [op, oq = ""] = other.split("?");
    const otherPath = normalizeSettingsPath(op);
    if (otherPath === "/hr/settings") return false;
    if (otherPath === hrefPath) return false;
    if (!(path === otherPath || path.startsWith(`${otherPath}/`))) return false;
    if (otherPath.length > hrefPath.length) return true;
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
