import { CURRENT_USER } from "@/lib/hr/config";
import { getHrEmployeeById, loadHrEmployees } from "../../employees/employee-master-data";
import { loadDailyRecords } from "../attendance-data";
import { countOfficeMonth } from "../office-attendance-resolve";

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave" | "wfh";

export interface AttendanceSyncRecord {
  id: number;
  syncDate: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime: string;
  attendanceStatus: AttendanceStatus;
  createdBy: string;
}

export interface AttendanceSyncFormValues {
  syncDate: string;
  employeeId: number | null;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime: string;
  attendanceStatus: AttendanceStatus;
}

const STORAGE_KEY = "ds_hr_attendance_sync_v1";

export const DEFAULT_SYNC_FORM: AttendanceSyncFormValues = {
  syncDate: new Date().toISOString().slice(0, 10),
  employeeId: null,
  attendanceDate: new Date().toISOString().slice(0, 10),
  checkInTime: "09:00",
  checkOutTime: "18:00",
  attendanceStatus: "present",
};

function seedRecords(): AttendanceSyncRecord[] {
  const emps = loadHrEmployees();
  const records: AttendanceSyncRecord[] = [];
  let id = 1;
  const today = new Date();
  for (let d = 0; d < 5; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    emps.slice(0, 3).forEach((e, idx) => {
      const statuses: AttendanceStatus[] = ["present", "present", "wfh", "leave", "half_day"];
      records.push({
        id: id++,
        syncDate: dateStr,
        employeeId: e.id,
        employeeCode: e.employeeCode,
        employeeName: e.employeeName,
        attendanceDate: dateStr,
        checkInTime: idx === 4 ? "" : "09:15",
        checkOutTime: idx === 4 ? "" : "18:10",
        attendanceStatus: statuses[d] ?? "present",
        createdBy: "System Sync",
      });
    });
  }
  return records;
}

export function loadAttendanceSync(): AttendanceSyncRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedRecords();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as AttendanceSyncRecord[];
  } catch {
    return [];
  }
}

export function saveAttendanceSync(list: AttendanceSyncRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function validateSyncForm(f: AttendanceSyncFormValues): string | null {
  if (!f.syncDate) return "Sync date is required.";
  if (!f.employeeId) return "Employee is required.";
  if (!f.attendanceDate) return "Attendance date is required.";
  return null;
}

export function formToSync(f: AttendanceSyncFormValues, id: number): AttendanceSyncRecord {
  const emp = f.employeeId ? getHrEmployeeById(f.employeeId) : undefined;
  return {
    id,
    syncDate: f.syncDate,
    employeeId: f.employeeId!,
    employeeCode: emp?.employeeCode ?? "",
    employeeName: emp?.employeeName ?? "",
    attendanceDate: f.attendanceDate,
    checkInTime: f.checkInTime,
    checkOutTime: f.checkOutTime,
    attendanceStatus: f.attendanceStatus,
    createdBy: CURRENT_USER,
  };
}

export interface AttendanceSummaryRow {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department: string;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  wfhDays: number;
  halfDays: number;
}

/**
 * Monthly attendance summary for reports.
 * Derives from canonical daily records + office day resolution — NOT the sync prototype store.
 */
export function getMonthlyAttendanceReport(month: number, year: number): AttendanceSummaryRow[] {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const records = loadDailyRecords().filter((r) => r.date.startsWith(monthKey));
  const byEmp = new Map<number, typeof records>();
  for (const r of records) {
    const arr = byEmp.get(r.employeeId) ?? [];
    arr.push(r);
    byEmp.set(r.employeeId, arr);
  }

  const rows: AttendanceSummaryRow[] = [];
  for (const [employeeId, empRecords] of byEmp) {
    const emp = getHrEmployeeById(employeeId) ?? loadHrEmployees().find((e) => e.id === employeeId);
    if (!emp) continue;
    const c = countOfficeMonth(emp, monthKey, empRecords);
    rows.push({
      employeeId,
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department ?? "",
      presentDays: c.present,
      absentDays: c.absent,
      leaveDays: c.leave,
      wfhDays: empRecords.filter((r) => r.attendanceStatus === "wfh").length,
      halfDays: c.halfDay,
    });
  }

  // Include active employees with no records this month (zeros from resolver)
  for (const emp of loadHrEmployees().filter((e) => e.status === "active")) {
    if (rows.some((r) => r.employeeId === emp.id)) continue;
    const c = countOfficeMonth(emp, monthKey, []);
    rows.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department ?? "",
      presentDays: c.present,
      absentDays: c.absent,
      leaveDays: c.leave,
      wfhDays: 0,
      halfDays: c.halfDay,
    });
  }

  return rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}
