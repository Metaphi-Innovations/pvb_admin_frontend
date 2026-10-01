/**
 * Employee-level Joining Checklist completion (prototype).
 * Master definitions live in settings/onboarding-data.
 * Completions are stored separately so master changes do not wipe history.
 */

import {
  areMandatoryDocumentsComplete,
  getActiveJoiningChecklistItems,
  loadJoiningChecklist,
  type JoiningChecklistDetectKey,
  type JoiningChecklistRecord,
} from "../settings/onboarding-data";
import { getEmployeeProfileCompletion } from "./employee-display";
import type { HrEmployee } from "./employee-master-data";

const COMPLETIONS_KEY = "ds_hr_employee_joining_checklist_completions_v1";

export interface EmployeeChecklistCompletion {
  checklistItemId: number;
  /** Snapshot of name when completed/instantiated — retained if master is later inactivated */
  itemName: string;
  completed: boolean;
  completedOn: string;
}

type CompletionsMap = Record<string, EmployeeChecklistCompletion[]>;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadAllCompletions(): CompletionsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CompletionsMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAllCompletions(map: CompletionsMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(map));
}

export function loadEmployeeChecklistCompletions(
  employeeId: number,
): EmployeeChecklistCompletion[] {
  return loadAllCompletions()[String(employeeId)] ?? [];
}

export function saveEmployeeChecklistCompletions(
  employeeId: number,
  rows: EmployeeChecklistCompletion[],
): void {
  const map = loadAllCompletions();
  map[String(employeeId)] = rows;
  saveAllCompletions(map);
}

function filled(v: string | null | undefined): boolean {
  return !!v && String(v).trim().length > 0 && v !== "—";
}

function evaluateDetectKey(key: JoiningChecklistDetectKey, employee: HrEmployee): boolean | null {
  switch (key) {
    case "profile":
      return getEmployeeProfileCompletion(employee).percent >= 100;
    case "mandatory_docs":
      return areMandatoryDocumentsComplete(employee.documents);
    case "bank":
      return filled(employee.bank?.accountNumber);
    case "gov_ids":
      return filled(employee.governmentIds?.pan) || filled(employee.governmentIds?.aadhaar);
    case "employment":
      return filled(employee.department) && filled(employee.designation) && filled(employee.branch);
    case "shift":
      return filled(employee.profileSummaries?.attendance?.shift);
    case "salary":
      return filled(employee.profileSummaries?.payroll?.structure);
    case "appointment_letter": {
      const letters = employee.profileSummaries?.hrLetters ?? [];
      return letters.some((l) => /appointment/i.test(l.type ?? ""));
    }
    case "manual":
      return null;
    default:
      return null;
  }
}

export type EmployeeJoiningChecklistRow = {
  checklistItemId: number;
  name: string;
  sequence: number;
  mandatory: boolean;
  /** Master still active — inactive rows are historical only */
  masterActive: boolean;
  status: "Pending" | "Completed";
  completed: boolean;
  completedOn: string;
  /** Auto-derived from employee data */
  autoComplete: boolean;
  /** HR can toggle manually (manual items, or auto items still pending) */
  canToggle: boolean;
  detectKey: JoiningChecklistDetectKey;
};

/**
 * Live evaluation: active master items + historically completed inactive items.
 * Does not destroy prior completions when the master changes.
 */
export function buildEmployeeJoiningChecklist(
  employee: HrEmployee,
  masterList?: JoiningChecklistRecord[],
): EmployeeJoiningChecklistRow[] {
  const master = masterList ?? loadJoiningChecklist();
  const completions = loadEmployeeChecklistCompletions(employee.id);
  const completionById = new Map(completions.map((c) => [c.checklistItemId, c]));

  const active = getActiveJoiningChecklistItems(master);
  const activeIds = new Set(active.map((r) => r.id));

  const rows: EmployeeJoiningChecklistRow[] = [];

  for (const item of active) {
    rows.push(resolveRow(employee, item, true, completionById.get(item.id)));
  }

  // Historical inactive items already touched for this employee
  for (const c of completions) {
    if (activeIds.has(c.checklistItemId)) continue;
    const item = master.find((m) => m.id === c.checklistItemId);
    if (item) {
      rows.push(resolveRow(employee, item, false, c));
    } else if (c.completed || c.itemName) {
      rows.push({
        checklistItemId: c.checklistItemId,
        name: c.itemName,
        sequence: 9999,
        mandatory: false,
        masterActive: false,
        status: c.completed ? "Completed" : "Pending",
        completed: c.completed,
        completedOn: c.completedOn,
        autoComplete: false,
        canToggle: true,
        detectKey: "manual",
      });
    }
  }

  return rows.sort((a, b) => a.sequence - b.sequence || a.checklistItemId - b.checklistItemId);
}

function resolveRow(
  employee: HrEmployee,
  item: JoiningChecklistRecord,
  masterActive: boolean,
  stored: EmployeeChecklistCompletion | undefined,
): EmployeeJoiningChecklistRow {
  const auto = evaluateDetectKey(item.detectKey, employee);
  const autoOk = auto === true;
  const manualOk = !!stored?.completed;
  const completed = autoOk || manualOk;
  const completedOn = completed
    ? stored?.completedOn || (autoOk ? todayStr() : "")
    : "";

  return {
    checklistItemId: item.id,
    name: item.name,
    sequence: item.sequence,
    mandatory: item.mandatory,
    masterActive,
    status: completed ? "Completed" : "Pending",
    completed,
    completedOn,
    autoComplete: autoOk,
    canToggle: !autoOk,
    detectKey: item.detectKey,
  };
}

/** Mark / unmark a checklist item manually for an employee. */
export function setEmployeeChecklistItemComplete(
  employee: HrEmployee,
  checklistItemId: number,
  itemName: string,
  completed: boolean,
): EmployeeChecklistCompletion[] {
  const list = loadEmployeeChecklistCompletions(employee.id);
  const idx = list.findIndex((c) => c.checklistItemId === checklistItemId);
  const next: EmployeeChecklistCompletion = {
    checklistItemId,
    itemName,
    completed,
    completedOn: completed ? todayStr() : "",
  };
  let rows: EmployeeChecklistCompletion[];
  if (idx >= 0) {
    rows = list.map((c, i) => (i === idx ? next : c));
  } else {
    rows = [...list, next];
  }
  saveEmployeeChecklistCompletions(employee.id, rows);
  return rows;
}

export function getJoiningChecklistStats(rows: EmployeeJoiningChecklistRow[]) {
  const base = rows.filter((r) => r.masterActive);
  const list = base.length > 0 ? base : rows;
  const completed = list.filter((r) => r.completed).length;
  return {
    assigned: list.length,
    completed,
    pending: list.length - completed,
  };
}

/** Active mandatory checklist items all complete. */
export function areMandatoryJoiningChecklistComplete(employee: HrEmployee): boolean {
  const rows = buildEmployeeJoiningChecklist(employee);
  const mandatory = rows.filter((r) => r.masterActive && r.mandatory);
  if (mandatory.length === 0) return true;
  return mandatory.every((r) => r.completed);
}

/** Onboarding complete when mandatory checklist + mandatory documents are done. */
export function isEmployeeOnboardingComplete(employee: HrEmployee): boolean {
  return (
    areMandatoryJoiningChecklistComplete(employee) &&
    areMandatoryDocumentsComplete(employee.documents)
  );
}

export function getEmployeeOnboardingStatusLabel(employee: HrEmployee): string {
  if (isEmployeeOnboardingComplete(employee)) return "Completed";
  const rows = buildEmployeeJoiningChecklist(employee);
  if (rows.some((r) => r.completed)) return "In Progress";
  return employee.profileSummaries?.onboarding ? "In Progress" : "Not Started";
}
