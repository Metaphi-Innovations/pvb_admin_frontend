/**
 * Reset ONLY records created by the PVB Demo Workspace seed (via manifest + markers).
 * Never clears entire localStorage keys. Never touches Settings configs or Accounts.
 */

import { loadHrEmployees, saveHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import { loadDailyRecords, saveDailyRecords } from "@/app/(app)/hr/attendance/attendance-data";
import { loadHrRequests, saveHrRequests } from "@/app/(app)/hr/requests/requests-data";
import {
  loadLeaveBalanceStore,
  saveLeaveBalanceStore,
} from "@/app/(app)/hr/leave/leave-balance-data";
import {
  loadTravelRequests,
  TRAVEL_REQUESTS_STORAGE_KEY,
  HR_TRAVEL_REQUESTS_EVENT,
} from "@/app/(app)/employee/travel-requests/travel-request-data";
import {
  loadTravelClaims,
  TRAVEL_CLAIMS_STORAGE_KEY,
  HR_TRAVEL_CLAIMS_EVENT,
} from "@/app/(app)/employee/claims/travel-claim-data";
import {
  loadGeneratedHrDocuments,
  saveGeneratedHrDocuments,
} from "@/app/(app)/hr/settings/hr-template-data";
import { loadOffboarding, HR_OFFBOARDING_EVENT } from "@/app/(app)/hr/offboarding/offboarding-data";
import { loadPayrollRuns, savePayrollRuns } from "@/app/(app)/hr/payroll/payroll-run-data";
import { loadHrNotifications, saveHrNotifications } from "@/lib/hr/hr-notifications";
import {
  loadDepartments,
  saveDepartments,
  loadDesignations,
  saveDesignations,
} from "@/app/(app)/hr/settings/organization-data";
import {
  DEMO_WORKSPACE_MARKER,
  DEMO_WORKSPACE_RESET_EVENT,
  isDemoEmployeeCode,
} from "./demo-workspace-constants";
import {
  clearDemoManifest,
  loadDemoManifest,
  type DemoWorkspaceManifest,
} from "./demo-workspace-manifest";

const OFFBOARDING_STORAGE_KEY = "ds_hr_offboarding_v1";

export interface DemoResetResult {
  ok: boolean;
  error?: string;
  removed: Record<string, number>;
  skipped: string[];
}

function persistTravelRequests(list: ReturnType<typeof loadTravelRequests>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAVEL_REQUESTS_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(HR_TRAVEL_REQUESTS_EVENT));
}

function persistTravelClaims(list: ReturnType<typeof loadTravelClaims>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAVEL_CLAIMS_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(HR_TRAVEL_CLAIMS_EVENT));
}

function persistOffboarding(list: ReturnType<typeof loadOffboarding>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OFFBOARDING_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(HR_OFFBOARDING_EVENT));
}

export function resetDemoWorkspace(): DemoResetResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Reset requires a browser environment.", removed: {}, skipped: [] };
  }

  const manifest = loadDemoManifest();
  if (!manifest) {
    return {
      ok: false,
      error: "No demo workspace manifest found. Nothing to reset safely.",
      removed: {},
      skipped: [],
    };
  }

  const removed: Record<string, number> = {};
  const skipped: string[] = [];
  const m = manifest;

  // Employees — by demo code namespace OR manifest ids
  {
    const all = loadHrEmployees();
    const keep = all.filter(
      (e) =>
        !(
          isDemoEmployeeCode(e.employeeCode) ||
          m.employeeIds.includes(e.id) ||
          m.employeeCodes.includes(e.employeeCode) ||
          e.createdBy === DEMO_WORKSPACE_MARKER
        ),
    );
    removed.employees = all.length - keep.length;
    saveHrEmployees(keep);
  }

  // Attendance — by manifest ids or demo marker note/createdBy
  {
    const all = loadDailyRecords();
    const idSet = new Set(m.attendanceRecordIds);
    const keep = all.filter(
      (r) =>
        !(
          idSet.has(r.id) ||
          r.createdBy === DEMO_WORKSPACE_MARKER ||
          r.note === DEMO_WORKSPACE_MARKER ||
          isDemoEmployeeCode(r.employeeCode)
        ),
    );
    removed.attendance = all.length - keep.length;
    saveDailyRecords(keep);
  }

  // Leave requests
  {
    const store = loadHrRequests();
    const idSet = new Set(m.leaveRequestIds);
    const keepLeave = store.leave.filter(
      (l) =>
        !(
          idSet.has(l.id) ||
          l.id.startsWith("lr-pvbws-") ||
          isDemoEmployeeCode(l.employeeCode) ||
          l.actionedBy === DEMO_WORKSPACE_MARKER
        ),
    );
    removed.leaveRequests = store.leave.length - keepLeave.length;
    saveHrRequests({ leave: keepLeave, reimbursement: store.reimbursement });
  }

  // Leave balances — demo employee codes only
  {
    const bal = loadLeaveBalanceStore();
    const before = bal.ledgers.length;
    const ledgers = bal.ledgers.filter(
      (l) => !isDemoEmployeeCode(l.employeeCode) && !m.employeeCodes.includes(l.employeeCode),
    );
    removed.leaveLedgers = before - ledgers.length;
    saveLeaveBalanceStore({ ledgers });
  }

  // Travel requests
  {
    const all = loadTravelRequests();
    const idSet = new Set(m.travelRequestIds);
    const keep = all.filter(
      (t) =>
        !(
          idSet.has(t.id) ||
          t.requestNo.startsWith("TR-PVBWS-") ||
          t.remarks === DEMO_WORKSPACE_MARKER ||
          isDemoEmployeeCode(t.employeeCode)
        ),
    );
    removed.travelRequests = all.length - keep.length;
    persistTravelRequests(keep);
  }

  // Claims
  {
    const all = loadTravelClaims();
    const idSet = new Set(m.travelClaimIds);
    const keep = all.filter(
      (c) =>
        !(
          idSet.has(c.id) ||
          c.claimNo.startsWith("CL-PVBWS-") ||
          c.remarks === DEMO_WORKSPACE_MARKER ||
          isDemoEmployeeCode(c.employeeCode)
        ),
    );
    removed.claims = all.length - keep.length;
    persistTravelClaims(keep);
  }

  // Letters
  {
    const all = loadGeneratedHrDocuments();
    const idSet = new Set(m.letterDocumentIds);
    const keep = all.filter(
      (d) =>
        !(
          idSet.has(d.id) ||
          (d.internalNote || "").startsWith("pvbws-letter-") ||
          d.issuedBy === DEMO_WORKSPACE_MARKER ||
          d.generatedBy === DEMO_WORKSPACE_MARKER ||
          (d.referenceNumber || "").startsWith("PVBWS-LTR-")
        ),
    );
    removed.letters = all.length - keep.length;
    saveGeneratedHrDocuments(keep);
  }

  // Offboarding
  {
    const all = loadOffboarding();
    const idSet = new Set(m.offboardingIds);
    const keep = all.filter((o) => {
      if (idSet.has(o.id)) return false;
      if (isDemoEmployeeCode(o.employeeCode)) return false;
      const blob = `${o.employeeRemarks}|${o.internalNotes}|${o.hrRemarks}|${o.reason}`;
      if (blob.includes(DEMO_WORKSPACE_MARKER)) return false;
      return true;
    });
    removed.offboarding = all.length - keep.length;
    persistOffboarding(keep);
  }

  // Payroll runs — only those tagged demo AND listed in manifest
  {
    const all = loadPayrollRuns();
    const idSet = new Set(m.payrollRunIds);
    const keep = all.filter((r) => {
      if (!idSet.has(r.id)) return true;
      if (r.createdBy === DEMO_WORKSPACE_MARKER || r.updatedBy === DEMO_WORKSPACE_MARKER) {
        return false;
      }
      // Manifest lists the id but not clearly demo-tagged — skip deletion
      skipped.push(`Payroll run ${r.id} listed in manifest but not demo-tagged — left unchanged.`);
      return true;
    });
    removed.payrollRuns = all.length - keep.length;
    savePayrollRuns(keep);
  }

  // Notifications — by sourceId prefix or manifest ids
  {
    const all = loadHrNotifications();
    const idSet = new Set(m.notificationIds);
    const keep = all.filter(
      (n) => !(idSet.has(n.id) || (n.sourceId || "").startsWith("pvbws-notif-")),
    );
    removed.notifications = all.length - keep.length;
    saveHrNotifications(keep);
  }

  // Org masters added by demo only (manifest ids + PVBWS codes)
  {
    const depts = loadDepartments();
    const deptIdSet = new Set(m.departmentIds);
    const keepDepts = depts.filter(
      (d) =>
        !(
          (deptIdSet.has(d.id) && d.createdBy === DEMO_WORKSPACE_MARKER) ||
          (d.code.startsWith("PVBWS-") && d.createdBy === DEMO_WORKSPACE_MARKER)
        ),
    );
    removed.departments = depts.length - keepDepts.length;
    if (removed.departments > 0) saveDepartments(keepDepts);

    const desigs = loadDesignations();
    const desigIdSet = new Set(m.designationIds);
    const keepDesigs = desigs.filter(
      (d) =>
        !(
          (desigIdSet.has(d.id) && d.createdBy === DEMO_WORKSPACE_MARKER) ||
          (d.code.startsWith("PVBWS-") && d.createdBy === DEMO_WORKSPACE_MARKER)
        ),
    );
    removed.designations = desigs.length - keepDesigs.length;
    if (removed.designations > 0) saveDesignations(keepDesigs);
  }

  clearDemoManifest();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(DEMO_WORKSPACE_RESET_EVENT, { detail: { removed } }),
    );
    window.dispatchEvent(new Event("storage"));
  }
  return { ok: true, removed, skipped };
}

export function hasDemoManifest(): boolean {
  return !!loadDemoManifest();
}

export function getDemoManifestSummary(): DemoWorkspaceManifest | null {
  return loadDemoManifest();
}
