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
import {
  loadDailyRecords,
  saveDailyRecords,
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
  upsertGeneratedHrDocument,
  type HrTemplateTypeKey,
} from "@/app/(app)/hr/settings/hr-template-data";
import {
  loadOffboarding,
  startOffboarding,
  submitEmployeeResignation,
  acceptResignation,
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
      attendanceDaysApprox: DEMO_TARGETS.employees * 55,
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
    if (!isDemoEmployeeCode(e.employeeCode)) return e;
    const hasShift =
      typeof e.profileSummaries?.attendance?.shiftId === "number" ||
      !!(e.profileSummaries?.attendance?.shift || "").trim();
    if (hasShift) return e;
    const shift = shifts[e.id % shifts.length];
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
        governmentIds: {
          pan: "",
          aadhaar: "",
          uan: "",
          pfNumber: "",
          esicNumber: "",
          passportNumber: "",
          passportExpiry: "",
          drivingLicenceNumber: "",
          drivingLicenceExpiry: "",
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
      created.push(emp);
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
  }
  manifest.counts.employees = manifest.employeeCodes.length;
  return created;
}

function addMinutesToHhMm(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, (h || 0) * 60 + (m || 0) + delta);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function seedAttendance(employees: HrEmployee[], manifest: DemoWorkspaceManifest): void {
  const existing = loadDailyRecords();
  const existingIds = new Set(existing.map((r) => r.id));
  const existingKey = new Set(existing.map((r) => `${r.employeeId}|${r.date}`));
  // Idempotent: if demo attendance already present for these employees, only track ids
  const demoExisting = existing.filter(
    (r) =>
      isDemoEmployeeCode(r.employeeCode) ||
      r.createdBy === DEMO_WORKSPACE_MARKER ||
      r.note === DEMO_WORKSPACE_MARKER,
  );
  if (demoExisting.length > 0) {
    for (const r of demoExisting) {
      if (!manifest.attendanceRecordIds.includes(r.id)) {
        manifest.attendanceRecordIds.push(r.id);
      }
    }
    manifest.counts.attendanceRecords = manifest.attendanceRecordIds.length;
    return;
  }

  const maxId = existing.reduce((m, r) => Math.max(m, r.id), 900000);
  let nextId = maxId + 1;
  const rows: DailyAttendanceRecord[] = [];
  const shifts = pickDemoShifts();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  for (const emp of employees) {
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
      const dow = d.getDay(); // 0 Sun
      const iso = d.toISOString().slice(0, 10);
      if (existingKey.has(`${emp.id}|${iso}`)) continue;
      const roll = (emp.id + d.getDate()) % 11;
      // Skip many Sundays — weekly off comes from Shift Setup via resolver
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
          { id: `p-${emp.id}-${iso}-in`, time: firstIn, type: "in", source: "mobile_app" },
          { id: `p-${emp.id}-${iso}-out`, time: lastOut, type: "out", source: "mobile_app" },
        ];
      } else if (roll === 3) {
        status = "present";
        firstIn = addMinutesToHhMm(winStart, 45);
        lateMinutes = 45;
        punches = [
          { id: `p-${emp.id}-${iso}-in`, time: firstIn, type: "in", source: "biometric" },
          { id: `p-${emp.id}-${iso}-out`, time: lastOut, type: "out", source: "biometric" },
        ];
      } else if (roll === 4) {
        status = "present";
        lastOut = addMinutesToHhMm(winEnd, -70);
        earlyMinutes = 70;
        punches = [
          { id: `p-${emp.id}-${iso}-in`, time: firstIn, type: "in", source: "web" },
          { id: `p-${emp.id}-${iso}-out`, time: lastOut, type: "out", source: "web" },
        ];
      } else if (roll === 5) {
        // missing punch — only in
        status = "present";
        lastOut = "";
        punches = [{ id: `p-${emp.id}-${iso}-in`, time: firstIn, type: "in", source: "mobile_app" }];
      } else if (status === "present") {
        punches = [
          { id: `p-${emp.id}-${iso}-in`, time: firstIn, type: "in", source: "biometric" },
          { id: `p-${emp.id}-${iso}-out`, time: lastOut, type: "out", source: "biometric" },
        ];
      }

      const id = nextId++;
      if (existingIds.has(id)) continue;
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
      manifest.attendanceRecordIds.push(id);
    }
  }

  if (rows.length) {
    saveDailyRecords([...existing, ...rows]);
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
    if (hit) {
      if (!manifest.letterDocumentIds.includes(hit.id)) {
        manifest.letterDocumentIds.push(hit.id);
      }
      issued++;
      continue;
    }
    const tpl = getDefaultTemplateByType(type);
    if (!tpl) continue;
    const issueDate = isoDaysAgo(30 - issued);
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
      context: {
        employee_name: emp.employeeName,
        employee_code: emp.employeeCode,
        designation: emp.designation,
        department: emp.department,
      },
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

function seedOffboarding(employees: HrEmployee[], manifest: DemoWorkspaceManifest): void {
  const existing = loadOffboarding();
  const notice = employees.filter((e) => e.employmentStatus === "notice").slice(0, 2);
  const pool = [...notice, ...employees.filter((e) => e.employmentStatus === "active")].slice(
    0,
    DEMO_TARGETS.offboarding,
  );

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

    if (i % 2 === 0) {
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
        if (i === 0) {
          acceptResignation(sub.record.id, {
            finalLastWorkingDate: lwd,
            hrRemarks: DEMO_WORKSPACE_MARKER,
          });
        }
      }
    } else {
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
    }
  }
  manifest.counts.offboarding = manifest.offboardingIds.length;
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
    // If already finalized from prior seed, track and continue
    if (created.run.status === "finalized") {
      if (!manifest.payrollRunIds.includes(created.run.id)) {
        manifest.payrollRunIds.push(created.run.id);
      }
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
        `Payroll ${year}-${month}: calculated with ${calc.totals.configIssueCount} config issue(s) — not finalized.`,
      );
      continue;
    }
    const fin = finalizePayrollRun(calc.id);
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
    // Reload employees list after ensuring org — then create
    const before = loadHrEmployees().filter((e) => isDemoEmployeeCode(e.employeeCode));
    buildEmployees(manifest);
    // Prefer full set of demo employees for downstream seed; repair missing shift assignments
    let allDemo = ensureDemoEmployeeShifts(
      loadHrEmployees().filter((e) => isDemoEmployeeCode(e.employeeCode)),
    );

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

    seedAttendance(allDemo, manifest);
    seedLeave(allDemo, manifest);
    seedTravelAndClaims(allDemo, manifest);
    seedLetters(allDemo, manifest);
    seedOffboarding(allDemo, manifest);
    seedPayroll(allDemo, manifest, warnings);
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
