/**
 * Settings Overview — derive recommendations from actual local configuration completeness.
 * Client-only; does not invent missing modules.
 */

import { loadCompanyProfile, loadBranches, loadDepartments, loadDesignations } from "../organization-data";
import { loadShifts } from "../shift-setup-data";
import { loadHolidayCalendars } from "../holiday-calendar-data";
import { loadAttendancePolicies } from "../attendance-policy-data";
import { loadLeaveTypes, loadLeavePolicies } from "../leave-data";
import { loadSalaryComponents } from "../salary-components-data";
import { loadSalaryStructures } from "../salary-structures-data";
import { loadHrTemplates } from "../hr-template-data";
import { SETTINGS_GROUPS } from "./settings-catalog";

export type OverviewRecommendation = {
  title: string;
  description: string;
  href: string;
};

function filled(v: string | null | undefined): boolean {
  return !!v && String(v).trim().length > 0;
}

/** Company Profile considered complete when core legal identity fields are present. */
export function isCompanyProfileConfigured(): boolean {
  try {
    const c = loadCompanyProfile();
    return (
      filled(c.companyName) &&
      filled(c.legalName) &&
      filled(c.gstin) &&
      filled(c.pan) &&
      filled(c.addressLine1)
    );
  } catch {
    return false;
  }
}

export function getSettingsOverviewRecommendations(limit = 3): OverviewRecommendation[] {
  const out: OverviewRecommendation[] = [];

  try {
    if (!isCompanyProfileConfigured()) {
      out.push({
        title: "Complete Company Profile",
        description: "Legal name, GST, PAN, and address used on HR letters.",
        href: "/hr/settings/organization/company",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const branches = loadBranches().filter((b) => b.status === "active");
    if (branches.length === 0) {
      out.push({
        title: "Add Branches",
        description: "At least one active branch is required for employee assignment.",
        href: "/hr/settings/organization/branches",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const depts = loadDepartments().filter((d) => d.status === "active");
    if (depts.length === 0) {
      out.push({
        title: "Set up Departments",
        description: "Define org structure used across employee records.",
        href: "/hr/settings/organization/departments",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const desigs = loadDesignations().filter((d) => d.status === "active");
    if (desigs.length === 0) {
      out.push({
        title: "Set up Designations",
        description: "Job titles used on employee records and policies.",
        href: "/hr/settings/organization/designations",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const shifts = loadShifts().filter((s) => s.status === "active");
    if (shifts.length === 0) {
      out.push({
        title: "Configure Shift Setup",
        description: "Working hours and weekly offs for attendance.",
        href: "/hr/settings/attendance/shift-setup",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const calendars = loadHolidayCalendars();
    if (calendars.length === 0) {
      out.push({
        title: "Set up Holiday Calendar",
        description: "Public and optional holidays for attendance and leave.",
        href: "/hr/settings/attendance/holiday-calendar",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    if (loadAttendancePolicies().filter((p) => p.status === "active").length === 0) {
      out.push({
        title: "Create Attendance Policy",
        description: "Assignable attendance rules for employees.",
        href: "/hr/settings/attendance/attendance-policy",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    if (loadLeaveTypes().filter((t) => t.status === "active").length === 0) {
      out.push({
        title: "Define Leave Types",
        description: "Types used for balances and applications.",
        href: "/hr/settings/leave/leave-types",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    if (loadLeavePolicies().filter((p) => p.status === "active").length === 0) {
      out.push({
        title: "Create Leave Policies",
        description: "Credit and carry-forward rules for employees.",
        href: "/hr/settings/leave/leave-policies",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    if (loadSalaryComponents().length === 0) {
      out.push({
        title: "Add Salary Components",
        description: "Earnings and deductions for salary structures.",
        href: "/hr/settings/payroll/salary-components",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    if (loadSalaryStructures().filter((s) => s.status === "active").length === 0) {
      out.push({
        title: "Create Salary Structures",
        description: "Templates assigned on employee payroll profiles.",
        href: "/hr/settings/payroll/salary-structures",
      });
    }
  } catch {
    /* ignore */
  }

  try {
    if (loadHrTemplates().filter((t) => t.status === "active").length === 0) {
      out.push({
        title: "Add Templates",
        description: "Payslip and HR letter templates for generation.",
        href: "/hr/settings/templates",
      });
    }
  } catch {
    /* ignore */
  }

  return out.slice(0, limit);
}

/** Focus area derived from the top incomplete recommendation. */
export function getSettingsFocusArea(): string {
  const recs = getSettingsOverviewRecommendations(1);
  if (recs.length === 0) return "All core settings ready";

  const href = recs[0].href;
  for (const group of SETTINGS_GROUPS) {
    if (group.items.some((i) => i.href && href.startsWith(i.href.split("?")[0]))) {
      return group.label;
    }
  }
  return "Organization Setup";
}
