import { CURRENT_USER } from "@/lib/hr/config";
import { loadHrEmployees } from "../employees/employee-master-data";

export type AttendanceDayStatus =
  | "present"
  | "absent"
  | "half_day"
  | "leave"
  | "holiday"
  | "week_off"
  | "wfh";

export type AttendanceSourceType = "biometric" | "mobile_app" | "web" | "manual";

export type CorrectionStatus = "pending" | "approved" | "rejected";

export interface AttendancePunch {
  id: string;
  time: string;
  type: "in" | "out";
  source: AttendanceSourceType;
  sourceDetail?: string;
}

export interface DailyAttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string;
  date: string;
  dayName: string;
  shift: string;
  firstIn: string;
  lastOut: string;
  workingHours: string;
  workingMinutes: number;
  lateBy: string;
  lateMinutes: number;
  earlyExit: string;
  earlyMinutes: number;
  attendanceStatus: AttendanceDayStatus;
  punches: AttendancePunch[];
  source: AttendanceSourceType;
  createdBy: string;
  updatedBy: string;
  correctionRequestedBy?: string;
  correctionApprovedBy?: string;
  note?: string;
}

export interface EmployeeAttendanceSummary {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  holiday: number;
  weekOff: number;
  lateComing: number;
  earlyLeaving: number;
}

export interface MonthlyAttendanceSummary {
  month: string;
  label: string;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  holiday: number;
  weekOff: number;
  lateComing: number;
  earlyLeaving: number;
}

export interface AttendanceCorrection {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  date: string;
  recordId: number;
  requestedStatus: AttendanceDayStatus;
  currentStatus: AttendanceDayStatus;
  reason: string;
  status: CorrectionStatus;
  requestedBy: string;
  approvedBy?: string;
  requestedAt: string;
}

const RECORDS_KEY = "ds_hr_attendance_records_v2";
const CORRECTIONS_KEY = "ds_hr_attendance_corrections_v1";

const SHIFTS = ["General Shift (9:30–18:30)", "Field Shift (10:00–19:00)", "No Shift"];
const SOURCE_LABELS: Record<AttendanceSourceType, string> = {
  biometric: "Biometric",
  mobile_app: "Mobile App",
  web: "Web",
  manual: "Manual",
};

export function formatPunchTime(time24: string): string {
  if (!time24) return "—";
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function getDayName(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" });
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calcWorkingMinutes(punches: AttendancePunch[]): number {
  let total = 0;
  let lastIn: number | null = null;
  for (const p of punches) {
    const [h, m] = p.time.split(":").map(Number);
    const mins = h * 60 + m;
    if (p.type === "in") lastIn = mins;
    else if (p.type === "out" && lastIn !== null) {
      total += Math.max(0, mins - lastIn);
      lastIn = null;
    }
  }
  return total;
}

function formatDuration(mins: number): string {
  if (mins <= 0) return "—";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatOffset(mins: number): string {
  if (mins <= 0) return "—";
  return `${mins}m`;
}

function buildPunches(
  pattern: "full" | "half" | "multi" | "none",
  source: AttendanceSourceType,
): AttendancePunch[] {
  const src = SOURCE_LABELS[source];
  const detail =
    source === "biometric" ? "Biometric-AYRF01028208" : source === "mobile_app" ? "GPS Check-in" : undefined;
  if (pattern === "none") return [];
  if (pattern === "half") {
    return [
      { id: "p1", time: "09:42", type: "in", source, sourceDetail: detail },
      { id: "p2", time: "13:15", type: "out", source, sourceDetail: detail },
    ];
  }
  if (pattern === "multi") {
    return [
      { id: "p1", time: "09:12", type: "in", source, sourceDetail: detail },
      { id: "p2", time: "13:04", type: "out", source, sourceDetail: detail },
      { id: "p3", time: "13:48", type: "in", source, sourceDetail: detail },
      { id: "p4", time: "18:45", type: "out", source, sourceDetail: detail },
    ];
  }
  return [
    { id: "p1", time: "09:15", type: "in", source, sourceDetail: detail },
    { id: "p2", time: "18:10", type: "out", source, sourceDetail: detail },
  ];
}

function buildSeedRecords(): DailyAttendanceRecord[] {
  const emps = loadHrEmployees();
  const records: DailyAttendanceRecord[] = [];
  let id = 1;
  const today = new Date();

  for (let d = 0; d < 45; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    const dayName = getDayName(dateStr);
    const dow = date.getDay();

    emps.forEach((e, idx) => {
      let status: AttendanceDayStatus = "present";
      let punchPattern: "full" | "half" | "multi" | "none" = "full";
      let source: AttendanceSourceType = "biometric";
      let shift = SHIFTS[0];
      let lateMinutes = 0;
      let earlyMinutes = 0;

      if (dow === 0) {
        status = "week_off";
        punchPattern = "none";
      } else if (d % 17 === 0 && idx === 0) {
        status = "holiday";
        punchPattern = "none";
      } else if ((d + idx) % 11 === 0) {
        status = "leave";
        punchPattern = "none";
      } else if ((d + idx) % 9 === 0) {
        status = "absent";
        punchPattern = "none";
      } else if ((d + idx) % 7 === 0) {
        status = "half_day";
        punchPattern = "half";
      } else if ((d + idx) % 5 === 0) {
        status = "wfh";
        punchPattern = "full";
        source = "web";
      } else if ((d + idx) % 4 === 0) {
        punchPattern = "multi";
        source = "mobile_app";
        lateMinutes = 18;
      } else if ((d + idx) % 6 === 0) {
        lateMinutes = 42;
        earlyMinutes = 25;
        source = "manual";
      }

      const punches = buildPunches(punchPattern, source);
      const workMins = calcWorkingMinutes(punches);
      const firstIn = punches.find((p) => p.type === "in")?.time ?? "";
      const lastOut = [...punches].reverse().find((p) => p.type === "out")?.time ?? "";

      records.push({
        id: id++,
        employeeId: e.id,
        employeeName: e.employeeName,
        employeeCode: e.employeeCode,
        department: e.department,
        date: dateStr,
        dayName,
        shift,
        firstIn,
        lastOut,
        workingHours: formatDuration(workMins),
        workingMinutes: workMins,
        lateBy: formatOffset(lateMinutes),
        lateMinutes,
        earlyExit: formatOffset(earlyMinutes),
        earlyMinutes,
        attendanceStatus: status,
        punches,
        source,
        createdBy: source === "manual" ? CURRENT_USER : "System Sync",
        updatedBy: CURRENT_USER,
        correctionRequestedBy: d === 2 && idx === 1 ? e.employeeName : undefined,
        correctionApprovedBy: undefined,
      });
    });
  }
  return records;
}

function buildSeedCorrections(records: DailyAttendanceRecord[]): AttendanceCorrection[] {
  const pending = records.find((r) => r.correctionRequestedBy && r.attendanceStatus === "absent");
  if (!pending) return [];
  return [
    {
      id: 1,
      employeeId: pending.employeeId,
      employeeName: pending.employeeName,
      employeeCode: pending.employeeCode,
      date: pending.date,
      recordId: pending.id,
      currentStatus: "absent",
      requestedStatus: "present",
      reason: "Biometric device was offline; employee was present.",
      status: "pending",
      requestedBy: pending.correctionRequestedBy!,
      requestedAt: pending.date,
    },
    {
      id: 2,
      employeeId: pending.employeeId,
      employeeName: pending.employeeName,
      employeeCode: pending.employeeCode,
      date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
      recordId: pending.id + 1,
      currentStatus: "half_day",
      requestedStatus: "present",
      reason: "Forgot second punch; full day worked.",
      status: "approved",
      requestedBy: pending.employeeName,
      approvedBy: CURRENT_USER,
      requestedAt: new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10),
    },
  ];
}

export function loadDailyRecords(): DailyAttendanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) {
      const seed = buildSeedRecords();
      localStorage.setItem(RECORDS_KEY, JSON.stringify(seed));
      const corrections = buildSeedCorrections(seed);
      localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(corrections));
      return seed;
    }
    return JSON.parse(raw) as DailyAttendanceRecord[];
  } catch {
    return buildSeedRecords();
  }
}

export function saveDailyRecords(list: DailyAttendanceRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECORDS_KEY, JSON.stringify(list));
}

export function loadCorrections(): AttendanceCorrection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CORRECTIONS_KEY);
    if (!raw) {
      const seed = buildSeedCorrections(loadDailyRecords());
      localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as AttendanceCorrection[];
  } catch {
    return [];
  }
}

export function saveCorrections(list: AttendanceCorrection[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(list));
}

export function getRecordById(id: number): DailyAttendanceRecord | undefined {
  return loadDailyRecords().find((r) => r.id === id);
}

export function getRecordsForEmployee(
  employeeId: number,
  opts?: { dateFrom?: string; dateTo?: string; status?: string; shift?: string },
): DailyAttendanceRecord[] {
  let list = loadDailyRecords().filter((r) => r.employeeId === employeeId);
  if (opts?.dateFrom) list = list.filter((r) => r.date >= opts.dateFrom!);
  if (opts?.dateTo) list = list.filter((r) => r.date <= opts.dateTo!);
  if (opts?.status && opts.status !== "all") {
    list = list.filter((r) => r.attendanceStatus === opts.status);
  }
  if (opts?.shift && opts.shift !== "all") {
    list = list.filter((r) => r.shift === opts.shift);
  }
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

function countStatus(records: DailyAttendanceRecord[]) {
  return {
    present: records.filter((r) => r.attendanceStatus === "present" || r.attendanceStatus === "wfh").length,
    absent: records.filter((r) => r.attendanceStatus === "absent").length,
    halfDay: records.filter((r) => r.attendanceStatus === "half_day").length,
    leave: records.filter((r) => r.attendanceStatus === "leave").length,
    holiday: records.filter((r) => r.attendanceStatus === "holiday").length,
    weekOff: records.filter((r) => r.attendanceStatus === "week_off").length,
    lateComing: records.filter((r) => r.lateMinutes > 0).length,
    earlyLeaving: records.filter((r) => r.earlyMinutes > 0).length,
  };
}

export function buildEmployeeSummaries(
  records: DailyAttendanceRecord[],
  monthKey?: string,
): EmployeeAttendanceSummary[] {
  const month = monthKey ?? currentMonthKey();
  const filtered = records.filter((r) => r.date.startsWith(month));
  const byEmp = new Map<number, DailyAttendanceRecord[]>();
  for (const r of filtered) {
    const arr = byEmp.get(r.employeeId) ?? [];
    arr.push(r);
    byEmp.set(r.employeeId, arr);
  }
  const summaries: EmployeeAttendanceSummary[] = [];
  for (const [, empRecords] of byEmp) {
    const c = countStatus(empRecords);
    const first = empRecords[0];
    summaries.push({
      employeeId: first.employeeId,
      employeeName: first.employeeName,
      employeeCode: first.employeeCode,
      department: first.department,
      ...c,
    });
  }
  return summaries.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function buildMonthlySummaries(
  employeeId: number,
  records: DailyAttendanceRecord[],
): MonthlyAttendanceSummary[] {
  const empRecords = records.filter((r) => r.employeeId === employeeId);
  const months = new Set(empRecords.map((r) => r.date.slice(0, 7)));
  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map((month) => {
      const monthRecords = empRecords.filter((r) => r.date.startsWith(month));
      const c = countStatus(monthRecords);
      return { month, label: monthLabel(month), ...c };
    });
}

export function getCorrectionsForEmployee(employeeId: number): AttendanceCorrection[] {
  return loadCorrections()
    .filter((c) => c.employeeId === employeeId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function reviewCorrection(
  id: number,
  action: "approved" | "rejected",
): AttendanceCorrection | undefined {
  const list = loadCorrections();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  const updated: AttendanceCorrection = {
    ...list[idx],
    status: action,
    approvedBy: CURRENT_USER,
  };
  list[idx] = updated;
  saveCorrections(list);
  if (action === "approved") {
    const records = loadDailyRecords();
    const ridx = records.findIndex((r) => r.id === updated.recordId);
    if (ridx >= 0) {
      records[ridx] = {
        ...records[ridx],
        attendanceStatus: updated.requestedStatus,
        correctionApprovedBy: CURRENT_USER,
        updatedBy: CURRENT_USER,
      };
      saveDailyRecords(records);
    }
  }
  return updated;
}

export function getShiftOptions(records: DailyAttendanceRecord[]): string[] {
  return Array.from(new Set(records.map((r) => r.shift))).sort();
}

export { SOURCE_LABELS, SHIFTS };

/** @deprecated use loadDailyRecords */
export function loadAttendanceRecords() {
  return loadDailyRecords();
}
