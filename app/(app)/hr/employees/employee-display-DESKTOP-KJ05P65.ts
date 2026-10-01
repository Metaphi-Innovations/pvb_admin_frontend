/**
 * Employee display helpers — labels, profile completion, filter option derivation.
 */

import { BRANCH_OPTIONS, EMPLOYEE_TYPE_OPTIONS, EMPLOYMENT_STATUS_OPTIONS } from "@/lib/hr/config";
import {
  loadMandatoryProfileSections,
  getMandatoryDocumentFieldChecks,
  type MandatoryProfileSectionConfig,
  type MandatoryProfileSectionId,
} from "../settings/onboarding-data";
import {
  getBranchLabelFromMaster,
  getEmployeeTypeLabelFromMaster,
  getEmployeeTypeSelectOptions,
} from "../settings/organization-data";
import type {
  EmploymentStatus,
  EmployeeRecordStatus,
  EmployeeType,
  HrEmployee,
} from "./employee-master-data";

function filled(v: string | null | undefined): boolean {
  return !!v && String(v).trim().length > 0 && v !== "—";
}

/** Field-level checks reused from existing profile completion — grouped by section. */
function sectionFieldChecks(
  e: HrEmployee,
): Record<MandatoryProfileSectionId, Array<{ label: string; ok: boolean }>> {
  const documentChecks = getMandatoryDocumentFieldChecks(e.documents);
  return {
    personal: [
      { label: "Full name", ok: filled(e.employeeName) },
      { label: "Mobile", ok: filled(e.mobileNumber) },
      { label: "Company email", ok: filled(e.emailId) },
      { label: "Date of birth", ok: filled(e.personal?.dateOfBirth) },
      { label: "Gender", ok: filled(e.personal?.gender) },
      { label: "Current address", ok: filled(e.contact?.currentAddress?.line1) },
      { label: "Emergency contact", ok: filled(e.emergency?.contactName) },
    ],
    employment: [
      { label: "Department", ok: filled(e.department) },
      { label: "Designation", ok: filled(e.designation) },
      { label: "Branch", ok: filled(e.branch) },
      { label: "Employee type", ok: !!e.employeeType },
      { label: "Employment status", ok: !!e.employmentStatus },
      { label: "Date of joining", ok: filled(e.dateOfJoining) },
      { label: "Reporting manager", ok: e.reportingManagerId != null },
    ],
    bank: [{ label: "Bank account", ok: filled(e.bank?.accountNumber) }],
    "government-ids": [{ label: "PAN", ok: filled(e.governmentIds?.pan) }],
    education: [{ label: "Education", ok: (e.education?.length ?? 0) > 0 }],
    experience: [{ label: "Experience", ok: (e.experience?.length ?? 0) > 0 }],
    documents:
      documentChecks.length > 0
        ? documentChecks
        : [{ label: "Documents", ok: (e.documents?.length ?? 0) > 0 }],
  };
}

/**
 * Profile completion driven by Mandatory Profile Sections settings.
 * Optional sections are excluded from filled/total and do not block 100%.
 */
export function getEmployeeProfileCompletion(
  e: HrEmployee,
  sectionConfig?: MandatoryProfileSectionConfig[],
): {
  percent: number;
  filled: number;
  total: number;
  missingLabels: string[];
} {
  const config = sectionConfig ?? loadMandatoryProfileSections();
  const bySection = sectionFieldChecks(e);
  const checks: Array<{ label: string; ok: boolean }> = [];

  for (const section of config) {
    if (!section.mandatory) continue;
    const fields = bySection[section.id];
    if (fields) checks.push(...fields);
  }

  let filledCount = 0;
  const missingLabels: string[] = [];
  for (const c of checks) {
    if (c.ok) filledCount += 1;
    else missingLabels.push(c.label);
  }
  const total = checks.length;
  return {
    percent: total === 0 ? 100 : Math.round((filledCount / total) * 100),
    filled: filledCount,
    total,
    missingLabels,
  };
}

export function formatProfileCompletion(e: HrEmployee): string {
  return `${getEmployeeProfileCompletion(e).percent}%`;
}

export function getEmploymentStatusLabel(status: EmploymentStatus): string {
  const map: Record<EmploymentStatus, string> = {
    active: "Active",
    probation: "On Probation",
    notice: "Notice Period",
    resigned: "Exit",
    terminated: "Terminated",
  };
  return map[status] ?? status;
}

export function getEmployeeTypeLabel(type: EmployeeType): string {
  try {
    return getEmployeeTypeLabelFromMaster(type);
  } catch {
    return EMPLOYEE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
  }
}

export function getRecordStatusLabel(status: EmployeeRecordStatus): string {
  return status === "active" ? "Active" : "Inactive";
}

export function getBranchDisplayLabel(branchValue: string): string {
  if (!branchValue) return "—";
  try {
    const fromMaster = getBranchLabelFromMaster(branchValue);
    const legacy = BRANCH_OPTIONS.find((b) => b.value === branchValue);
    if (legacy && fromMaster === branchValue) return legacy.label;
    if (fromMaster && fromMaster !== "—") return fromMaster;
  } catch {
    /* org store optional */
  }
  const hit = BRANCH_OPTIONS.find((b) => b.value === branchValue);
  return hit?.label ?? branchValue;
}

export function formatDateDisplay(iso: string): string {
  if (!iso) return "—";
  // Prefer strict ISO calendar dates; fall back for legacy values
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
    const d = new Date(`${iso.trim()}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function getEmployeeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export type EmployeeFilterOption = { value: string; label: string };

export function buildEmployeeFilterOptions(
  employees: HrEmployee[],
  org?: {
    branchNames?: string[];
    departmentNames?: string[];
    designationNames?: string[];
  },
): {
  branches: EmployeeFilterOption[];
  departments: EmployeeFilterOption[];
  designations: EmployeeFilterOption[];
  managers: EmployeeFilterOption[];
  employeeTypes: EmployeeFilterOption[];
  employmentStatuses: EmployeeFilterOption[];
} {
  const branchSet = new Map<string, string>();
  const deptSet = new Set<string>();
  const desigSet = new Set<string>();
  const mgrMap = new Map<string, string>();

  for (const e of employees) {
    if (e.branch) branchSet.set(e.branch, getBranchDisplayLabel(e.branch));
    if (e.department) deptSet.add(e.department);
    if (e.designation) desigSet.add(e.designation);
    if (e.reportingManagerId != null) {
      mgrMap.set(String(e.reportingManagerId), e.reportingManagerName || `Manager #${e.reportingManagerId}`);
    }
  }

  org?.branchNames?.forEach((n) => {
    if (n && ![...branchSet.values()].includes(n) && !branchSet.has(n)) branchSet.set(n, n);
  });
  org?.departmentNames?.forEach((n) => {
    if (n) deptSet.add(n);
  });
  org?.designationNames?.forEach((n) => {
    if (n) desigSet.add(n);
  });

  const sortOpts = (a: EmployeeFilterOption, b: EmployeeFilterOption) =>
    a.label.localeCompare(b.label);

  let employeeTypes: EmployeeFilterOption[];
  try {
    employeeTypes = getEmployeeTypeSelectOptions();
  } catch {
    employeeTypes = EMPLOYEE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  }

  return {
    branches: [...branchSet.entries()].map(([value, label]) => ({ value, label })).sort(sortOpts),
    departments: [...deptSet].map((v) => ({ value: v, label: v })).sort(sortOpts),
    designations: [...desigSet].map((v) => ({ value: v, label: v })).sort(sortOpts),
    managers: [...mgrMap.entries()].map(([value, label]) => ({ value, label })).sort(sortOpts),
    employeeTypes,
    employmentStatuses: EMPLOYMENT_STATUS_OPTIONS.map((o) => ({
      value: o.value,
      label: getEmploymentStatusLabel(o.value as EmploymentStatus),
    })),
  };
}

export const PROFILE_NAV_SECTIONS = [
  { id: "personal", label: "Personal Details" },
  { id: "employment", label: "Employment Details" },
  { id: "bank", label: "Bank Details" },
  { id: "government-ids", label: "Government / Statutory IDs" },
  { id: "education", label: "Education" },
  { id: "experience", label: "Experience" },
  { id: "documents", label: "Documents" },
  { id: "onboarding", label: "Onboarding" },
  { id: "attendance", label: "Attendance" },
  { id: "leave", label: "Leave & Balance" },
  { id: "payroll", label: "Salary / Payroll" },
  { id: "letters", label: "HR Letters" },
  { id: "offboarding", label: "Offboarding" },
  { id: "timeline", label: "Timeline" },
] as const;

export type ProfileSectionId = (typeof PROFILE_NAV_SECTIONS)[number]["id"];
