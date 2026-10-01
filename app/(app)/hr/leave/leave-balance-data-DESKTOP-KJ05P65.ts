/**
 * Shared HR leave balances + optional holidays (frontend/demo).
 * Leave types shown per employee come from the assigned Leave Policy.
 * Optional holiday dates resolve from Holiday Calendar — not hardcoded ledger rows.
 */

import { BRANCH_OPTIONS } from "@/lib/hr/config";
import {
  getActiveLeaveTypeNames,
  getAssignedLeavePolicy,
  type LeavePolicyRecord,
} from "@/app/(app)/hr/settings/leave-data";
import {
  currentCalendarYear,
  getCalendarsForYear,
  loadHolidayCalendars,
  normalizeHolidayName,
  type HolidayCalendarRecord,
  type HolidayRow,
} from "@/app/(app)/hr/settings/holiday-calendar-data";
import { loadBranches } from "@/app/(app)/hr/settings/organization-data";
import { getActiveHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";

/** Seed / display names — Prefer getActiveLeaveTypeNames() for runtime lists */
export const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Optional Leave"] as const;
export type LeaveTypeName = string;

export const OPTIONAL_LEAVE_TYPE_NAME = "Optional Leave";

export type LeaveAdjustAgainst = string;

export type OptionalHolidayStatus = "available" | "availed";

export interface OptionalHolidayRow {
  key: string;
  name: string;
  date: string;
  status: OptionalHolidayStatus;
  calendarId?: number;
  holidayRowId?: number;
}

export interface EmployeeLeaveCreditRow {
  leaveType: string;
  leaveTypeId?: number;
  credited: number;
  used: number;
}

export interface EmployeeLeaveLedger {
  employeeCode: string;
  employeeId: number;
  leavePolicyId?: number;
  rows: EmployeeLeaveCreditRow[];
  /** Availed optional holiday keys — names/dates come from Holiday Calendar */
  availedOptionalKeys?: string[];
  /** @deprecated Legacy demo rows — migrated to availedOptionalKeys on load */
  optionalHolidays?: { id: string; name: string; date: string; status: OptionalHolidayStatus }[];
}

export interface EmployeeLeaveBalanceView {
  leaveType: string;
  credited: number;
  used: number;
  pending: number;
  remaining: number;
}

const STORAGE_KEY = "ds_hr_leave_balances_v3";

const EMPLOYEE_BRANCH_STATE: Record<string, string> = {
  "hq-pune": "Maharashtra",
  "branch-mumbai": "Maharashtra",
  "branch-nagpur": "Maharashtra",
  "warehouse-aurangabad": "Maharashtra",
};

const DEMO_LEDGER: EmployeeLeaveLedger = {
  employeeCode: "EMP-DEMO-001",
  employeeId: 6,
  leavePolicyId: 1,
  rows: [
    { leaveType: "Casual Leave", leaveTypeId: 1, credited: 8, used: 2 },
    { leaveType: "Sick Leave", leaveTypeId: 2, credited: 6, used: 2 },
    { leaveType: "Optional Leave", leaveTypeId: 3, credited: 2, used: 1 },
  ],
  availedOptionalKeys: ["2026:2026-08-28:raksha bandhan"],
};

interface LeaveBalanceStore {
  ledgers: EmployeeLeaveLedger[];
}

function defaultStore(): LeaveBalanceStore {
  return { ledgers: [structuredClone(DEMO_LEDGER)] };
}

export function optionalHolidayKey(year: number, date: string, name: string): string {
  return `${year}:${date.slice(0, 10)}:${normalizeHolidayName(name)}`;
}

function migrateLegacyOptionalHolidays(ledger: EmployeeLeaveLedger): boolean {
  let changed = false;
  if (!ledger.availedOptionalKeys) {
    ledger.availedOptionalKeys = [];
    changed = true;
  }
  if (ledger.optionalHolidays?.length) {
    for (const h of ledger.optionalHolidays) {
      if (h.status === "availed") {
        const year = Number(h.date.slice(0, 4)) || currentCalendarYear();
        const key = optionalHolidayKey(year, h.date, h.name);
        if (!ledger.availedOptionalKeys.includes(key)) {
          ledger.availedOptionalKeys.push(key);
          changed = true;
        }
      }
    }
    delete ledger.optionalHolidays;
    changed = true;
  }
  return changed;
}

function normalizeLedger(ledger: EmployeeLeaveLedger): EmployeeLeaveLedger {
  const next = { ...ledger };
  migrateLegacyOptionalHolidays(next);
  return next;
}

export function loadLeaveBalanceStore(): LeaveBalanceStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = defaultStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as LeaveBalanceStore;
    if (!parsed.ledgers?.length) {
      const seed = defaultStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    let changed = false;
    parsed.ledgers = parsed.ledgers.map((l) => {
      const n = normalizeLedger(l);
      if (n !== l) changed = true;
      return n;
    });
    if (!parsed.ledgers.some((l) => l.employeeCode === DEMO_LEDGER.employeeCode)) {
      parsed.ledgers.push(structuredClone(DEMO_LEDGER));
      changed = true;
    }
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return defaultStore();
  }
}

export function saveLeaveBalanceStore(store: LeaveBalanceStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function notifyLeaveBalanceChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hr-leave-balance-updated"));
}

export function getLedgerForEmployee(
  employeeId: number,
  employeeCode: string,
): EmployeeLeaveLedger | undefined {
  const store = loadLeaveBalanceStore();
  const ledger =
    store.ledgers.find((l) => l.employeeCode === employeeCode) ??
    store.ledgers.find((l) => l.employeeId === employeeId);
  return ledger ? normalizeLedger(ledger) : undefined;
}

function getEmployeeBranch(employeeId: number, employeeCode: string): string {
  const emp =
    getActiveHrEmployees().find((e) => e.employeeCode === employeeCode) ??
    getActiveHrEmployees().find((e) => e.id === employeeId);
  return emp?.branch ?? "hq-pune";
}

function resolveEmployeeHolidayScope(branchSlug: string): {
  state: string;
  branchId: number | null;
} {
  const state = EMPLOYEE_BRANCH_STATE[branchSlug] ?? "";
  const label = BRANCH_OPTIONS.find((b) => b.value === branchSlug)?.label ?? "";
  const cityPart = label.split("—")[1]?.trim().toLowerCase() ?? "";
  const orgBranch = loadBranches()
    .filter((b) => b.status === "active")
    .find(
      (b) =>
        b.state === state &&
        (b.name.toLowerCase().includes(cityPart) ||
          label.toLowerCase().includes(b.name.toLowerCase())),
    );
  return { state, branchId: orgBranch?.id ?? null };
}

function calendarAppliesToEmployee(
  calendar: HolidayCalendarRecord,
  scope: { state: string; branchId: number | null },
): boolean {
  if (calendar.status !== "active") return false;
  if (calendar.applicableTo === "company_wide") return true;
  if (calendar.applicableTo === "state" && scope.state && calendar.state === scope.state) {
    return true;
  }
  if (
    calendar.applicableTo === "branch" &&
    scope.branchId != null &&
    calendar.branchId === scope.branchId
  ) {
    return true;
  }
  return false;
}

function dedupeOptionalRows(rows: OptionalHolidayRow[]): OptionalHolidayRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.key)) return false;
    seen.add(r.key);
    return true;
  });
}

export function resolveEmployeeOptionalHolidays(
  employeeId: number,
  employeeCode: string,
  year: number = currentCalendarYear(),
  branchSlug?: string,
): OptionalHolidayRow[] {
  const branch = branchSlug ?? getEmployeeBranch(employeeId, employeeCode);
  const scope = resolveEmployeeHolidayScope(branch);
  const calendars = getCalendarsForYear(year, loadHolidayCalendars()).filter((c) =>
    calendarAppliesToEmployee(c, scope),
  );

  const ledger = getLedgerForEmployee(employeeId, employeeCode);
  const availed = new Set(ledger?.availedOptionalKeys ?? []);

  const rows: OptionalHolidayRow[] = [];
  for (const cal of calendars) {
    for (const h of cal.holidays.filter((x) => x.holidayType === "optional")) {
      const key = optionalHolidayKey(year, h.date, h.name);
      rows.push({
        key,
        name: h.name,
        date: h.date.slice(0, 10),
        status: availed.has(key) ? "availed" : "available",
        calendarId: cal.id,
        holidayRowId: h.id,
      });
    }
  }

  return dedupeOptionalRows(rows).sort((a, b) => a.date.localeCompare(b.date));
}

export function getAvailableOptionalHolidaysForEmployee(
  employeeId: number,
  employeeCode: string,
  year?: number,
  branchSlug?: string,
): OptionalHolidayRow[] {
  return resolveEmployeeOptionalHolidays(
    employeeId,
    employeeCode,
    year ?? currentCalendarYear(),
    branchSlug,
  ).filter((h) => h.status === "available");
}

export function isEligibleOptionalHolidayDate(
  employeeId: number,
  employeeCode: string,
  isoDate: string,
  branchSlug?: string,
): boolean {
  const year = Number(isoDate.slice(0, 4)) || currentCalendarYear();
  return resolveEmployeeOptionalHolidays(employeeId, employeeCode, year, branchSlug).some(
    (h) => h.date === isoDate.slice(0, 10) && h.status === "available",
  );
}

export function findOptionalHolidayByKey(
  employeeId: number,
  employeeCode: string,
  key: string,
  branchSlug?: string,
): OptionalHolidayRow | undefined {
  const year = Number(key.split(":")[0]) || currentCalendarYear();
  return resolveEmployeeOptionalHolidays(
    employeeId,
    employeeCode,
    year,
    branchSlug,
  ).find((h) => h.key === key);
}

export type PendingDaysResolver = (
  employeeId: number,
  employeeCode: string,
  leaveType: string,
) => number;

let pendingResolver: PendingDaysResolver = () => 0;

export function registerLeavePendingResolver(fn: PendingDaysResolver): void {
  pendingResolver = fn;
}

function findLedgerRow(
  rows: EmployeeLeaveCreditRow[],
  leaveTypeName: string,
  leaveTypeId?: number,
): EmployeeLeaveCreditRow | undefined {
  return rows.find(
    (r) =>
      r.leaveType === leaveTypeName ||
      (leaveTypeId != null && r.leaveTypeId === leaveTypeId),
  );
}

/** Ensure policy leave types exist on the ledger (new types get allowedLeaves as credited). */
function ensurePolicyRowsOnLedger(
  ledger: EmployeeLeaveLedger,
  policy: LeavePolicyRecord,
): boolean {
  let changed = false;
  for (const line of policy.lines) {
    if (!findLedgerRow(ledger.rows, line.leaveTypeName, line.leaveTypeId)) {
      ledger.rows.push({
        leaveType: line.leaveTypeName,
        leaveTypeId: line.leaveTypeId,
        credited: line.allowedLeaves,
        used: 0,
      });
      changed = true;
    }
  }
  if (ledger.leavePolicyId !== policy.id) {
    ledger.leavePolicyId = policy.id;
    changed = true;
  }
  return changed;
}

export function getEmployeeLeaveBalances(
  employeeId: number,
  employeeCode: string,
): EmployeeLeaveBalanceView[] {
  const policy = getAssignedLeavePolicy(employeeCode);
  const store = loadLeaveBalanceStore();
  let ledger =
    store.ledgers.find((l) => l.employeeCode === employeeCode) ??
    store.ledgers.find((l) => l.employeeId === employeeId);

  if (policy) {
    if (!ledger) {
      ledger = {
        employeeCode,
        employeeId,
        leavePolicyId: policy.id,
        rows: policy.lines.map((line) => ({
          leaveType: line.leaveTypeName,
          leaveTypeId: line.leaveTypeId,
          credited: line.allowedLeaves,
          used: 0,
        })),
        availedOptionalKeys: [],
      };
      store.ledgers.push(ledger);
      saveLeaveBalanceStore(store);
    } else if (ensurePolicyRowsOnLedger(ledger, policy)) {
      saveLeaveBalanceStore(store);
    }

    return policy.lines.map((line) => {
      const row = findLedgerRow(ledger!.rows, line.leaveTypeName, line.leaveTypeId);
      const credited = row?.credited ?? line.allowedLeaves;
      const used = row?.used ?? 0;
      const pending = pendingResolver(employeeId, employeeCode, line.leaveTypeName);
      return {
        leaveType: line.leaveTypeName,
        credited,
        used,
        pending,
        remaining: Math.max(0, credited - used),
      };
    });
  }

  if (!ledger) return [];
  return ledger.rows.map((row) => {
    const pending = pendingResolver(employeeId, employeeCode, row.leaveType);
    return {
      leaveType: row.leaveType,
      credited: row.credited,
      used: row.used,
      pending,
      remaining: Math.max(0, row.credited - row.used),
    };
  });
}

/** @deprecated Use resolveEmployeeOptionalHolidays */
export function getOptionalHolidaysForEmployee(
  employeeId: number,
  employeeCode: string,
): OptionalHolidayRow[] {
  return resolveEmployeeOptionalHolidays(employeeId, employeeCode);
}

export function getLeaveBalanceContext(
  employeeId: number,
  employeeCode: string,
  leaveType: string,
): EmployeeLeaveBalanceView | null {
  const rows = getEmployeeLeaveBalances(employeeId, employeeCode);
  return rows.find((r) => r.leaveType === leaveType) ?? null;
}

export function adjustAgainstOptionsForLeaveType(leaveType: string): LeaveAdjustAgainst[] {
  if (!leaveType || leaveType === "Unpaid") return ["Unpaid"];
  return [leaveType, "Unpaid"];
}

export type LeaveApproveCheck =
  | { ok: true; balance: EmployeeLeaveBalanceView | null; afterApproval: number | null }
  | {
      ok: false;
      error: string;
      available: number;
      requested: number;
      balance: EmployeeLeaveBalanceView | null;
    };

export function checkLeaveApproval(
  employeeId: number,
  employeeCode: string,
  leaveType: string,
  requestedDays: number,
  adjustAgainst: LeaveAdjustAgainst,
): LeaveApproveCheck {
  if (adjustAgainst === "Unpaid") {
    return {
      ok: true,
      balance: getLeaveBalanceContext(employeeId, employeeCode, leaveType),
      afterApproval: null,
    };
  }

  if (adjustAgainst !== leaveType) {
    return {
      ok: false,
      error: `Cannot adjust ${leaveType} against ${adjustAgainst}.`,
      available: 0,
      requested: requestedDays,
      balance: null,
    };
  }

  const balance = getLeaveBalanceContext(employeeId, employeeCode, leaveType);
  if (!balance) {
    return {
      ok: false,
      error: `No leave balance found for ${leaveType}.`,
      available: 0,
      requested: requestedDays,
      balance: null,
    };
  }
  if (requestedDays > balance.remaining) {
    return {
      ok: false,
      error: `Insufficient ${leaveType} balance.`,
      available: balance.remaining,
      requested: requestedDays,
      balance,
    };
  }
  return {
    ok: true,
    balance,
    afterApproval: balance.remaining - requestedDays,
  };
}

export function applyLeaveApprovalToBalance(
  employeeId: number,
  employeeCode: string,
  leaveType: string,
  days: number,
): boolean {
  const store = loadLeaveBalanceStore();
  let ledger = store.ledgers.find((l) => l.employeeCode === employeeCode);
  if (!ledger) {
    ledger = store.ledgers.find((l) => l.employeeId === employeeId);
  }
  if (!ledger) return false;

  let row = findLedgerRow(ledger.rows, leaveType);
  if (!row) {
    row = { leaveType, credited: 0, used: 0 };
    ledger.rows.push(row);
  }

  row.used = Math.max(0, row.used + days);
  saveLeaveBalanceStore(store);
  notifyLeaveBalanceChanged();
  return true;
}

export function markOptionalHolidayAvailed(
  employeeId: number,
  employeeCode: string,
  holidayKey: string,
): boolean {
  if (!holidayKey) return false;
  const store = loadLeaveBalanceStore();
  let ledger = store.ledgers.find((l) => l.employeeCode === employeeCode);
  if (!ledger) {
    ledger = store.ledgers.find((l) => l.employeeId === employeeId);
  }
  if (!ledger) return false;

  if (!ledger.availedOptionalKeys) ledger.availedOptionalKeys = [];
  if (!ledger.availedOptionalKeys.includes(holidayKey)) {
    ledger.availedOptionalKeys.push(holidayKey);
  }
  saveLeaveBalanceStore(store);
  notifyLeaveBalanceChanged();
  return true;
}

/** @deprecated Use markOptionalHolidayAvailed with optionalHolidayKey */
export function markOptionalHolidayAvailedByLegacyId(
  employeeId: number,
  employeeCode: string,
  legacyId: string,
): boolean {
  if (legacyId.startsWith("opt-")) {
    const demoKey = "2026:2026-08-28:raksha bandhan";
    if (legacyId === "opt-raksha") return markOptionalHolidayAvailed(employeeId, employeeCode, demoKey);
  }
  return markOptionalHolidayAvailed(employeeId, employeeCode, legacyId);
}

export function notifyLeaveRequestStatusChanged(): void {
  notifyLeaveBalanceChanged();
}

/** Active leave type names from Settings (for request filters etc.) */
export function getRuntimeLeaveTypeNames(): string[] {
  const names = getActiveLeaveTypeNames();
  return names.length ? names : [...LEAVE_TYPES];
}

/** Alias — optional holidays for employee (Holiday Calendar optional rows). */
export function getOptionalHolidays(
  employeeId: number,
  employeeCode: string,
  year?: number,
  branchSlug?: string,
): OptionalHolidayRow[] {
  return resolveEmployeeOptionalHolidays(
    employeeId,
    employeeCode,
    year ?? currentCalendarYear(),
    branchSlug,
  );
}

export type { HolidayRow };
