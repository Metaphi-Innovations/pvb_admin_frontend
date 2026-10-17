/**
 * Read-only inspection of canonical HR stores for Demo Workspace QA.
 */

import { loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import { loadDailyRecords } from "@/app/(app)/hr/attendance/attendance-data";
import { loadHrRequests } from "@/app/(app)/hr/requests/requests-data";
import { loadLeaveBalanceStore } from "@/app/(app)/hr/leave/leave-balance-data";
import { loadTravelRequests } from "@/app/(app)/employee/travel-requests/travel-request-data";
import { loadTravelClaims } from "@/app/(app)/employee/claims/travel-claim-data";
import { loadGeneratedHrDocuments } from "@/app/(app)/hr/settings/hr-template-data";
import { loadOffboarding } from "@/app/(app)/hr/offboarding/offboarding-data";
import { loadPayrollRuns } from "@/app/(app)/hr/payroll/payroll-run-data";
import { loadHrNotifications } from "@/lib/hr/hr-notifications";
import { loadBranches, loadDepartments } from "@/app/(app)/hr/settings/organization-data";
import { loadShifts } from "@/app/(app)/hr/settings/shift-setup-data";
import { buildDashboardRows } from "@/app/(app)/hr/attendance/attendance-ops";
import { currentMonthKey } from "@/app/(app)/hr/attendance/attendance-data";
import { DEMO_WORKSPACE_MARKER, isDemoEmployeeCode } from "./demo-workspace-constants";
import { loadDemoManifest } from "./demo-workspace-manifest";

export interface DemoWorkspaceInspection {
  manifestPresent: boolean;
  employeesDemo: number;
  employeesTotal: number;
  employeesWithShift: number;
  attendanceDemo: number;
  leaveRequestsDemo: number;
  leaveLedgersDemo: number;
  travelRequestsDemo: number;
  claimsDemo: number;
  lettersDemo: number;
  offboardingDemo: number;
  payrollRunsDemo: number;
  notificationsDemo: number;
  branchesActive: number;
  departmentsActive: number;
  shiftsActive: number;
  dashboardMonth: string;
  dashboardRows: number;
  dashboardNonZeroPresent: number;
  dashboardSample: {
    code: string;
    present: number;
    absent: number;
    weekOff: number;
    late: number;
  }[];
}

export function inspectDemoWorkspaceStores(): DemoWorkspaceInspection {
  const employees = loadHrEmployees();
  const demoEmps = employees.filter((e) => isDemoEmployeeCode(e.employeeCode));
  const attendance = loadDailyRecords().filter(
    (r) =>
      isDemoEmployeeCode(r.employeeCode) ||
      r.createdBy === DEMO_WORKSPACE_MARKER ||
      r.note === DEMO_WORKSPACE_MARKER,
  );
  const leave = loadHrRequests().leave.filter(
    (l) => isDemoEmployeeCode(l.employeeCode) || l.id.startsWith("lr-pvbws-"),
  );
  const ledgers = loadLeaveBalanceStore().ledgers.filter((l) =>
    isDemoEmployeeCode(l.employeeCode),
  );
  const travel = loadTravelRequests().filter(
    (t) => t.requestNo.startsWith("TR-PVBWS-") || t.remarks === DEMO_WORKSPACE_MARKER,
  );
  const claims = loadTravelClaims().filter(
    (c) => c.claimNo.startsWith("CL-PVBWS-") || c.remarks === DEMO_WORKSPACE_MARKER,
  );
  const letters = loadGeneratedHrDocuments().filter(
    (d) =>
      (d.internalNote || "").startsWith("pvbws-letter-") ||
      d.issuedBy === DEMO_WORKSPACE_MARKER ||
      (d.referenceNumber || "").startsWith("PVBWS-LTR-"),
  );
  const offboarding = loadOffboarding().filter(
    (o) =>
      isDemoEmployeeCode(o.employeeCode) ||
      `${o.employeeRemarks}|${o.internalNotes}|${o.hrRemarks}`.includes(DEMO_WORKSPACE_MARKER),
  );
  const payroll = loadPayrollRuns().filter(
    (r) => r.createdBy === DEMO_WORKSPACE_MARKER || r.updatedBy === DEMO_WORKSPACE_MARKER,
  );
  const notifs = loadHrNotifications().filter((n) =>
    (n.sourceId || "").startsWith("pvbws-notif-"),
  );
  const month = currentMonthKey();
  const dash = buildDashboardRows(month);
  const demoDash = dash.filter((r) => isDemoEmployeeCode(r.employee.employeeCode));

  return {
    manifestPresent: !!loadDemoManifest(),
    employeesDemo: demoEmps.length,
    employeesTotal: employees.length,
    employeesWithShift: demoEmps.filter(
      (e) =>
        typeof e.profileSummaries?.attendance?.shiftId === "number" ||
        !!(e.profileSummaries?.attendance?.shift || "").trim(),
    ).length,
    attendanceDemo: attendance.length,
    leaveRequestsDemo: leave.length,
    leaveLedgersDemo: ledgers.length,
    travelRequestsDemo: travel.length,
    claimsDemo: claims.length,
    lettersDemo: letters.length,
    offboardingDemo: offboarding.length,
    payrollRunsDemo: payroll.length,
    notificationsDemo: notifs.length,
    branchesActive: loadBranches().filter((b) => b.status === "active").length,
    departmentsActive: loadDepartments().filter((d) => d.status === "active").length,
    shiftsActive: loadShifts().filter((s) => s.status === "active").length,
    dashboardMonth: month,
    dashboardRows: demoDash.length,
    dashboardNonZeroPresent: demoDash.filter((r) => r.present > 0).length,
    dashboardSample: demoDash.slice(0, 5).map((r) => ({
      code: r.employee.employeeCode,
      present: r.present,
      absent: r.absent,
      weekOff: r.weekOff,
      late: r.late,
    })),
  };
}
