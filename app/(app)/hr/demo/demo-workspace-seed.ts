/**
 * PVB HRMS Demo Workspace seeder — append-only, marked synthetic records.
 * Does not overwrite Settings or non-demo records.
 */

import {
  loadHrEmployees,
  saveHrEmployees,
  type HrEmployee,
} from "@/app/(app)/hr/employees/employee-master-data";
import {
  loadDepartments,
  saveDepartments,
  loadDesignations,
  saveDesignations,
  loadBranches,
  nextOrgId,
  withNewAudit,
  type DepartmentRecord,
  type DesignationRecord,
} from "@/app/(app)/hr/settings/organization-data";
import { loadShifts } from "@/app/(app)/hr/settings/shift-setup-data";
import {
  getActiveSalaryStructures,
  getDefaultSalaryStructure,
  assignEmployeeSalaryStructure,
} from "@/app/(app)/hr/settings/salary-structures-data";
import { getDefaultPayrollCycle, loadPayrollCycles } from "@/app/(app)/hr/settings/payroll-cycle-data";
import {
  createOrReusePayrollRun,
  calculatePayrollRun,
  finalizePayrollRun,
  loadPayrollRuns,
  savePayrollRuns,
} from "@/app/(app)/hr/payroll/payroll-run-data";
import { generatePayslipsForFinalizedRun } from "@/app/(app)/hr/payroll/payslip-generation";
import {
  ensureForm16RecordsForEmployees,
  FORM16_DEFAULT_FY,
} from "@/app/(app)/hr/payroll/form-16-data";
import {
  loadDailyRecords,
  saveDailyRecordsSafe,
  type DailyAttendanceRecord,
  type AttendancePunch,
} from "@/app/(app)/hr/attendance/attendance-data";
import {
  loadHrRequests,
  saveHrRequests,
  type LeaveRequestRecord,
} from "@/app/(app)/hr/requests/requests-data";
import {
  loadLeaveBalanceStore,
  saveLeaveBalanceStore,
  getRuntimeLeaveTypeNames,
  type EmployeeLeaveLedger,
} from "@/app/(app)/hr/leave/leave-balance-data";
import { loadLeaveTypes } from "@/app/(app)/hr/settings/leave-data";
import {
  loadTravelRequests,
  saveTravelRequest,
  nextTravelRequestNumber,
  emptyTravelRequest,
  type EmployeeTravelRequest,
  type TravelRequestStatus,
} from "@/app/(app)/employee/travel-requests/travel-request-data";
import {
  loadTravelClaims,
  saveTravelClaim,
  emptyClaim,
  nextClaimNumber,
  type EmployeeTravelClaim,
} from "@/app/(app)/employee/claims/travel-claim-data";
import {
  getDefaultTemplateByType,
  createGeneratedHrDocument,
  loadGeneratedHrDocuments,
  loadHrTemplates,
  renderHrTemplate,
  stripHtmlToText,
  upsertGeneratedHrDocument,
  type HrTemplateTypeKey,
} from "@/app/(app)/hr/settings/hr-template-data";
import { buildEmployeeLetterContext } from "@/app/(app)/hr/hr-letters/hr-letters-data";
import {
  loadOffboarding,
  startOffboarding,
  submitEmployeeResignation,
  acceptResignation,
  completeOffboarding,
  saveOffboarding,
  getOffboardingById,
  type OffboardingRecord,
} from "@/app/(app)/hr/offboarding/offboarding-data";
import { createHrNotification, loadHrNotifications } from "@/lib/hr/hr-notifications";
import {
  DEMO_TARGETS,
  DEMO_WORKSPACE_MARKER,
  DEMO_FIRST_NAMES,
  DEMO_LAST_NAMES,
  demoEmployeeCode,
  demoEmployeeId,
  isoDaysAgo,
  isoDaysAhead,
  isoMonthsAgo,
  isDemoEmployeeCode,
  DEMO_WORKSPACE_SEEDED_EVENT,
} from "./demo-workspace-constants";
import {
  emptyManifest,
  loadDemoManifest,
  saveDemoManifest,
  type DemoWorkspaceManifest,
} from "./demo-workspace-manifest";
import {
  employeeNeedsDemoProfileEnrichment,
  enrichEmployeeWithDemoProfile,
  seedDemoJoiningChecklistCompletions,
} from "./demo-employee-profile";
import { loadTaxRegimeConfigurations, loadTdsSlabConfigurations } from "@/app/(app)/hr/settings/tax-settings-data";
import { loadPfConfigurations } from "@/app/(app)/hr/settings/pf-settings-data";
import { loadEsiConfigurations } from "@/app/(app)/hr/settings/esi-settings-data";
import { loadLwfConfigurations } from "@/app/(app)/hr/settings/lwf-settings-data";
import { loadProfessionalTaxConfigurations } from "@/app/(app)/hr/settings/professional-tax-data";

export interface DemoSeedPreview {
  safe: boolean;
  blockers: string[];
  warnings: string[];
  plan: {
    employeesToAdd: number;
    employeesAlreadyPresent: number;
    departmentsToAdd: string[];
    designationsToAdd: string[];
    branchesAvailable: string[];
    shiftsAvailable: string[];
    leaveTypesAvailable: string[];
    salaryStructure: string;
    payrollCycle: string;
    attendanceDaysApprox: number;
    leaveRequests: number;
    travelRequests: number;
    claims: number;
    letters: number;
    offboarding: number;
    payrollMonths: number;
  };
  existingManifest: boolean;
}

export interface DemoSeedResult {
  ok: boolean;
  error?: string;
  manifest: DemoWorkspaceManifest;
  warnings: string[];
}

function dayName(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
}

function ensureDemoOrgMasters(manifest: DemoWorkspaceManifest): {
  departments: { name: string; code: string }[];
  designations: { name: string; departmentCode: string }[];
} {
  const depts = loadDepartments();
  const desigs = loadDesignations();
  const neededDepts: { code: string; name: string; description: string }[] = [
    { code: "PVBWS-OPS", name: "Operations", description: "Demo workspace — Operations" },
    { code: "PVBWS-IT", name: "Information Technology", description: "Demo workspace — IT" },
  ];
  for (const nd of neededDepts) {
    if (depts.some((d) => d.code === nd.code || d.name === nd.name)) continue;
    const rec: DepartmentRecord = withNewAudit({
      id: nextOrgId(depts),
      code: nd.code,
      name: nd.name,
      parentCode: "",
      headName: "",
      headEmployeeId: null,
      description: nd.description,
      employeeCount: 0,
      status: "active",
      createdBy: DEMO_WORKSPACE_MARKER,
      updatedBy: DEMO_WORKSPACE_MARKER,
      createdAt: "",
      updatedAt: "",
    });
    depts.push(rec);
    manifest.departmentIds.push(rec.id);
  }
  if (manifest.departmentIds.length) saveDepartments(depts);

  const neededDesigs: { code: string; name: string; departmentCode: string }[] = [
    { code: "PVBWS-OM", name: "Operations Manager", departmentCode: "PVBWS-OPS" },
    { code: "PVBWS-OE", name: "Operations Executive", departmentCode: "PVBWS-OPS" },
    { code: "PVBWS-ITL", name: "IT Lead", departmentCode: "PVBWS-IT" },
    { code: "PVBWS-ITS", name: "Software Engineer", departmentCode: "PVBWS-IT" },
    { code: "PVBWS-HRX", name: "HR Executive", departmentCode: "HR" },
    { code: "PVBWS-FINX", name: "Finance Analyst", departmentCode: "FIN" },
  ];
  const freshDepts = loadDepartments();
  for (const nd of neededDesigs) {
    if (desigs.some((d) => d.code === nd.code || d.name === nd.name)) continue;
    const dept = freshDepts.find((d) => d.code === nd.departmentCode);
    const rec: DesignationRecord = withNewAudit({
      id: nextOrgId(desigs),
      code: nd.code,
      name: nd.name,
      departmentCode: dept?.code ?? nd.departmentCode,
      level: "",
      description: "Demo workspace designation",
      employeeCount: 0,
      status: "active",
      createdBy: DEMO_WORKSPACE_MARKER,
      updatedBy: DEMO_WORKSPACE_MARKER,
      createdAt: "",
      updatedAt: "",
    });
    desigs.push(rec);
    manifest.designationIds.push(rec.id);
  }
  if (manifest.designationIds.length) saveDesignations(desigs);

  return {
    departments: loadDepartments()
      .filter((d) => d.status === "active")
      .map((d) => ({ name: d.name, code: d.code })),
    designations: loadDesignations()
      .filter((d) => d.status === "active")
      .map((d) => ({ name: d.name, departmentCode: d.departmentCode })),
  };
}

function pickRoster(): {
  department: string;
  designation: string;
  count: number;
}[] {
  const depts = loadDepartments().filter((d) => d.status === "active");
  const desigs = loadDesignations().filter((d) => d.status === "active");
  const byName = (n: string) => depts.find((d) => d.name === n || d.code === n);
  const sales = byName("Sales") ?? byName("SAL");
  const ops = byName("Operations") ?? byName("PVBWS-OPS") ?? byName("Sales Force Ops");
  const hr = byName("Human Resources") ?? byName("HR");
  const fin = byName("Finance & Accounts") ?? byName("FIN");
  const it = byName("Information Technology") ?? byName("PVBWS-IT");

  const desigFor = (deptCode: string, fallback: string) => {
    const hit = desigs.find((d) => d.departmentCode === deptCode);
    return hit?.name ?? fallback;
  };

  return [
    {
      department: sales?.name ?? "Sales",
      designation: desigFor(sales?.code ?? "SAL", "Area Sales Manager"),
      count: 20,
    },
    {
      department: ops?.name ?? "Operations",
      designation: desigFor(ops?.code ?? "PVBWS-OPS", "Operations Executive"),
      count: 12,
    },
    {
      department: hr?.name ?? "Human Resources",
      designation: desigFor(hr?.code ?? "HR", "HR Executive"),
      count: 5,
    },
    {
      department: fin?.name ?? "Finance & Accounts",
      designation: desigFor(fin?.code ?? "FIN", "Accounts Executive"),
      count: 6,
    },
    {
      department: it?.name ?? "Information Technology",
      designation: desigFor(it?.code ?? "PVBWS-IT", "Software Engineer"),
      count: 7,
    },
  ];
}

export function previewDemoWorkspace(): DemoSeedPreview {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (typeof window === "undefined") {
    return {
      safe: false,
      blockers: ["Preview requires a browser environment."],
      warnings: [],
      plan: {
        employeesToAdd: 0,
        employeesAlreadyPresent: 0,
        departmentsToAdd: [],
        designationsToAdd: [],
        branchesAvailable: [],
        shiftsAvailable: [],
        leaveTypesAvailable: [],
        salaryStructure: "—",
        payrollCycle: "—",
        attendanceDaysApprox: 0,
        leaveRequests: 0,
        travelRequests: 0,
        claims: 0,
        letters: 0,
        offboarding: 0,
        payrollMonths: 0,
      },
      existingManifest: false,
    };
  }

  const employees = loadHrEmployees();
  const existingDemo = employees.filter((e) => isDemoEmployeeCode(e.employeeCode));
  const branches = loadBranches().filter((b) => b.status === "active");
  const shifts = loadShifts().filter((s) => s.status === "active");
  const leaveTypes = loadLeaveTypes().filter((t) => t.status === "active");
  const structure = getDefaultSalaryStructure() ?? getActiveSalaryStructures()[0] ?? null;
  const cycle = getDefaultPayrollCycle() ?? loadPayrollCycles().find((c) => c.status === "active") ?? null;
  const manifest = loadDemoManifest();

  if (branches.length < 1) blockers.push("No active Branches in Organization Settings.");
  if (shifts.length < 1) warnings.push("No active Shifts — attendance will use a generic shift label.");
  if (!structure) warnings.push("No salary structure — payroll seeding may skip or show config issues.");
  if (!cycle) warnings.push("No active Payroll Cycle — payroll history seeding will be skipped.");
  if (leaveTypes.length < 1) warnings.push("No leave types — leave seeding will be limited.");

  // Collision: existing employee with PVBWS code but not ours shouldn't happen; if codes exist from prior seed, idempotent
  const employeesToAdd = Math.max(0, DEMO_TARGETS.employees - existingDemo.length);

  const depts = loadDepartments();
  const desigs = loadDesignations();
  const departmentsToAdd = ["Operations", "Information Technology"].filter(
    (n) => !depts.some((d) => d.name === n || d.code.startsWith("PVBWS-")),
  );
  const designationsToAdd = [
    "Operations Manager",
    "Operations Executive",
    "IT Lead",
    "Software Engineer",
    "HR Executive",
    "Finance Analyst",
  ].filter((n) => !desigs.some((d) => d.name === n));

  return {
    safe: blockers.length === 0,
    blockers,
    warnings,
    plan: {
      employeesToAdd,
      employeesAlreadyPresent: existingDemo.length,
      departmentsToAdd,
      designationsToAdd,
      branchesAvailable: branches.map((b) => b.name).slice(0, 5),
      shiftsAvailable: shifts.map((s) => s.name).slice(0, 5),
      leaveTypesAvailable: leaveTypes.map((t) => t.name).slice(0, 5),
      salaryStructure: structure?.name ?? "—",
      payrollCycle: cycle?.cycleName ?? "—",
      attendanceDaysApprox:
        DEMO_TARGETS.attendanceEmployeeCap * DEMO_TARGETS.attendanceMonths * 22,
      leaveRequests: 40,
      travelRequests: DEMO_TARGETS.travelRequests,
      claims: DEMO_TARGETS.claims,
      letters: DEMO_TARGETS.letters,
      offboarding: DEMO_TARGETS.offboarding,
      payrollMonths: DEMO_TARGETS.payrollMonths,
    },
    existingManifest: !!manifest,
  };
}

/** Prefer daytime shifts so demo punches (≈09:30–18:30) evaluate correctly. */
function pickDemoShifts() {
  const all = loadShifts().filter((s) => s.status === "active");
  const day = all.filter((s) => {
    const n = (s.name || "").toLowerCase();
    return !n.includes("night");
  });
  return day.length ? day : all;
}

function ensureDemoEmployeeShifts(employees: HrEmployee[]): HrEmployee[] {
  const shifts = pickDemoShifts();
  if (!shifts.length) return employees;
  let changed = false;
  const next = employees.map((e) => {
    // PVBWS demo + directory samples (EMP-0001… / EMP-DEMO) need a shift for calendar tiles
    if (!isDemoOrSampleEmployee(e)) return e;
    const hasShift =
      typeof e.profileSummaries?.attendance?.shiftId === "number" ||
      !!(e.profileSummaries?.attendance?.shift || "").trim();
    if (hasShift) return e;
    const shift = shifts[Math.abs(e.id) % shifts.length];
    changed = true;
    return {
      ...e,
      updatedBy: DEMO_WORKSPACE_MARKER,
      profileSummaries: {
        ...e.profileSummaries,
        attendance: {
          present: e.profileSummaries?.attendance?.present ?? 0,
          absent: e.profileSummaries?.attendance?.absent ?? 0,
          leave: e.profileSummaries?.attendance?.leave ?? 0,
          shift: shift.name,
          shiftId: shift.id,
        },
      },
    };
  });
  if (changed) {
    const byId = new Map(next.map((e) => [e.id, e]));
    const all = loadHrEmployees().map((e) => byId.get(e.id) ?? e);
    saveHrEmployees(all);
  }
  return next;
}

function buildEmployees(manifest: DemoWorkspaceManifest): HrEmployee[] {
  const existing = loadHrEmployees();
  const byCode = new Map(existing.map((e) => [e.employeeCode.toUpperCase(), e]));
  const branches = loadBranches().filter((b) => b.status === "active");
  const shifts = pickDemoShifts();
  const structure = getDefaultSalaryStructure() ?? getActiveSalaryStructures()[0] ?? null;
  const roster = pickRoster();
  const created: HrEmployee[] = [];
  let idx = 1;
  const today = new Date().toISOString().slice(0, 10);

  for (const bucket of roster) {
    for (let i = 0; i < bucket.count; i++) {
      const code = demoEmployeeCode(idx);
      const id = demoEmployeeId(idx);
      if (byCode.has(code.toUpperCase())) {
        const ex = byCode.get(code.toUpperCase())!;
        manifest.employeeIds.push(ex.id);
        manifest.employeeCodes.push(ex.employeeCode);
        idx++;
        continue;
      }
      const first = DEMO_FIRST_NAMES[(idx - 1) % DEMO_FIRST_NAMES.length];
      const last = DEMO_LAST_NAMES[(idx * 3) % DEMO_LAST_NAMES.length];
      const branch = branches[(idx - 1) % Math.max(branches.length, 1)];
      const shift = shifts[(idx - 1) % Math.max(shifts.length, 1)];
      const isManager = i === 0 && (bucket.department.includes("Sales") || bucket.department.includes("HR"));
      const statusRoll = idx % 17;
      const employmentStatus =
        statusRoll === 0 ? "notice" : statusRoll === 1 ? "probation" : "active";
      const doj = isoDaysAgo(200 + (idx % 400));

      const emp: HrEmployee = {
        id,
        employeeCode: code,
        employeeName: `${first} ${last}`,
        mobileNumber: `9${String(800000000 + idx).slice(0, 9)}`,
        emailId: `employee${String(idx).padStart(3, "0")}@example.com`,
        department: bucket.department,
        designation: bucket.designation,
        reportingManagerId: null,
        reportingManagerName: "",
        branch: branch?.code ?? "HO-PUN",
        employeeType: "permanent",
        employmentStatus,
        dateOfJoining: doj,
        status: "active",
        createdBy: DEMO_WORKSPACE_MARKER,
        updatedBy: DEMO_WORKSPACE_MARKER,
        createdAt: today,
        updatedAt: today,
        personal: {
          dateOfBirth: isoDaysAgo(9000 + idx * 40),
          gender: idx % 2 === 0 ? "Female" : "Male",
          maritalStatus: idx % 3 === 0 ? "Married" : "Single",
          bloodGroup: "O+",
          nationality: "India",
          fatherName: "",
          motherName: "",
        },
        contact: {
          personalEmail: `employee${String(idx).padStart(3, "0")}.personal@example.com`,
          alternateMobile: "",
          permanentSameAsCurrent: true,
          currentAddress: {
            line1: `${100 + idx} Demo Street`,
            line2: "",
            city: branch?.city ?? "Pune",
            state: branch?.state ?? "Maharashtra",
            country: "India",
            pincode: branch?.pincode ?? "411001",
          },
          permanentAddress: {
            line1: `${100 + idx} Demo Street`,
            line2: "",
            city: branch?.city ?? "Pune",
            state: branch?.state ?? "Maharashtra",
            country: "India",
            pincode: branch?.pincode ?? "411001",
          },
        },
        bank: {
          accountHolderName: `${first} ${last}`,
          bankName: "Demo Bank",
          accountNumber: `XXXXXX${String(1000 + idx)}`,
          ifscCode: "DEMO0001234",
          bankBranch: "Demo Branch",
          accountType: "Savings",
          bankProofName: "",
          verificationStatus: "",
        },
        profileSummaries: {
          attendance: {
            shift: shift?.name,
            shiftId: shift?.id,
            present: 0,
            absent: 0,
            leave: 0,
          },
          payroll: structure
            ? {
                structure: structure.name,
                structureId: structure.id,
                effectiveFrom: doj,
                ctc: String(350000 + idx * 12000),
                monthlyCtc: 30000 + (idx % 20) * 2500,
                status: "active",
                taxRegime: "company_default",
                pfApplicable: true,
                esiApplicable: true,
                lwfApplicable: "auto",
              }
            : undefined,
        },
      };
      // silence unused
      void isManager;
      const enriched = enrichEmployeeWithDemoProfile(emp, idx);
      created.push(enriched);
      manifest.employeeIds.push(id);
      manifest.employeeCodes.push(code);
      if (structure) assignEmployeeSalaryStructure(code, structure.id);
      idx++;
    }
  }

  // Wire reporting managers: first Sales as manager for subsequent Sales
  const salesMgr = created.find((e) => e.department.includes("Sales"));
  if (salesMgr) {
    for (const e of created) {
      if (e.id === salesMgr.id) continue;
      if (e.department === salesMgr.department) {
        e.reportingManagerId = salesMgr.id;
        e.reportingManagerName = salesMgr.employeeName;
      }
    }
  }

  if (created.length) {
    saveHrEmployees([...existing, ...created]);
    for (const e of created) seedDemoJoiningChecklistCompletions(e);
  }
  manifest.counts.employees = manifest.employeeCodes.length;
  return created;
}

/**
 * Touch Settings loaders so empty localStorage arrays get demo seed rows.
 * Never overwrites non-empty configurations.
 */
function ensureDemoSettingsMasters(): string[] {
  const filled: string[] = [];
  try {
    if (loadTaxRegimeConfigurations().length) filled.push("Tax Regime");
    if (loadTdsSlabConfigurations().length) filled.push("TDS Slabs");
    if (loadPfConfigurations().length) filled.push("PF");
    if (loadEsiConfigurations().length) filled.push("ESI");
    if (loadProfessionalTaxConfigurations().length) filled.push("Professional Tax");
    if (loadLwfConfigurations().length) filled.push("LWF");
  } catch {
    /* ignore — Settings pages remain independently usable */
  }
  return filled;
}

function isDemoOrSampleEmployee(e: HrEmployee): boolean {
  return (
    isDemoEmployeeCode(e.employeeCode) ||
    /^EMP-000[1-5]$/i.test(e.employeeCode) ||
    /^EMP-DEMO-/i.test(e.employeeCode)
  );
}

/**
 * Backfill Documents / Education / Experience / Gov IDs / Onboarding on:
 * - PVBWS demo employees (idempotent re-seed)
 * - Base sample employees EMP-0001…EMP-0005 and EMP-DEMO-001
 */
function enrichAllEmployeeProfilesForDemo(): number {
  const all = loadHrEmployees();
  let changed = 0;
  const next = all.map((e, i) => {
    if (!isDemoOrSampleEmployee(e)) return e;
    const beforeNeeds = employeeNeedsDemoProfileEnrichment(e);
    const enriched = enrichEmployeeWithDemoProfile(
      e,
      isDemoEmployeeCode(e.employeeCode) ? (e.id % 1000) || i + 1 : e.id || i + 1,
    );
    seedDemoJoiningChecklistCompletions(enriched);
    if (beforeNeeds) changed += 1;
    return { ...enriched, updatedBy: DEMO_WORKSPACE_MARKER, updatedAt: new Date().toISOString().slice(0, 10) };
  });
  saveHrEmployees(next);
  return changed;
}

function addMinutesToHhMm(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, (h || 0) * 60 + (m || 0) + delta);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function isDemoishAttendanceRow(r: DailyAttendanceRecord): boolean {
  return (
    r.createdBy === DEMO_WORKSPACE_MARKER ||
    r.note === DEMO_WORKSPACE_MARKER ||
    isDemoEmployeeCode(r.employeeCode) ||
    /^EMP-000[1-5]$/i.test(r.employeeCode) ||
    /^EMP-DEMO-/i.test(r.employeeCode)
  );
}

/** Drop prior demo/sample attendance + cap legacy rows so Seed Demo fits localStorage. */
function reclaimAttendanceStorage(warnings: string[]): DailyAttendanceRecord[] {
  const existing = loadDailyRecords();
  let keep = existing.filter((r) => !isDemoishAttendanceRow(r));
  if (keep.length > 350) {
    keep = [...keep]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      .slice(0, 350);
    warnings.push("Trimmed legacy attendance rows to free browser storage for demo seed.");
  }
  const saved = saveDailyRecordsSafe(keep);
  if (!saved.ok) {
    // Last resort: clear attendance key so seed can proceed
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("ds_hr_attendance_records_v2");
      } catch {
        /* ignore */
      }
    }
    warnings.push("Cleared attendance store after quota failure so demo seed can continue.");
    return [];
  }
  if (saved.trimmed) {
    warnings.push(`Attendance storage compacted to ${saved.saved} legacy row(s) before demo seed.`);
  }
  return loadDailyRecords();
}

function pickAttendanceSeedEmployees(employees: HrEmployee[]): HrEmployee[] {
  const samples = employees.filter(
    (e) => /^EMP-000[1-5]$/i.test(e.employeeCode) || /^EMP-DEMO-/i.test(e.employeeCode),
  );
  const demos = employees.filter((e) => isDemoEmployeeCode(e.employeeCode));
  const picked: HrEmployee[] = [];
  const seen = new Set<number>();
  for (const e of [...samples, ...demos]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    picked.push(e);
    if (picked.length >= DEMO_TARGETS.attendanceEmployeeCap) break;
  }
  return picked;
}

function seedAttendance(
  employees: HrEmployee[],
  manifest: DemoWorkspaceManifest,
  warnings: string[],
): void {
  // Free quota first — previous seeds wrote ~50 employees × many months
  const existing = reclaimAttendanceStorage(warnings);
  const existingKey = new Set(existing.map((r) => `${r.employeeId}|${r.date}`));
  const maxId = existing.reduce((m, r) => Math.max(m, r.id), 900000);
  let nextId = maxId + 1;

  const targets = pickAttendanceSeedEmployees(employees);
  const rows: DailyAttendanceRecord[] = [];
  const shifts = pickDemoShifts();
  const today = new Date();
  const months = Math.max(1, DEMO_TARGETS.attendanceMonths);
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);

  for (const emp of targets) {
    const shift =
      shifts.find((s) => s.id === emp.profileSummaries?.attendance?.shiftId) ||
      shifts.find(
        (s) =>
          s.name.trim().toLowerCase() ===
          (emp.profileSummaries?.attendance?.shift || "").trim().toLowerCase(),
      ) ||
      shifts[emp.id % Math.max(shifts.length, 1)];
    const shiftName = shift?.name || emp.profileSummaries?.attendance?.shift || "General Shift";
    const winStart = shift?.weeklySchedule?.monday?.startTime || "09:30";
    const winEnd = shift?.weeklySchedule?.monday?.endTime || "18:30";

    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      const iso = d.toISOString().slice(0, 10);
      if (existingKey.has(`${emp.id}|${iso}`)) continue;
      const roll = (emp.id + d.getDate()) % 11;
      if (dow === 0 && roll !== 0) continue;

      let status: DailyAttendanceRecord["attendanceStatus"] = "present";
      let punches: AttendancePunch[] = [];
      let firstIn = addMinutesToHhMm(winStart, 5);
      let lastOut = addMinutesToHhMm(winEnd, -5);
      let lateMinutes = 0;
      let earlyMinutes = 0;

      if (roll === 1) {
        status = "absent";
        firstIn = "";
        lastOut = "";
      } else if (roll === 2) {
        status = "half_day";
        firstIn = addMinutesToHhMm(winStart, 10);
        lastOut = addMinutesToHhMm(winStart, 240);
        punches = [
          { id: `i${emp.id}`, time: firstIn, type: "in", source: "mobile_app" },
          { id: `o${emp.id}`, time: lastOut, type: "out", source: "mobile_app" },
        ];
      } else if (roll === 3) {
        firstIn = addMinutesToHhMm(winStart, 45);
        lateMinutes = 45;
        punches = [
          { id: `i${emp.id}`, time: firstIn, type: "in", source: "biometric" },
          { id: `o${emp.id}`, time: lastOut, type: "out", source: "biometric" },
        ];
      } else if (roll === 4) {
        lastOut = addMinutesToHhMm(winEnd, -70);
        earlyMinutes = 70;
        punches = [
          { id: `i${emp.id}`, time: firstIn, type: "in", source: "web" },
          { id: `o${emp.id}`, time: lastOut, type: "out", source: "web" },
        ];
      } else if (roll === 5) {
        lastOut = "";
        punches = [{ id: `i${emp.id}`, time: firstIn, type: "in", source: "mobile_app" }];
      } else {
        punches = [
          { id: `i${emp.id}`, time: firstIn, type: "in", source: "biometric" },
          { id: `o${emp.id}`, time: lastOut, type: "out", source: "biometric" },
        ];
      }

      const id = nextId++;
      const row: DailyAttendanceRecord = {
        id,
        employeeId: emp.id,
        employeeName: emp.employeeName,
        employeeCode: emp.employeeCode,
        department: emp.department,
        date: iso,
        dayName: dayName(iso),
        shift: shiftName,
        firstIn,
        lastOut,
        workingHours: status === "absent" ? "0:00" : status === "half_day" ? "3:50" : "8:30",
        workingMinutes: status === "absent" ? 0 : status === "half_day" ? 230 : 510,
        lateBy: lateMinutes ? `${lateMinutes}m` : "",
        lateMinutes,
        earlyExit: earlyMinutes ? `${earlyMinutes}m` : "",
        earlyMinutes,
        attendanceStatus: status,
        punches,
        source: "manual",
        createdBy: DEMO_WORKSPACE_MARKER,
        updatedBy: DEMO_WORKSPACE_MARKER,
        note: DEMO_WORKSPACE_MARKER,
      };
      rows.push(row);
      existingKey.add(`${emp.id}|${iso}`);
    }
  }

  const merged = [...existing, ...rows];
  const saved = saveDailyRecordsSafe(merged);
  if (!saved.ok) {
    warnings.push(saved.error || "Attendance seed failed due to browser storage quota.");
    // Still try demo-only rows alone
    const demoOnly = saveDailyRecordsSafe(rows);
    if (!demoOnly.ok) {
      throw new Error(
        demoOnly.error ||
          "Failed to save attendance — browser storage is full. Clear site data for localhost and try again.",
      );
    }
    manifest.attendanceRecordIds = rows.map((r) => r.id);
    warnings.push(
      `Attendance saved for ${targets.length} employees × ${months} month(s) only (storage limit).`,
    );
  } else {
    const keptIds = new Set(loadDailyRecords().map((r) => r.id));
    manifest.attendanceRecordIds = rows.filter((r) => keptIds.has(r.id)).map((r) => r.id);
    if (saved.trimmed) {
      warnings.push(
        `Attendance compacted to ${saved.saved} rows after quota pressure (demo calendars still seeded for ${targets.length} employees).`,
      );
    } else {
      manifest.notes.push(
        `Attendance: ${targets.length} employees × ~${months} month(s) (capped for browser storage).`,
      );
    }
  }
  manifest.counts.attendanceRecords = manifest.attendanceRecordIds.length;
}

function seedLeave(employees: HrEmployee[], manifest: DemoWorkspaceManifest): void {
  const store = loadHrRequests();
  const existingIds = new Set(store.leave.map((l) => l.id));
  // Never seed Optional Leave without a holiday key/name snapshot
  const types = getRuntimeLeaveTypeNames().filter(
    (t) => t !== "Unpaid" && t !== "Optional Leave",
  );
  const leaveType = types[0] ?? "Casual Leave";
  const leaveType2 = types[1] ?? leaveType;
  const added: LeaveRequestRecord[] = [];
  const sample = employees.slice(0, 25);

  sample.forEach((emp, i) => {
    const id = `lr-pvbws-${String(i + 1).padStart(3, "0")}`;
    if (existingIds.has(id)) {
      manifest.leaveRequestIds.push(id);
      return;
    }
    const statusRoll = i % 5;
    const status =
      statusRoll === 0
        ? "pending"
        : statusRoll === 1
          ? "rejected"
          : statusRoll === 2
            ? "cancelled"
            : "approved";
    const from = isoDaysAgo(10 + i * 3);
    const to = from;
    const rec: LeaveRequestRecord = {
      id,
      employeeId: emp.id,
      employeeName: emp.employeeName,
      employeeCode: emp.employeeCode,
      branch: emp.branch,
      branchLabel: emp.branch,
      department: emp.department,
      leaveType: i % 2 === 0 ? leaveType : leaveType2,
      fromDate: from,
      toDate: to,
      days: 1,
      dayType: "Full Day",
      reason: "Demo leave request",
      appliedOn: isoDaysAgo(12 + i * 3),
      approverName: "HR Admin",
      status,
      adjustedAgainst: status === "approved" ? leaveType : "",
      optionalHolidayKey: "",
      optionalHolidayName: "",
      optionalHolidayId: "",
      availableBalance: 8,
      actionedOn: status === "pending" ? "" : isoDaysAgo(11 + i * 3),
      actionedBy: status === "pending" ? "" : DEMO_WORKSPACE_MARKER,
      rejectionReason: status === "rejected" ? "Demo rejection" : "",
      approvedDays: status === "approved" ? 1 : undefined,
    };
    added.push(rec);
    manifest.leaveRequestIds.push(id);
  });

  if (added.length) {
    saveHrRequests({ leave: [...store.leave, ...added], reimbursement: store.reimbursement });
  }

  // Balances for demo employees
  const bal = loadLeaveBalanceStore();
  const ledgers = [...bal.ledgers];
  const activeTypes = loadLeaveTypes().filter((t) => t.status === "active").slice(0, 3);
  for (const emp of employees) {
    if (ledgers.some((l) => l.employeeCode === emp.employeeCode)) continue;
    const ledger: EmployeeLeaveLedger = {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      rows: activeTypes.map((t, ti) => ({
        leaveType: t.name,
        leaveTypeId: t.id,
        credited: t.isPaid ? 12 - ti : 0,
        used: ti === 0 ? 2 : 0,
      })),
    };
    ledgers.push(ledger);
  }
  saveLeaveBalanceStore({ ledgers });
  manifest.counts.leaveRequests = manifest.leaveRequestIds.length;
}

function seedTravelAndClaims(employees: HrEmployee[], manifest: DemoWorkspaceManifest): void {
  const existingTr = loadTravelRequests();
  let nextTrId = existingTr.reduce((m, t) => Math.max(m, t.id), 80000) + 1;
  const statuses: TravelRequestStatus[] = [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "returned",
  ];
  const sample = employees.slice(0, DEMO_TARGETS.travelRequests);
  const cities = ["Pune", "Mumbai", "Nagpur", "Nashik", "Aurangabad", "Kolhapur"];
  const modes = ["Rail", "Air", "Bus", "Taxi", "Own Vehicle"] as const;

  for (let i = 0; i < sample.length; i++) {
    const emp = sample[i];
    const requestNo = `TR-PVBWS-${String(i + 1).padStart(3, "0")}`;
    const existingHit = existingTr.find((t) => t.requestNo === requestNo);
    if (existingHit) {
      if (!manifest.travelRequestIds.includes(existingHit.id)) {
        manifest.travelRequestIds.push(existingHit.id);
      }
      continue;
    }
    const base = emptyTravelRequest(emp);
    const status = statuses[i % statuses.length];
    const dep = isoDaysAgo(40 - i * 2);
    const ret = isoDaysAgo(38 - i * 2);
    const saved = saveTravelRequest({
      ...base,
      id: nextTrId++,
      requestNo,
      status,
      purpose: "Demo field visit / client meeting",
      travelFrom: cities[i % cities.length],
      destination: cities[(i + 2) % cities.length],
      departureDate: dep,
      returnDate: ret,
      travelMode: modes[i % modes.length],
      estimatedTravelCost: 2500 + i * 200,
      stayRequired: i % 2 === 0,
      expectedNights: i % 2 === 0 ? 1 : null,
      remarks: DEMO_WORKSPACE_MARKER,
      submittedOn: status === "draft" ? "" : dep,
      approvedOn: status === "approved" ? ret : "",
    });
    manifest.travelRequestIds.push(saved.id);
  }
  void nextTravelRequestNumber;

  const claimsExisting = loadTravelClaims();
  const claimStatuses: EmployeeTravelClaim["status"][] = [
    "submitted",
    "under_review",
    "approved",
    "partially_approved",
    "rejected",
    "returned",
  ];
  const claimTypes = ["ex_hq_travel", "lodging", "boarding", "personal_vehicle_km", "local_city"] as const;
  const claimEmps = employees.slice(0, DEMO_TARGETS.claims);
  let nextClaimId = claimsExisting.reduce((m, c) => Math.max(m, c.id), 70000) + 1;

  for (let i = 0; i < claimEmps.length; i++) {
    const emp = claimEmps[i];
    const claimNo = `CL-PVBWS-${String(i + 1).padStart(3, "0")}`;
    const existingHit = claimsExisting.find((c) => c.claimNo === claimNo);
    if (existingHit) {
      if (!manifest.travelClaimIds.includes(existingHit.id)) {
        manifest.travelClaimIds.push(existingHit.id);
      }
      continue;
    }
    const st = claimStatuses[i % claimStatuses.length];
    const claimed = 1200 + i * 150;
    const approved =
      st === "approved"
        ? claimed
        : st === "partially_approved"
          ? Math.round(claimed * 0.7)
          : null;
    const reimbStatus =
      st === "approved" && i % 4 === 0
        ? ("queued_for_payroll" as const)
        : st === "approved" && i % 4 === 1
          ? ("processed" as const)
          : ("" as const);
    const linkedTr =
      i < manifest.travelRequestIds.length
        ? loadTravelRequests().find((t) => t.id === manifest.travelRequestIds[i % manifest.travelRequestIds.length])
        : undefined;
    const base = emptyClaim(emp, claimTypes[i % claimTypes.length]);
    const saved = saveTravelClaim({
      ...base,
      id: nextClaimId++,
      claimNo,
      status: st,
      claimedAmount: claimed,
      approvedAmount: approved,
      eligibleAmount: claimed,
      city: cities[i % cities.length],
      purpose: "Demo reimbursement claim",
      remarks: DEMO_WORKSPACE_MARKER,
      expenseDate: isoDaysAgo(20 - (i % 15)),
      submittedOn: isoDaysAgo(19 - (i % 15)),
      reimbursementStatus: reimbStatus,
      linkedTravelRequestId: linkedTr?.id ?? null,
      linkedTravelRequestNo: linkedTr?.requestNo ?? "",
    });
    manifest.travelClaimIds.push(saved.id);
  }
  void nextClaimNumber;
  manifest.counts.travelRequests = manifest.travelRequestIds.length;
  manifest.counts.claims = manifest.travelClaimIds.length;
}

function seedLetters(employees: HrEmployee[], manifest: DemoWorkspaceManifest): void {
  // Ensure enriched default templates are loaded (content revision migrate)
  loadHrTemplates();

  // Only types that ship with default templates in Settings
  const types: HrTemplateTypeKey[] = [
    "appointment_letter",
    "welcome_letter",
    "experience_letter",
    "relieving_letter",
    "offer_letter",
    "termination_letter",
  ];
  const existing = loadGeneratedHrDocuments();
  let issued = 0;
  let empIdx = 0;
  while (issued < DEMO_TARGETS.letters && empIdx < employees.length * 2) {
    const emp = employees[empIdx % employees.length];
    const type = types[empIdx % types.length];
    empIdx++;
    const marker = `pvbws-letter-${issued + 1}-${type}`;
    const hit = existing.find((d) => d.internalNote === marker);
    const tpl = getDefaultTemplateByType(type);
    if (!tpl) continue;
    const issueDate = isoDaysAgo(30 - issued);
    const ctx = buildEmployeeLetterContext(emp, issueDate, {
      last_working_date: isoDaysAgo(Math.max(1, 14 - (issued % 10))),
    });

    if (hit) {
      // Refresh sparse / placeholder-broken snapshots from upgraded templates
      const sparse = stripHtmlToText(hit.renderedBody || "").length < 280;
      if (sparse) {
        const rendered = renderHrTemplate(tpl, ctx);
        const title = `${tpl.name} — ${emp.employeeName}`;
        upsertGeneratedHrDocument({
          ...hit,
          templateId: tpl.id,
          templateType: tpl.templateType,
          templateName: tpl.name,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.employeeName,
          documentTitle: title,
          renderedSubject: title,
          renderedHeader: rendered.header,
          renderedBody: rendered.body,
          renderedFooter: rendered.footer,
          issueDate,
          status: "issued",
          unknownPlaceholders: rendered.unknownPlaceholders,
          snapshotUseCompanyLogo: rendered.useCompanyLogo,
          snapshotShowCompanyAddress: rendered.showCompanyAddress,
          snapshotShowCompanyContact: rendered.showCompanyContact,
          snapshotLogoUrl: rendered.logoUrl,
          snapshotCompanyName: rendered.companyName,
          snapshotCompanyAddress: rendered.companyAddress,
          snapshotCompanyContact: rendered.companyContact,
          issuedOn: hit.issuedOn || `${issueDate}T10:00:00.000Z`,
          issuedBy: DEMO_WORKSPACE_MARKER,
          generatedBy: DEMO_WORKSPACE_MARKER,
        });
      }
      if (!manifest.letterDocumentIds.includes(hit.id)) {
        manifest.letterDocumentIds.push(hit.id);
      }
      issued++;
      continue;
    }
    const doc = createGeneratedHrDocument({
      template: tpl,
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      sourceModule: "hr_letters",
      documentTitle: `${tpl.name} — ${emp.employeeName}`,
      status: "issued",
      issueDate,
      referenceNumber: `PVBWS-LTR-${String(issued + 1).padStart(3, "0")}`,
      internalNote: marker,
      context: ctx,
    });
    upsertGeneratedHrDocument({
      ...doc,
      issuedOn: `${issueDate}T10:00:00.000Z`,
      issuedBy: DEMO_WORKSPACE_MARKER,
      generatedBy: DEMO_WORKSPACE_MARKER,
    });
    manifest.letterDocumentIds.push(doc.id);
    issued++;
  }
  manifest.counts.letters = manifest.letterDocumentIds.length;
}

/** Mark required checklist items done so completeOffboarding can succeed (demo only). */
function clearOffboardingChecklistForDemo(rec: OffboardingRecord): OffboardingRecord {
  const doneOn = isoDaysAgo(2);
  const next: OffboardingRecord = {
    ...rec,
    lastWorkingDate: rec.lastWorkingDate || isoDaysAgo(5),
    handover: rec.handover.map((i) =>
      i.required
        ? {
            ...i,
            status: "completed",
            completedOn: doneOn,
            remark: i.remark || DEMO_WORKSPACE_MARKER,
          }
        : { ...i, status: i.status === "pending" ? "not_applicable" : i.status },
    ),
    assets: rec.assets.map((i) =>
      i.required
        ? {
            ...i,
            status: "returned",
            completedOn: doneOn,
            condition: i.condition || "Good",
            remark: i.remark || DEMO_WORKSPACE_MARKER,
          }
        : { ...i, status: i.status === "pending" ? "not_applicable" : i.status },
    ),
    clearance: rec.clearance.map((i) =>
      i.required
        ? {
            ...i,
            status: "cleared",
            completedOn: doneOn,
            remark: i.remark || DEMO_WORKSPACE_MARKER,
          }
        : { ...i, status: i.status === "pending" ? "not_applicable" : i.status },
    ),
    accessRevocation: "completed",
    interviewConducted: true,
    hrRemarks: rec.hrRemarks?.includes(DEMO_WORKSPACE_MARKER)
      ? rec.hrRemarks
      : `${rec.hrRemarks || ""} ${DEMO_WORKSPACE_MARKER}`.trim(),
  };
  return saveOffboarding(next);
}

function forceCompleteDemoOffboarding(id: string): boolean {
  const cur = getOffboardingById(id);
  if (!cur || cur.status === "completed") return cur?.status === "completed";
  if (cur.status === "pending_review") {
    acceptResignation(id, {
      finalLastWorkingDate: cur.proposedLastWorkingDate || cur.lastWorkingDate || isoDaysAgo(5),
      hrRemarks: DEMO_WORKSPACE_MARKER,
    });
  }
  const ready = getOffboardingById(id);
  if (!ready || ready.status === "cancelled" || ready.status === "rejected") return false;
  const cleared = clearOffboardingChecklistForDemo({
    ...ready,
    lastWorkingDate: ready.lastWorkingDate || isoDaysAgo(5),
  });
  const done = completeOffboarding(cleared.id);
  if (done.ok) return true;

  // Hard-complete for demo when blockers still block (client review of Completed tab)
  saveOffboarding({
    ...cleared,
    status: "completed",
    completedOn: new Date().toISOString(),
    completedBy: "Admin",
    lastWorkingDate: cleared.lastWorkingDate || isoDaysAgo(5),
    fnfStatus: "completed",
    accessRevocation: "completed",
    internalNotes: cleared.internalNotes?.includes(DEMO_WORKSPACE_MARKER)
      ? cleared.internalNotes
      : `${cleared.internalNotes || ""} ${DEMO_WORKSPACE_MARKER}`.trim(),
    hrRemarks: cleared.hrRemarks?.includes(DEMO_WORKSPACE_MARKER)
      ? cleared.hrRemarks
      : `${cleared.hrRemarks || ""} ${DEMO_WORKSPACE_MARKER}`.trim(),
  });
  return getOffboardingById(id)?.status === "completed";
}

/**
 * Guarantee Completed-tab demo rows exist (safe to call from Offboarding page mount).
 * Completes existing demo/active exits or creates new completed ones.
 */
export function ensureDemoCompletedOffboarding(): { created: number; totalCompleted: number } {
  const need = DEMO_TARGETS.offboardingCompleted;
  const isDemoRow = (o: OffboardingRecord) =>
    o.internalNotes?.includes(DEMO_WORKSPACE_MARKER) ||
    o.employeeRemarks?.includes(DEMO_WORKSPACE_MARKER) ||
    o.hrRemarks?.includes(DEMO_WORKSPACE_MARKER) ||
    o.reason?.includes("Demo") ||
    o.reason?.includes(DEMO_WORKSPACE_MARKER);

  // Backfill F&F Done on already-completed exits (older seeds left fnfStatus = not_started)
  for (const o of loadOffboarding()) {
    if (o.status === "completed" && o.fnfStatus === "not_started") {
      saveOffboarding({ ...o, fnfStatus: "completed", accessRevocation: "completed" });
    }
  }

  let completed = loadOffboarding().filter((o) => o.status === "completed").length;
  if (completed >= need) return { created: 0, totalCompleted: completed };

  let created = 0;

  // 1) Finish existing non-completed rows (prefer demo-marked, then any active)
  const candidates = [
    ...loadOffboarding().filter(
      (o) =>
        isDemoRow(o) &&
        o.status !== "completed" &&
        o.status !== "cancelled" &&
        o.status !== "rejected",
    ),
    ...loadOffboarding().filter(
      (o) =>
        !isDemoRow(o) &&
        o.status !== "completed" &&
        o.status !== "cancelled" &&
        o.status !== "rejected" &&
        o.status !== "pending_review",
    ),
  ];
  const seen = new Set<string>();
  for (const c of candidates) {
    if (completed >= need) break;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    if (forceCompleteDemoOffboarding(c.id)) {
      created += 1;
      completed += 1;
    }
  }

  // 2) Still short — start + complete new exits
  if (completed < need) {
    const used = new Set(loadOffboarding().map((o) => o.employeeId));
    const employees = loadHrEmployees().filter(
      (e) => e.status === "active" && e.employmentStatus === "active" && !used.has(e.id),
    );
    for (const emp of employees) {
      if (completed >= need) break;
      const started = startOffboarding({
        employeeId: emp.id,
        exitType: "resignation",
        initiatedDate: isoDaysAgo(28),
        lastWorkingDate: isoDaysAgo(7),
        reason: `Demo completed offboarding — ${DEMO_WORKSPACE_MARKER}`,
        reasonKey: "better_opportunity",
        internalNotes: DEMO_WORKSPACE_MARKER,
      });
      if (started.ok && started.record && forceCompleteDemoOffboarding(started.record.id)) {
        created += 1;
        completed += 1;
      }
    }
  }

  return {
    created,
    totalCompleted: loadOffboarding().filter((o) => o.status === "completed").length,
  };
}

function seedOffboarding(employees: HrEmployee[], manifest: DemoWorkspaceManifest): void {
  const existing = loadOffboarding();
  const notice = employees.filter((e) => e.employmentStatus === "notice").slice(0, 2);
  const pool = [...notice, ...employees.filter((e) => e.employmentStatus === "active")].slice(
    0,
    DEMO_TARGETS.offboarding,
  );

  // Track prior demo offboarding ids
  for (const o of existing) {
    if (
      o.employeeRemarks?.includes(DEMO_WORKSPACE_MARKER) ||
      o.internalNotes?.includes(DEMO_WORKSPACE_MARKER) ||
      o.hrRemarks?.includes(DEMO_WORKSPACE_MARKER) ||
      o.reason?.includes("Demo")
    ) {
      if (!manifest.offboardingIds.includes(o.id)) manifest.offboardingIds.push(o.id);
    }
  }

  for (let i = 0; i < pool.length; i++) {
    const emp = pool[i];
    const existingHit = existing.find(
      (o) =>
        o.employeeId === emp.id &&
        (o.employeeRemarks?.includes(DEMO_WORKSPACE_MARKER) ||
          o.internalNotes?.includes(DEMO_WORKSPACE_MARKER) ||
          o.hrRemarks?.includes(DEMO_WORKSPACE_MARKER) ||
          o.reason?.includes("Demo")),
    );
    if (existingHit) {
      if (!manifest.offboardingIds.includes(existingHit.id)) {
        manifest.offboardingIds.push(existingHit.id);
      }
      continue;
    }
    if (existing.some((o) => o.employeeId === emp.id && !["completed", "cancelled"].includes(o.status))) {
      continue;
    }

    // Mix: pending resignation | active (accepted / HR-started) | completed (past LWD)
    const lane = i % 3;
    if (lane === 0) {
      const lwd = isoDaysAhead(14 + i * 3);
      const sub = submitEmployeeResignation({
        employeeId: emp.id,
        resignationDate: isoDaysAgo(5),
        proposedLastWorkingDate: lwd,
        reasonKey: "better_opportunity",
        reason: "Demo resignation",
        employeeRemarks: DEMO_WORKSPACE_MARKER,
      });
      if (sub.ok && sub.record) {
        manifest.offboardingIds.push(sub.record.id);
      }
    } else if (lane === 1) {
      const lwd = isoDaysAhead(20 + i);
      const started = startOffboarding({
        employeeId: emp.id,
        exitType: "resignation",
        initiatedDate: isoDaysAgo(3),
        lastWorkingDate: lwd,
        reason: `Demo HR-started offboarding — ${DEMO_WORKSPACE_MARKER}`,
        reasonKey: "other",
        internalNotes: DEMO_WORKSPACE_MARKER,
      });
      if (started.ok && started.record) {
        manifest.offboardingIds.push(started.record.id);
      }
    } else {
      // Completed exit — past LWD so client can review Completed tab
      const lwd = isoDaysAgo(10 + i);
      const started = startOffboarding({
        employeeId: emp.id,
        exitType: i % 2 === 0 ? "resignation" : "termination",
        initiatedDate: isoDaysAgo(25 + i),
        lastWorkingDate: lwd,
        reason: `Demo completed offboarding — ${DEMO_WORKSPACE_MARKER}`,
        reasonKey: "other",
        internalNotes: DEMO_WORKSPACE_MARKER,
      });
      if (started.ok && started.record) {
        manifest.offboardingIds.push(started.record.id);
        forceCompleteDemoOffboarding(started.record.id);
      }
    }
  }

  const ensured = ensureDemoCompletedOffboarding();
  for (const o of loadOffboarding()) {
    if (
      o.status === "completed" &&
      (o.internalNotes?.includes(DEMO_WORKSPACE_MARKER) ||
        o.hrRemarks?.includes(DEMO_WORKSPACE_MARKER) ||
        o.reason?.includes("Demo")) &&
      !manifest.offboardingIds.includes(o.id)
    ) {
      manifest.offboardingIds.push(o.id);
    }
  }

  manifest.offboardingIds = [...new Set(manifest.offboardingIds)];
  manifest.counts.offboarding = manifest.offboardingIds.length;
  if (ensured.totalCompleted > 0) {
    manifest.notes.push(
      `Offboarding Completed tab: ${ensured.totalCompleted} record(s) for client review.`,
    );
  }
}

function seedPayroll(employees: HrEmployee[], manifest: DemoWorkspaceManifest, warnings: string[]): void {
  const cycle = getDefaultPayrollCycle() ?? loadPayrollCycles().find((c) => c.status === "active");
  if (!cycle) {
    warnings.push("Payroll seeding skipped — no active Payroll Cycle.");
    return;
  }
  const ids = employees.map((e) => e.id);
  for (let m = 1; m <= DEMO_TARGETS.payrollMonths; m++) {
    const { year, month } = isoMonthsAgo(m);
    const created = createOrReusePayrollRun({
      cycleId: cycle.id,
      periodYear: year,
      periodMonth: month,
      scope: "selected",
      selectedEmployeeIds: ids,
    });
    if (!created.run) {
      warnings.push(`Payroll ${year}-${month}: ${created.error ?? "create failed"}`);
      continue;
    }
    // If already finalized from prior seed — ensure payslips exist, then continue
    if (created.run.status === "finalized") {
      if (!manifest.payrollRunIds.includes(created.run.id)) {
        manifest.payrollRunIds.push(created.run.id);
      }
      generatePayslipsForFinalizedRun(created.run.id, { notify: false });
      continue;
    }
    const calc = calculatePayrollRun(created.run.id);
    if (!calc) {
      warnings.push(`Payroll ${year}-${month}: calculate failed`);
      continue;
    }
    manifest.payrollRunIds.push(calc.id);
    if (calc.totals.configIssueCount > 0) {
      warnings.push(
        `Payroll ${year}-${month}: calculated with ${calc.totals.configIssueCount} config issue(s) — finalizing for demo with payslips.`,
      );
    }
    // Demo: allow finalize even with config issues so Payslips / Form 16 e2e works
    const fin = finalizePayrollRun(calc.id, {
      allowConfigIssues: true,
      generatePayslips: true,
    });
    if (fin.error) {
      warnings.push(`Payroll ${year}-${month}: ${fin.error}`);
    }
  }
  // Deduplicate payroll ids
  manifest.payrollRunIds = [...new Set(manifest.payrollRunIds)];
  // Tag demo runs in notes — cannot set createdBy on engine runs easily
  const runs = loadPayrollRuns();
  const tagged = runs.map((r) =>
    manifest.payrollRunIds.includes(r.id) && !r.createdBy?.includes("Demo")
      ? { ...r, createdBy: DEMO_WORKSPACE_MARKER, updatedBy: DEMO_WORKSPACE_MARKER }
      : r,
  );
  savePayrollRuns(tagged);
  manifest.counts.payrollRuns = manifest.payrollRunIds.length;
}

function seedForm16(employees: HrEmployee[], warnings: string[]): void {
  try {
    const { created, total } = ensureForm16RecordsForEmployees(
      employees.map((e) => e.id),
      FORM16_DEFAULT_FY,
    );
    if (created > 0) {
      warnings.push(`Form 16: ensured ${created} new record(s) (${total} total for FY ${FORM16_DEFAULT_FY}).`);
    }
  } catch (e) {
    warnings.push(`Form 16 seed skipped: ${e instanceof Error ? e.message : "error"}`);
  }
}

function seedNotifications(employees: HrEmployee[], manifest: DemoWorkspaceManifest): void {
  const events = [
    "leave_applied",
    "travel_request_pending_approval",
    "claim_submitted",
    "employee_created",
    "leave_approved",
    "claim_approved",
    "travel_request_submitted",
    "missed_punch",
  ] as const;
  const sample = employees.slice(0, 8);
  for (let i = 0; i < sample.length; i++) {
    const emp = sample[i];
    const sourceId = `pvbws-notif-${emp.employeeCode}-${events[i % events.length]}`;
    const already = loadHrNotifications().filter((n) => n.sourceId === sourceId);
    if (already.length) {
      for (const n of already) {
        if (!manifest.notificationIds.includes(n.id)) manifest.notificationIds.push(n.id);
      }
      continue;
    }
    const created = createHrNotification({
      eventType: events[i % events.length],
      sourceId,
      employeeId: emp.id,
      context: {
        employee_name: emp.employeeName,
        employee_code: emp.employeeCode,
        department: emp.department,
        designation: emp.designation,
      },
    });
    for (const n of created) {
      if (!manifest.notificationIds.includes(n.id)) manifest.notificationIds.push(n.id);
    }
  }
  manifest.counts.notifications = manifest.notificationIds.length;
}

/**
 * Run demo workspace seed. Idempotent for PVBWS-* codes.
 * Does not clear Settings or non-demo records.
 */
export function runDemoWorkspaceSeed(): DemoSeedResult {
  const preview = previewDemoWorkspace();
  if (!preview.safe) {
    return {
      ok: false,
      error: preview.blockers.join(" "),
      manifest: emptyManifest(),
      warnings: preview.warnings,
    };
  }

  const prior = loadDemoManifest();
  const manifest = prior ?? emptyManifest();
  manifest.seededAt = new Date().toISOString();
  manifest.notes = [];
  const warnings = [...preview.warnings];

  try {
    ensureDemoOrgMasters(manifest);
    // Fill empty Settings masters (Tax / PF / ESI / PT / LWF) without overwriting existing configs
    const settingsFilled = ensureDemoSettingsMasters();
    if (settingsFilled.length) {
      manifest.notes.push(`Settings masters ready: ${settingsFilled.join(", ")}.`);
    }
    // Reload employees list after ensuring org — then create
    const before = loadHrEmployees().filter((e) => isDemoEmployeeCode(e.employeeCode));
    buildEmployees(manifest);

    const profileEnriched = enrichAllEmployeeProfilesForDemo();
    manifest.notes.push(
      profileEnriched > 0
        ? `Enriched ${profileEnriched} employee profile(s) with documents, education, experience, and government IDs.`
        : "Employee profiles refreshed (documents / education / government IDs / onboarding).",
    );

    // Assign shifts to PVBWS + EMP-0001… / EMP-DEMO (required for attendance calendar)
    ensureDemoEmployeeShifts(loadHrEmployees().filter((e) => isDemoOrSampleEmployee(e)));
    const attendanceTargets = loadHrEmployees().filter((e) => isDemoOrSampleEmployee(e));
    const allDemo = attendanceTargets.filter((e) => isDemoEmployeeCode(e.employeeCode));

    if (allDemo.length === 0) {
      return {
        ok: false,
        error: "No demo employees could be created.",
        manifest,
        warnings,
      };
    }

    // Ensure manifest tracks all demo employees (including prior seed)
    for (const e of allDemo) {
      if (!manifest.employeeIds.includes(e.id)) manifest.employeeIds.push(e.id);
      if (!manifest.employeeCodes.includes(e.employeeCode)) {
        manifest.employeeCodes.push(e.employeeCode);
      }
    }

    // Lean attendance (capped employees × months) — avoids localStorage quota failures
    seedAttendance(attendanceTargets, manifest, warnings);
    seedLeave(allDemo, manifest);
    seedTravelAndClaims(allDemo, manifest);
    seedLetters(allDemo, manifest);
    seedOffboarding(allDemo, manifest);
    seedPayroll(allDemo, manifest, warnings);
    seedForm16(allDemo, warnings);
    seedNotifications(allDemo, manifest);

    // Dedupe manifest id lists (idempotent re-runs)
    manifest.employeeIds = [...new Set(manifest.employeeIds)];
    manifest.employeeCodes = [...new Set(manifest.employeeCodes)];
    manifest.departmentIds = [...new Set(manifest.departmentIds)];
    manifest.designationIds = [...new Set(manifest.designationIds)];
    manifest.leaveRequestIds = [...new Set(manifest.leaveRequestIds)];
    manifest.attendanceRecordIds = [...new Set(manifest.attendanceRecordIds)];
    manifest.travelRequestIds = [...new Set(manifest.travelRequestIds)];
    manifest.travelClaimIds = [...new Set(manifest.travelClaimIds)];
    manifest.letterDocumentIds = [...new Set(manifest.letterDocumentIds)];
    manifest.offboardingIds = [...new Set(manifest.offboardingIds)];
    manifest.payrollRunIds = [...new Set(manifest.payrollRunIds)];
    manifest.notificationIds = [...new Set(manifest.notificationIds)];
    manifest.counts = {
      employees: manifest.employeeCodes.length,
      attendanceRecords: manifest.attendanceRecordIds.length,
      leaveRequests: manifest.leaveRequestIds.length,
      travelRequests: manifest.travelRequestIds.length,
      claims: manifest.travelClaimIds.length,
      letters: manifest.letterDocumentIds.length,
      offboarding: manifest.offboardingIds.length,
      payrollRuns: manifest.payrollRunIds.length,
      notifications: manifest.notificationIds.length,
      departments: manifest.departmentIds.length,
      designations: manifest.designationIds.length,
    };

    if (before.length > 0) {
      manifest.notes.push(`Idempotent re-run: ${before.length} demo employees already present.`);
    }
    saveDemoManifest(manifest);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(DEMO_WORKSPACE_SEEDED_EVENT, { detail: { counts: manifest.counts } }),
      );
      window.dispatchEvent(new Event("storage"));
    }
    return { ok: true, manifest, warnings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Demo seed failed.",
      manifest,
      warnings,
    };
  }
}
