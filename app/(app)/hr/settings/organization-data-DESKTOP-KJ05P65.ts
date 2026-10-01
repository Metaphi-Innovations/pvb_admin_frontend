/**
 * HR Organization Setup — canonical masters for Company, Branches, Departments,
 * Designations, Employee Types, Employment Statuses (frontend/demo localStorage).
 *
 * CLOSED CORE — consumed by Employee Employment, Welcome/Checklist (type slug),
 * Travel Policy (designation + Branch city), PT/LWF (Branch.state), Templates (Company).
 *
 * Legacy FALLBACK retained (do not delete for freeze):
 * - BRANCH_OPTIONS / BRANCH_SLUG_STATE for pre–org-master employee branch slugs & PT/LWF
 * - includeCurrent on select options for inactive/historical assignments
 *
 * No backend / migration. Do not cascade-delete masters in use.
 */

import { BRANCH_OPTIONS, CURRENT_USER } from "@/lib/hr/config";
import {
  loadPolicyList,
  savePolicyList,
  nextPolicyId,
  policyToday,
  type PolicyStatus,
} from "@/lib/hr/policy-common";

export { policyToday };
export type { PolicyStatus };

/** v3 — expanded company profile fields; branches v3 = address lines + phone split */
const KEYS = {
  company: "ds_hr_org_company_v3",
  branches: "ds_hr_org_branches_v3",
  departments: "ds_hr_org_departments_v2",
  designations: "ds_hr_org_designations_v2",
  employeeTypes: "ds_hr_org_employee_types_v3",
  employmentStatuses: "ds_hr_org_employment_statuses_v2",
} as const;

const BRANCHES_LEGACY_KEY = "ds_hr_org_branches_v2";

export interface OrgAudit {
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile extends OrgAudit {
  companyName: string;
  legalName: string;
  companyCode: string;
  industry: string;
  /** ISO yyyy-mm-dd */
  dateOfIncorporation: string;
  gstin: string;
  pan: string;
  cin: string;
  pfRegistration: string;
  esiRegistration: string;
  ptRegistration: string;
  lwfRegistration: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  hrContactName: string;
  hrContactEmail: string;
  hrContactPhoneCountryCode: string;
  hrContactPhoneNumber: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  logoUrl: string;
}

export interface BranchRecord extends OrgAudit {
  id: number;
  code: string;
  name: string;
  /** Legacy single-line address — kept in sync with addressLine1 for older readers */
  address: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phoneCountryCode: string;
  phoneNumber: string;
  /** Display / export composite from country code + number */
  phone: string;
  email: string;
  /** Display name (from employee pick or legacy free text) */
  manager: string;
  /** Linked employee id when selected from employee master; null = display-only / unset */
  managerEmployeeId: number | null;
  /** Seed/static count — listing may overlay derived count when assignment matches code */
  employeeCount: number;
  status: PolicyStatus;
}

function parseLegacyBranchPhone(phone: string): {
  phoneCountryCode: string;
  phoneNumber: string;
} {
  const raw = (phone || "").trim();
  if (!raw) return { phoneCountryCode: "+91", phoneNumber: "" };
  const m = raw.match(/^(\+\d{1,3})\s*(.*)$/);
  if (m) {
    return {
      phoneCountryCode: m[1],
      phoneNumber: m[2].replace(/\D/g, ""),
    };
  }
  const digits = raw.replace(/\D/g, "");
  return {
    phoneCountryCode: "+91",
    phoneNumber: digits.startsWith("91") && digits.length > 10 ? digits.slice(-10) : digits,
  };
}

function formatBranchPhone(countryCode: string, number: string): string {
  const code = (countryCode || "+91").trim() || "+91";
  const digits = (number || "").replace(/\D/g, "");
  if (!digits) return "";
  return `${code} ${digits}`.trim();
}

/** Normalize legacy v2 branch rows → v3 shape (no schema migration / no non-HR changes). */
export function normalizeBranchRecord(raw: Partial<BranchRecord> & { address?: string }): BranchRecord {
  const addressLine1 = (raw.addressLine1 ?? raw.address ?? "").trim();
  const addressLine2 = (raw.addressLine2 ?? "").trim();
  let phoneCountryCode = raw.phoneCountryCode?.trim() || "";
  let phoneNumber = raw.phoneNumber?.trim() || "";
  if (!phoneNumber && raw.phone) {
    const parsed = parseLegacyBranchPhone(raw.phone);
    phoneCountryCode = phoneCountryCode || parsed.phoneCountryCode;
    phoneNumber = parsed.phoneNumber;
  }
  if (!phoneCountryCode) phoneCountryCode = "+91";
  const phone = formatBranchPhone(phoneCountryCode, phoneNumber) || (raw.phone ?? "");

  return {
    id: raw.id ?? 0,
    code: raw.code ?? "",
    name: raw.name ?? "",
    address: addressLine1,
    addressLine1,
    addressLine2,
    city: raw.city ?? "",
    state: raw.state ?? "",
    country: raw.country || "India",
    pincode: raw.pincode ?? "",
    phoneCountryCode,
    phoneNumber,
    phone,
    email: raw.email ?? "",
    manager: raw.manager ?? "",
    managerEmployeeId:
      typeof raw.managerEmployeeId === "number" ? raw.managerEmployeeId : null,
    employeeCount: typeof raw.employeeCount === "number" ? raw.employeeCount : 0,
    status: raw.status === "inactive" ? "inactive" : "active",
    createdBy: raw.createdBy ?? CURRENT_USER,
    updatedBy: raw.updatedBy ?? CURRENT_USER,
    createdAt: raw.createdAt ?? policyToday(),
    updatedAt: raw.updatedAt ?? policyToday(),
  };
}

export { formatBranchPhone };

export interface DepartmentRecord extends OrgAudit {
  id: number;
  code: string;
  name: string;
  /** Kept for storage compatibility — not shown in Departments UI */
  parentCode: string;
  headName: string;
  /** Linked employee when selected from employee master; null = display-only / unset */
  headEmployeeId: number | null;
  /** Kept for storage compatibility — not shown in Departments UI */
  description: string;
  employeeCount: number;
  status: PolicyStatus;
}

export interface DesignationRecord extends OrgAudit {
  id: number;
  code: string;
  name: string;
  departmentCode: string;
  /** Kept for storage compatibility — not shown in Designations UI */
  level: string;
  /** Kept for storage compatibility — not shown in Designations UI */
  description: string;
  employeeCount: number;
  status: PolicyStatus;
}

export interface EmployeeTypeRecord extends OrgAudit {
  id: number;
  code: string;
  name: string;
  description: string;
  status: PolicyStatus;
}

export type EmploymentStatusColor =
  | "emerald"
  | "amber"
  | "orange"
  | "red"
  | "slate"
  | "violet";

export interface EmploymentStatusRecord extends OrgAudit {
  id: number;
  code: string;
  name: string;
  /** Kept for storage compatibility — not shown in Employment Statuses UI */
  description: string;
  color: EmploymentStatusColor;
  /** Kept for storage compatibility — not shown in Employment Statuses UI */
  isTerminal: boolean;
  status: PolicyStatus;
}

function stampAudit(partial?: Partial<OrgAudit>): OrgAudit {
  const today = policyToday();
  return {
    createdBy: partial?.createdBy ?? CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: partial?.createdAt ?? today,
    updatedAt: today,
  };
}

const COMPANY_SEED: CompanyProfile = {
  companyName: "Dharitri Sutra",
  legalName: "Dharitri Sutra Agri Solutions Pvt. Ltd.",
  companyCode: "DS-IN",
  industry: "Agri Distribution",
  dateOfIncorporation: "2020-06-15",
  gstin: "27AABCD1234E1Z5",
  pan: "AABCD1234E",
  cin: "U01100MH2020PTC123456",
  pfRegistration: "",
  esiRegistration: "",
  ptRegistration: "",
  lwfRegistration: "",
  email: "hr@dharitrisutra.in",
  phoneCountryCode: "+91",
  phoneNumber: "2045678900",
  hrContactName: "",
  hrContactEmail: "",
  hrContactPhoneCountryCode: "+91",
  hrContactPhoneNumber: "",
  website: "https://dharitrisutra.in",
  addressLine1: "Plot 42, Agri Tech Park",
  addressLine2: "Hinjewadi Phase 2",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411057",
  country: "India",
  logoUrl: "",
  ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
};

const BRANCH_SEED: BranchRecord[] = [
  {
    id: 1,
    code: "HO-PUN",
    name: "Head Office — Pune",
    address: "Plot 42, Agri Tech Park, Hinjewadi",
    addressLine1: "Plot 42, Agri Tech Park",
    addressLine2: "Hinjewadi Phase 2",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    pincode: "411057",
    phoneCountryCode: "+91",
    phoneNumber: "2045678900",
    phone: "+91 2045678900",
    email: "pune@dharitrisutra.in",
    manager: "Rajesh Kulkarni",
    managerEmployeeId: null,
    employeeCount: 48,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 2,
    code: "BR-NAG",
    name: "Nagpur Branch",
    address: "MIDC Industrial Area",
    addressLine1: "MIDC Industrial Area",
    addressLine2: "",
    city: "Nagpur",
    state: "Maharashtra",
    country: "India",
    pincode: "440016",
    phoneCountryCode: "+91",
    phoneNumber: "7122345600",
    phone: "+91 7122345600",
    email: "nagpur@dharitrisutra.in",
    manager: "Sneha Patil",
    managerEmployeeId: null,
    employeeCount: 22,
    status: "active",
    ...stampAudit({ createdAt: "2024-03-15", createdBy: "Admin" }),
  },
  {
    id: 3,
    code: "BR-AUR",
    name: "Aurangabad Branch",
    address: "Chikalthana Industrial Estate",
    addressLine1: "Chikalthana Industrial Estate",
    addressLine2: "",
    city: "Aurangabad",
    state: "Maharashtra",
    country: "India",
    pincode: "431006",
    phoneCountryCode: "+91",
    phoneNumber: "",
    phone: "",
    email: "",
    manager: "Amit Deshmukh",
    managerEmployeeId: null,
    employeeCount: 14,
    status: "active",
    ...stampAudit({ createdAt: "2024-06-01", createdBy: "Admin" }),
  },
  {
    id: 4,
    code: "BR-MUM",
    name: "Mumbai Head Office",
    address: "Nariman Point Business Centre",
    addressLine1: "Nariman Point Business Centre",
    addressLine2: "",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400021",
    phoneCountryCode: "+91",
    phoneNumber: "2267890100",
    phone: "+91 2267890100",
    email: "mumbai@dharitrisutra.in",
    manager: "Priya Sharma",
    managerEmployeeId: null,
    employeeCount: 18,
    status: "active",
    ...stampAudit({ createdAt: "2024-08-01", createdBy: "Admin" }),
  },
];

const DEPARTMENT_SEED: DepartmentRecord[] = [
  {
    id: 1,
    code: "HR",
    name: "Human Resources",
    parentCode: "",
    headName: "Priya Sharma",
    headEmployeeId: null,
    description: "People operations and HRMS administration",
    employeeCount: 6,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 2,
    code: "FIN",
    name: "Finance & Accounts",
    parentCode: "",
    headName: "Anil Mehta",
    headEmployeeId: null,
    description: "Finance, payables, and receivables",
    employeeCount: 9,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 3,
    code: "SAL",
    name: "Sales",
    parentCode: "",
    headName: "Vikram Singh",
    headEmployeeId: null,
    description: "Sales Force and channel distribution",
    employeeCount: 35,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 4,
    code: "SF",
    name: "Sales Force Ops",
    parentCode: "SAL",
    headName: "Meera Joshi",
    headEmployeeId: null,
    description: "Field force attendance and TA/DA",
    employeeCount: 28,
    status: "active",
    ...stampAudit({ createdAt: "2024-02-10", createdBy: "Admin" }),
  },
];

const DESIGNATION_SEED: DesignationRecord[] = [
  {
    id: 1,
    code: "HRBP",
    name: "HR Business Partner",
    departmentCode: "HR",
    level: "L3",
    description: "HR partner for business units",
    employeeCount: 2,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 2,
    code: "ASM",
    name: "Area Sales Manager",
    departmentCode: "SAL",
    level: "L4",
    description: "Regional sales ownership",
    employeeCount: 8,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 3,
    code: "ACCT",
    name: "Accounts Executive",
    departmentCode: "FIN",
    level: "L2",
    description: "Day-to-day accounting",
    employeeCount: 4,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 4,
    code: "SFO",
    name: "Sales Force Officer",
    departmentCode: "SF",
    level: "L2",
    description: "Field executive",
    employeeCount: 18,
    status: "active",
    ...stampAudit({ createdAt: "2024-02-10", createdBy: "Admin" }),
  },
];

const EMPLOYEE_TYPE_SEED: EmployeeTypeRecord[] = [
  {
    id: 1,
    code: "PERM",
    name: "Permanent",
    description: "Full-time permanent employee",
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 2,
    code: "CONT",
    name: "Contract",
    description: "Fixed-term / contractual employee",
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 3,
    code: "INT",
    name: "Intern",
    description: "Internship / trainee engagement",
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 4,
    code: "CONS",
    name: "Consultant",
    description: "External consultant engagement",
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 5,
    code: "TRAIN",
    name: "Trainee",
    description: "Trainee engagement",
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
];

const EMPLOYEE_TYPES_LEGACY_KEY = "ds_hr_org_employee_types_v2";

const EMPLOYMENT_STATUS_SEED: EmploymentStatusRecord[] = [
  {
    id: 1,
    code: "ACTIVE",
    name: "Active",
    description: "Currently employed and working",
    color: "emerald",
    isTerminal: false,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 2,
    code: "PROB",
    name: "Probation",
    description: "Under probation period",
    color: "amber",
    isTerminal: false,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 3,
    code: "NOTICE",
    name: "Notice Period",
    description: "Serving notice before exit",
    color: "orange",
    isTerminal: false,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 4,
    code: "EXITED",
    name: "Exited",
    description: "Employment ended (resignation / retirement)",
    color: "slate",
    isTerminal: true,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
  {
    id: 5,
    code: "TERM",
    name: "Terminated",
    description: "Employment terminated by company",
    color: "red",
    isTerminal: true,
    status: "active",
    ...stampAudit({ createdAt: "2024-01-01", createdBy: "Admin" }),
  },
];

export function loadCompanyProfile(): CompanyProfile {
  if (typeof window === "undefined") return { ...COMPANY_SEED };
  try {
    const raw = localStorage.getItem(KEYS.company);
    if (!raw) {
      localStorage.setItem(KEYS.company, JSON.stringify(COMPANY_SEED));
      return { ...COMPANY_SEED };
    }
    const parsed = JSON.parse(raw) as Partial<CompanyProfile> & { phone?: string };
    // Migrate legacy single phone string if present
    if (parsed.phone && !parsed.phoneNumber) {
      const digits = String(parsed.phone).replace(/\D/g, "");
      parsed.phoneCountryCode = parsed.phoneCountryCode ?? "+91";
      parsed.phoneNumber = digits.startsWith("91") && digits.length > 10 ? digits.slice(-10) : digits;
    }
    return { ...COMPANY_SEED, ...parsed };
  } catch {
    return { ...COMPANY_SEED };
  }
}

export function saveCompanyProfile(profile: CompanyProfile): void {
  if (typeof window === "undefined") return;
  const next = { ...profile, updatedBy: CURRENT_USER, updatedAt: policyToday() };
  localStorage.setItem(KEYS.company, JSON.stringify(next));
}

export const loadBranches = (): BranchRecord[] => {
  if (typeof window === "undefined") {
    return BRANCH_SEED.map((b) => normalizeBranchRecord(b));
  }
  try {
    let raw = localStorage.getItem(KEYS.branches);
    if (!raw) {
      const legacy = localStorage.getItem(BRANCHES_LEGACY_KEY);
      if (legacy) {
        const migrated = (JSON.parse(legacy) as Partial<BranchRecord>[]).map((r) =>
          normalizeBranchRecord(r),
        );
        localStorage.setItem(KEYS.branches, JSON.stringify(migrated));
        return migrated;
      }
      const seeded = BRANCH_SEED.map((b) => normalizeBranchRecord(b));
      localStorage.setItem(KEYS.branches, JSON.stringify(seeded));
      return seeded;
    }
    return (JSON.parse(raw) as Partial<BranchRecord>[]).map((r) => normalizeBranchRecord(r));
  } catch {
    return BRANCH_SEED.map((b) => normalizeBranchRecord(b));
  }
};

export const saveBranches = (list: BranchRecord[]) => {
  const normalized = list.map((r) => normalizeBranchRecord(r));
  savePolicyList(KEYS.branches, normalized);
};

export const loadDepartments = (): DepartmentRecord[] => {
  const list = loadPolicyList(KEYS.departments, DEPARTMENT_SEED);
  return list.map((d) => ({
    ...d,
    headEmployeeId:
      typeof (d as DepartmentRecord).headEmployeeId === "number"
        ? (d as DepartmentRecord).headEmployeeId
        : null,
    parentCode: d.parentCode ?? "",
    description: d.description ?? "",
  }));
};
export const saveDepartments = (list: DepartmentRecord[]) => savePolicyList(KEYS.departments, list);

export const loadDesignations = () => loadPolicyList(KEYS.designations, DESIGNATION_SEED);
export const saveDesignations = (list: DesignationRecord[]) => savePolicyList(KEYS.designations, list);

/** Slug used on employee records (e.g. Permanent → permanent). */
export function employeeTypeValueFromName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "type"
  );
}

/** Auto-generate a unique internal business code (hidden from Super Admin UI). */
export function autoUniqueOrgCode(
  name: string,
  existing: { id: number; code: string }[],
  excludeId?: number,
): string {
  const base =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8) || "ITEM";
  let code = base;
  let n = 2;
  while (existing.some((r) => r.code.toUpperCase() === code && r.id !== excludeId)) {
    const suffix = String(n);
    code = `${base.slice(0, Math.max(1, 8 - suffix.length))}${suffix}`;
    n += 1;
  }
  return code;
}

function isProbationEmployeeType(t: Pick<EmployeeTypeRecord, "name" | "code">): boolean {
  const name = t.name.trim().toLowerCase();
  const code = t.code.trim().toUpperCase();
  return name === "probation" || code === "PROB";
}

export const loadEmployeeTypes = (): EmployeeTypeRecord[] => {
  if (typeof window === "undefined") {
    return EMPLOYEE_TYPE_SEED.map((t) => ({ ...t }));
  }
  try {
    let raw = localStorage.getItem(KEYS.employeeTypes);
    if (!raw) {
      const legacy = localStorage.getItem(EMPLOYEE_TYPES_LEGACY_KEY);
      if (legacy) {
        const migrated = (JSON.parse(legacy) as EmployeeTypeRecord[]).filter(
          (t) => !isProbationEmployeeType(t),
        );
        // Ensure recommended types exist if legacy was emptied oddly
        const next =
          migrated.length > 0
            ? migrated
            : EMPLOYEE_TYPE_SEED.map((t) => ({ ...t }));
        localStorage.setItem(KEYS.employeeTypes, JSON.stringify(next));
        return next;
      }
      const seeded = EMPLOYEE_TYPE_SEED.map((t) => ({ ...t }));
      localStorage.setItem(KEYS.employeeTypes, JSON.stringify(seeded));
      return seeded;
    }
    const list = (JSON.parse(raw) as EmployeeTypeRecord[]).filter(
      (t) => !isProbationEmployeeType(t),
    );
    if (list.length !== (JSON.parse(raw) as EmployeeTypeRecord[]).length) {
      localStorage.setItem(KEYS.employeeTypes, JSON.stringify(list));
    }
    return list;
  } catch {
    return EMPLOYEE_TYPE_SEED.map((t) => ({ ...t }));
  }
};

export const saveEmployeeTypes = (list: EmployeeTypeRecord[]) => {
  savePolicyList(
    KEYS.employeeTypes,
    list.filter((t) => !isProbationEmployeeType(t)),
  );
};

export function getActiveEmployeeTypes(): EmployeeTypeRecord[] {
  return loadEmployeeTypes().filter((t) => t.status === "active");
}

/** Options for employee create/edit — value matches stored employee.employeeType slug. */
export function getEmployeeTypeSelectOptions(opts?: {
  includeInactiveValue?: string;
}): { value: string; label: string }[] {
  const active = getActiveEmployeeTypes().map((t) => ({
    value: employeeTypeValueFromName(t.name),
    label: t.name,
  }));
  const include = opts?.includeInactiveValue?.trim();
  if (!include) return active;
  if (active.some((o) => o.value === include)) return active;
  const all = loadEmployeeTypes().find((t) => employeeTypeValueFromName(t.name) === include);
  if (all) return [...active, { value: include, label: all.name }];
  return [...active, { value: include, label: include }];
}

export function getEmployeeTypeLabelFromMaster(value: string): string {
  const v = (value || "").trim().toLowerCase();
  if (!v) return "—";
  const hit = loadEmployeeTypes().find(
    (t) =>
      employeeTypeValueFromName(t.name) === v ||
      t.code.toLowerCase() === v ||
      t.name.toLowerCase() === v,
  );
  return hit?.name ?? value;
}

export const loadEmploymentStatuses = () => loadPolicyList(KEYS.employmentStatuses, EMPLOYMENT_STATUS_SEED);
export const saveEmploymentStatuses = (list: EmploymentStatusRecord[]) =>
  savePolicyList(KEYS.employmentStatuses, list);

/**
 * Map HR Settings Employment Status master → stored employee.employmentStatus slug.
 * Employee master keeps a fixed slug union; Settings owns labels/codes.
 */
export function employmentStatusValueFromMaster(rec: Pick<EmploymentStatusRecord, "code" | "name">): string {
  const code = (rec.code || "").trim().toUpperCase();
  const name = (rec.name || "").trim().toLowerCase();
  if (code === "ACTIVE" || name === "active") return "active";
  if (code === "PROB" || name.includes("probation")) return "probation";
  if (code === "NOTICE" || name.includes("notice")) return "notice";
  if (code === "EXITED" || name.includes("exit") || name.includes("resign")) return "resigned";
  if (code === "TERM" || name.includes("terminat")) return "terminated";
  return employeeTypeValueFromName(rec.name || rec.code);
}

/** Active employment-status options for employee create/edit (value = stored slug). */
export function getEmploymentStatusSelectOptions(opts?: {
  includeInactiveValue?: string;
}): { value: string; label: string }[] {
  const active = loadEmploymentStatuses()
    .filter((s) => s.status === "active")
    .map((s) => ({
      value: employmentStatusValueFromMaster(s),
      label: s.name,
    }));
  // Dedupe by value (first label wins)
  const seen = new Set<string>();
  const deduped: { value: string; label: string }[] = [];
  for (const o of active) {
    if (!o.value || seen.has(o.value)) continue;
    seen.add(o.value);
    deduped.push(o);
  }
  const include = opts?.includeInactiveValue?.trim();
  if (include && !seen.has(include)) {
    const all = loadEmploymentStatuses().find(
      (s) => employmentStatusValueFromMaster(s) === include,
    );
    deduped.push({ value: include, label: all?.name ?? include });
  }
  return deduped;
}

/** Branch / department / designation select options from Organization masters. */
export function getBranchSelectOptions(opts?: {
  includeCurrent?: string;
}): { value: string; label: string }[] {
  const active = loadBranches()
    .filter((b) => b.status === "active")
    .map((b) => ({ value: b.code, label: b.name }));
  const include = opts?.includeCurrent?.trim();
  if (!include) return active;
  if (active.some((o) => o.value === include)) return active;
  const byCode = loadBranches().find((b) => b.code === include);
  if (byCode) return [...active, { value: include, label: byCode.name }];
  const byName = loadBranches().find((b) => b.name === include);
  if (byName) return [...active, { value: include, label: byName.name }];
  // Legacy employee branch slugs (pre–org-master) remain selectable until reassigned
  const legacy = BRANCH_OPTIONS.find((b) => b.value === include);
  if (legacy) return [...active, { value: include, label: legacy.label }];
  return [...active, { value: include, label: include }];
}

export function getDepartmentSelectOptions(opts?: {
  includeCurrent?: string;
}): { value: string; label: string }[] {
  const active = loadDepartments()
    .filter((d) => d.status === "active")
    .map((d) => ({ value: d.name, label: d.name }));
  const include = opts?.includeCurrent?.trim();
  if (!include) return active;
  if (active.some((o) => o.value === include)) return active;
  return [...active, { value: include, label: include }];
}

export function getDesignationSelectOptions(opts?: {
  includeCurrent?: string;
}): { value: string; label: string }[] {
  const active = loadDesignations()
    .filter((d) => d.status === "active")
    .map((d) => ({ value: d.name, label: d.name }));
  const include = opts?.includeCurrent?.trim();
  if (!include) return active;
  if (active.some((o) => o.value === include)) return active;
  return [...active, { value: include, label: include }];
}

export function getBranchLabelFromMaster(value: string): string {
  const v = (value || "").trim();
  if (!v) return "—";
  const hit = loadBranches().find(
    (b) => b.code === v || b.name === v || b.code.toLowerCase() === v.toLowerCase(),
  );
  return hit?.name ?? v;
}

export function nextOrgId(list: { id: number }[]): number {
  return nextPolicyId(list);
}

export function withNewAudit<T extends OrgAudit>(
  partial: Omit<T, keyof OrgAudit> & Partial<OrgAudit>,
): T {
  return { ...partial, ...stampAudit(partial) } as T;
}

export function withUpdateAudit<T extends OrgAudit>(record: T): T {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export const EMPLOYMENT_STATUS_COLORS: {
  value: EmploymentStatusColor;
  label: string;
  swatch: string;
}[] = [
  { value: "emerald", label: "Green", swatch: "bg-emerald-500" },
  { value: "amber", label: "Amber", swatch: "bg-amber-400" },
  { value: "orange", label: "Orange", swatch: "bg-orange-500" },
  { value: "red", label: "Red", swatch: "bg-red-500" },
  { value: "slate", label: "Neutral", swatch: "bg-slate-400" },
  { value: "violet", label: "Violet", swatch: "bg-violet-500" },
];

export const DESIGNATION_LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;
