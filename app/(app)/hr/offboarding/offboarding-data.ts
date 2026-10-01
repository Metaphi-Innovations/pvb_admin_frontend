/**
 * Employee Offboarding — frontend/demo persistence.
 * Letters reuse ds_hr_generated_documents_v1 via HR Letters helpers.
 * No F&F payroll calculation.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { createHrNotification } from "@/lib/hr/hr-notifications";
import { policyToday } from "@/lib/hr/policy-common";
import {
  getHrEmployeeById,
  loadHrEmployees,
  updateHrEmployee,
  type EmploymentStatus,
  type HrEmployee,
} from "@/app/(app)/hr/employees/employee-master-data";
import { listHrLettersForEmployee } from "@/app/(app)/hr/hr-letters/hr-letters-data";
import type { GeneratedHrDocument, HrTemplateTypeKey, TemplateRenderContext } from "@/app/(app)/hr/settings/hr-template-data";

const STORAGE_KEY = "ds_hr_offboarding_v1";
export const HR_OFFBOARDING_EVENT = "hr-offboarding-updated";

export type OffboardingExitType =
  | "resignation"
  | "termination"
  | "retirement"
  | "contract_completion"
  | "absconding"
  | "other";

export type OffboardingStatus =
  | "pending_review"
  | "initiated"
  | "notice_period"
  | "clearance_pending"
  | "ready_for_exit"
  | "completed"
  | "cancelled"
  | "rejected";

/** How the exit process originated. Legacy records without source → hr. */
export type OffboardingSource = "employee" | "hr";

export type HandoverStatus = "pending" | "completed" | "not_applicable";
export type AssetReturnStatus = "pending" | "returned" | "not_applicable";
export type ClearanceStatus = "pending" | "cleared" | "not_applicable";
export type FnFStatus = "not_started" | "pending_payroll" | "ready_for_processing" | "completed";
export type RehireFlag = "" | "yes" | "no" | "maybe";

export type LeavingReasonKey =
  | "better_opportunity"
  | "higher_studies"
  | "relocation"
  | "personal"
  | "performance"
  | "policy_violation"
  | "contract_completed"
  | "other";

export interface OffboardingChecklistItem {
  id: string;
  label: string;
  owner: string;
  status: HandoverStatus | AssetReturnStatus | ClearanceStatus;
  completedOn: string;
  remark: string;
  required: boolean;
  custom: boolean;
  assetId?: string;
  condition?: string;
}

export interface OffboardingActivity {
  id: string;
  at: string;
  label: string;
  detail: string;
  by: string;
}

export interface OffboardingAttachment {
  fileName: string;
  sizeLabel: string;
  dataUrl: string;
}

export interface OffboardingRecord {
  id: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
  branch: string;
  exitType: OffboardingExitType;
  status: OffboardingStatus;
  /** employee = mobile/resignation intake; hr = Start Offboarding. Legacy → hr. */
  source: OffboardingSource;
  initiatedDate: string;
  /** Final LWD confirmed by HR (or set at HR start). */
  lastWorkingDate: string;
  /** Employee-proposed LWD (resignation intake). Preserved after accept. */
  proposedLastWorkingDate: string;
  reason: string;
  reasonKey: LeavingReasonKey | "";
  /** Employee remarks on resignation submission. */
  employeeRemarks: string;
  /** HR remarks at accept / process. */
  hrRemarks: string;
  internalNotes: string;
  resignationDate: string;
  terminationDate: string;
  immediateExit: boolean;
  noticeWaiver: boolean;
  requiredNoticeDays: string;
  servedNoticeDays: string;
  lastAttendedDate: string;
  reportedDate: string;
  handover: OffboardingChecklistItem[];
  assets: OffboardingChecklistItem[];
  clearance: OffboardingChecklistItem[];
  interviewConducted: boolean;
  interviewDate: string;
  interviewBy: string;
  leavingFeedback: string;
  wouldRehire: RehireFlag;
  experienceRating: number;
  fnfStatus: FnFStatus;
  accessRevocation: "pending" | "completed";
  attachment: OffboardingAttachment | null;
  cancelReason: string;
  completedOn: string;
  completedBy: string;
  cancelledOn: string;
  cancelledBy: string;
  submittedAt: string;
  acceptedAt: string;
  acceptedBy: string;
  rejectedAt: string;
  rejectedBy: string;
  rejectionReason: string;
  previousEmploymentStatus: EmploymentStatus;
  previousRecordStatus: "active" | "inactive";
  activity: OffboardingActivity[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export const EXIT_TYPE_OPTIONS: { value: OffboardingExitType; label: string }[] = [
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "retirement", label: "Retirement" },
  { value: "contract_completion", label: "Contract Completion" },
  { value: "absconding", label: "Absconding" },
  { value: "other", label: "Other" },
];

export const LEAVING_REASON_OPTIONS: { value: LeavingReasonKey; label: string }[] = [
  { value: "better_opportunity", label: "Better Opportunity" },
  { value: "higher_studies", label: "Higher Studies" },
  { value: "relocation", label: "Relocation" },
  { value: "personal", label: "Personal Reasons" },
  { value: "performance", label: "Performance" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "contract_completed", label: "Contract Completed" },
  { value: "other", label: "Other" },
];

export const FNF_STATUS_OPTIONS: { value: FnFStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "pending_payroll", label: "Pending Payroll" },
  { value: "ready_for_processing", label: "Ready for Processing" },
  { value: "completed", label: "Completed" },
];

export function exitTypeLabel(t: OffboardingExitType): string {
  return EXIT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function offboardingStatusLabel(s: OffboardingStatus): string {
  switch (s) {
    case "pending_review":
      return "Pending Review";
    case "initiated":
      return "Initiated";
    case "notice_period":
      return "Notice Period";
    case "clearance_pending":
      return "Clearance Pending";
    case "ready_for_exit":
      return "Ready for Exit";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "rejected":
      return "Rejected";
    default:
      return s;
  }
}

export function offboardingSourceLabel(s: OffboardingSource): string {
  return s === "employee" ? "Employee" : "HR";
}

export function leavingReasonLabel(key: LeavingReasonKey | ""): string {
  if (!key) return "";
  return LEAVING_REASON_OPTIONS.find((o) => o.value === key)?.label ?? key;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function item(
  label: string,
  owner: string,
  required: boolean,
  extra?: Partial<OffboardingChecklistItem>,
): OffboardingChecklistItem {
  return {
    id: newId("ci"),
    label,
    owner,
    status: "pending",
    completedOn: "",
    remark: "",
    required,
    custom: false,
    ...extra,
  };
}

export function defaultHandoverItems(): OffboardingChecklistItem[] {
  return [
    item("Knowledge Handover", "", true),
    item("Project Handover", "", true),
    item("Client Handover", "", false),
    item("Password / Access Handover", "", true),
    item("Document Handover", "", true),
  ];
}

export function defaultAssetItems(): OffboardingChecklistItem[] {
  return [
    item("Laptop", "IT", true, { assetId: "", condition: "" }),
    item("Mobile", "IT", false, { assetId: "", condition: "" }),
    item("ID Card", "Admin", true, { assetId: "", condition: "" }),
    item("Access Card", "Admin", true, { assetId: "", condition: "" }),
    item("SIM", "IT", false, { assetId: "", condition: "" }),
  ];
}

export function defaultClearanceItems(): OffboardingChecklistItem[] {
  return [
    item("Reporting Manager", "Reporting Manager", true),
    item("HR", "HR", true),
    item("IT", "IT", true),
    item("IT — Access Revocation", "IT", true),
    item("Admin", "Admin", true),
    item("Finance", "Finance", true),
  ];
}

function activity(label: string, detail: string): OffboardingActivity {
  return { id: newId("act"), at: nowIso(), label, detail, by: CURRENT_USER };
}

export function shortfallDays(required: string, served: string): number | null {
  const r = Number(required);
  const s = Number(served);
  if (!Number.isFinite(r) || !Number.isFinite(s) || required.trim() === "" || served.trim() === "") {
    return null;
  }
  return Math.max(0, Math.round(r - s));
}

function requiredPending(
  items: OffboardingChecklistItem[],
  done: Array<OffboardingChecklistItem["status"]>,
): OffboardingChecklistItem[] {
  return items.filter((i) => i.required && !done.includes(i.status));
}

export function getCompletionBlockers(r: OffboardingRecord): string[] {
  const blockers: string[] = [];
  if (!r.lastWorkingDate.trim()) blockers.push("Last Working Date is required.");
  const h = requiredPending(r.handover, ["completed", "not_applicable"]);
  if (h.length) blockers.push(`Required handover incomplete: ${h.map((i) => i.label).join(", ")}.`);
  const a = requiredPending(r.assets, ["returned", "not_applicable", "completed"]);
  if (a.length) blockers.push(`Required asset return incomplete: ${a.map((i) => i.label).join(", ")}.`);
  const c = requiredPending(r.clearance, ["cleared", "not_applicable", "completed"]);
  if (c.length) blockers.push(`Required clearance incomplete: ${c.map((i) => i.label).join(", ")}.`);
  return blockers;
}

export function optionalPendingSummary(r: OffboardingRecord): string[] {
  const out: string[] = [];
  for (const i of r.handover) {
    if (!i.required && i.status === "pending") out.push(`Handover: ${i.label}`);
  }
  for (const i of r.assets) {
    if (!i.required && i.status === "pending") out.push(`Asset: ${i.label}`);
  }
  for (const i of r.clearance) {
    if (!i.required && i.status === "pending") out.push(`Clearance: ${i.label}`);
  }
  return out;
}

export function deriveOffboardingStatus(r: OffboardingRecord): OffboardingStatus {
  if (
    r.status === "completed" ||
    r.status === "cancelled" ||
    r.status === "pending_review" ||
    r.status === "rejected"
  ) {
    return r.status;
  }
  const blockers = getCompletionBlockers(r);
  const today = policyToday();
  const lwdFuture = !!r.lastWorkingDate && r.lastWorkingDate > today;
  const clearancePending = requiredPending(r.clearance, ["cleared", "not_applicable", "completed"]).length > 0;
  if (blockers.length === 0) return "ready_for_exit";
  if (clearancePending && !lwdFuture) return "clearance_pending";
  if (lwdFuture) return "notice_period";
  if (clearancePending) return "clearance_pending";
  return "initiated";
}

export function clearanceSummary(r: OffboardingRecord): string {
  const total = r.clearance.length;
  const done = r.clearance.filter((i) => i.status === "cleared" || i.status === "not_applicable").length;
  if (total === 0) return "—";
  if (done === total) return "Cleared";
  return `${done}/${total}`;
}

export function lettersForExitType(exitType: OffboardingExitType): HrTemplateTypeKey[] {
  if (exitType === "termination" || exitType === "absconding") {
    return ["termination_letter", "experience_letter", "relieving_letter"];
  }
  return ["experience_letter", "relieving_letter"];
}

function loadRaw(): OffboardingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => normalizeOffboardingRecord(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

/** Backward-compatible normalize — legacy records without source → hr. */
export function normalizeOffboardingRecord(raw: Record<string, unknown>): OffboardingRecord {
  const statusRaw = String(raw.status ?? "initiated");
  const status = (
    [
      "pending_review",
      "initiated",
      "notice_period",
      "clearance_pending",
      "ready_for_exit",
      "completed",
      "cancelled",
      "rejected",
    ] as OffboardingStatus[]
  ).includes(statusRaw as OffboardingStatus)
    ? (statusRaw as OffboardingStatus)
    : "initiated";

  const source: OffboardingSource =
    raw.source === "employee" || raw.source === "hr" ? raw.source : "hr";

  const lastWorkingDate = String(raw.lastWorkingDate ?? "");
  const proposed =
    String(raw.proposedLastWorkingDate ?? "").trim() ||
    (source === "employee" ? lastWorkingDate : "");

  return {
    id: String(raw.id ?? newId("ob")),
    employeeId: Number(raw.employeeId) || 0,
    employeeCode: String(raw.employeeCode ?? ""),
    employeeName: String(raw.employeeName ?? ""),
    designation: String(raw.designation ?? ""),
    department: String(raw.department ?? ""),
    branch: String(raw.branch ?? ""),
    exitType: (raw.exitType as OffboardingExitType) || "resignation",
    status,
    source,
    initiatedDate: String(raw.initiatedDate ?? ""),
    lastWorkingDate,
    proposedLastWorkingDate: proposed,
    reason: String(raw.reason ?? ""),
    reasonKey: (raw.reasonKey as LeavingReasonKey | "") || "",
    employeeRemarks: String(raw.employeeRemarks ?? ""),
    hrRemarks: String(raw.hrRemarks ?? ""),
    internalNotes: String(raw.internalNotes ?? ""),
    resignationDate: String(raw.resignationDate ?? ""),
    terminationDate: String(raw.terminationDate ?? ""),
    immediateExit: raw.immediateExit === true,
    noticeWaiver: raw.noticeWaiver === true,
    requiredNoticeDays: String(raw.requiredNoticeDays ?? ""),
    servedNoticeDays: String(raw.servedNoticeDays ?? ""),
    lastAttendedDate: String(raw.lastAttendedDate ?? ""),
    reportedDate: String(raw.reportedDate ?? ""),
    handover: Array.isArray(raw.handover) ? (raw.handover as OffboardingChecklistItem[]) : defaultHandoverItems(),
    assets: Array.isArray(raw.assets) ? (raw.assets as OffboardingChecklistItem[]) : defaultAssetItems(),
    clearance: Array.isArray(raw.clearance)
      ? (raw.clearance as OffboardingChecklistItem[])
      : defaultClearanceItems(),
    interviewConducted: raw.interviewConducted === true,
    interviewDate: String(raw.interviewDate ?? ""),
    interviewBy: String(raw.interviewBy ?? ""),
    leavingFeedback: String(raw.leavingFeedback ?? ""),
    wouldRehire: (raw.wouldRehire as RehireFlag) || "",
    experienceRating: Number(raw.experienceRating) || 0,
    fnfStatus: (raw.fnfStatus as FnFStatus) || "not_started",
    accessRevocation: raw.accessRevocation === "completed" ? "completed" : "pending",
    attachment: (raw.attachment as OffboardingAttachment | null) ?? null,
    cancelReason: String(raw.cancelReason ?? ""),
    completedOn: String(raw.completedOn ?? ""),
    completedBy: String(raw.completedBy ?? ""),
    cancelledOn: String(raw.cancelledOn ?? ""),
    cancelledBy: String(raw.cancelledBy ?? ""),
    submittedAt: String(raw.submittedAt ?? ""),
    acceptedAt: String(raw.acceptedAt ?? ""),
    acceptedBy: String(raw.acceptedBy ?? ""),
    rejectedAt: String(raw.rejectedAt ?? ""),
    rejectedBy: String(raw.rejectedBy ?? ""),
    rejectionReason: String(raw.rejectionReason ?? ""),
    previousEmploymentStatus: (raw.previousEmploymentStatus as EmploymentStatus) || "active",
    previousRecordStatus: raw.previousRecordStatus === "inactive" ? "inactive" : "active",
    activity: Array.isArray(raw.activity) ? (raw.activity as OffboardingActivity[]) : [],
    createdBy: String(raw.createdBy ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    updatedBy: String(raw.updatedBy ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

function saveRaw(list: OffboardingRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(HR_OFFBOARDING_EVENT));
}

export function loadOffboarding(): OffboardingRecord[] {
  return loadRaw().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function getOffboardingById(id: string): OffboardingRecord | undefined {
  return loadRaw().find((r) => r.id === id);
}

export function getOffboardingForEmployee(employeeId: number): OffboardingRecord[] {
  return loadOffboarding().filter((r) => r.employeeId === employeeId);
}

export function getLatestOffboardingForEmployee(employeeId: number): OffboardingRecord | undefined {
  return getOffboardingForEmployee(employeeId)[0];
}

export function employeeHasOpenOffboarding(employeeId: number): boolean {
  return loadRaw().some(
    (r) =>
      r.employeeId === employeeId &&
      r.status !== "completed" &&
      r.status !== "cancelled" &&
      r.status !== "rejected",
  );
}

export function employeeHasCompletedOffboarding(employeeId: number): boolean {
  return loadRaw().some((r) => r.employeeId === employeeId && r.status === "completed");
}

export interface StartOffboardingInput {
  employeeId: number;
  exitType: OffboardingExitType;
  initiatedDate: string;
  lastWorkingDate: string;
  reasonKey: LeavingReasonKey | "";
  reason: string;
  internalNotes: string;
  resignationDate?: string;
  terminationDate?: string;
  immediateExit?: boolean;
  noticeWaiver?: boolean;
  requiredNoticeDays?: string;
  servedNoticeDays?: string;
  lastAttendedDate?: string;
  reportedDate?: string;
}

export function startOffboarding(
  input: StartOffboardingInput,
): { ok: true; record: OffboardingRecord } | { ok: false; error: string } {
  const emp = getHrEmployeeById(input.employeeId);
  if (!emp) return { ok: false, error: "Select an employee." };
  if (emp.status !== "active") return { ok: false, error: "Only active employees can be offboarded." };
  if (employeeHasOpenOffboarding(emp.id)) {
    return { ok: false, error: "This employee already has an active offboarding process." };
  }
  if (employeeHasCompletedOffboarding(emp.id)) {
    return { ok: false, error: "This employee already has a completed offboarding. Rehire is not available yet." };
  }
  if (!input.exitType) return { ok: false, error: "Exit Type is required." };
  if (!input.initiatedDate) return { ok: false, error: "Initiated Date is required." };
  if (!input.lastWorkingDate) return { ok: false, error: "Proposed Last Working Date is required." };
  if (!input.reason.trim() && input.reasonKey !== "other") {
    if (!input.reasonKey) return { ok: false, error: "Reason is required." };
  }
  if (input.reasonKey === "other" && !input.reason.trim()) {
    return { ok: false, error: "Please describe the reason." };
  }

  const reasonText =
    input.reasonKey && input.reasonKey !== "other"
      ? leavingReasonLabel(input.reasonKey)
      : input.reason.trim();

  const today = policyToday();
  const rec: OffboardingRecord = {
    id: newId("ob"),
    employeeId: emp.id,
    employeeCode: emp.employeeCode,
    employeeName: emp.employeeName,
    designation: emp.designation,
    department: emp.department,
    branch: emp.branch,
    exitType: input.exitType,
    status: "initiated",
    source: "hr",
    initiatedDate: input.initiatedDate,
    lastWorkingDate: input.lastWorkingDate,
    proposedLastWorkingDate: input.lastWorkingDate,
    reason: reasonText,
    reasonKey: input.reasonKey,
    employeeRemarks: "",
    hrRemarks: input.internalNotes.trim(),
    internalNotes: input.internalNotes.trim(),
    resignationDate: input.resignationDate || (input.exitType === "resignation" ? input.initiatedDate : ""),
    terminationDate: input.terminationDate || (input.exitType === "termination" ? input.initiatedDate : ""),
    immediateExit: input.immediateExit === true,
    noticeWaiver: input.noticeWaiver === true,
    requiredNoticeDays: input.requiredNoticeDays || "",
    servedNoticeDays: input.servedNoticeDays || "",
    lastAttendedDate: input.lastAttendedDate || "",
    reportedDate: input.reportedDate || "",
    handover: defaultHandoverItems(),
    assets: defaultAssetItems(),
    clearance: defaultClearanceItems(),
    interviewConducted: false,
    interviewDate: "",
    interviewBy: "",
    leavingFeedback: "",
    wouldRehire: "",
    experienceRating: 0,
    fnfStatus: "not_started",
    accessRevocation: "pending",
    attachment: null,
    cancelReason: "",
    completedOn: "",
    completedBy: "",
    cancelledOn: "",
    cancelledBy: "",
    submittedAt: "",
    acceptedAt: "",
    acceptedBy: "",
    rejectedAt: "",
    rejectedBy: "",
    rejectionReason: "",
    previousEmploymentStatus: emp.employmentStatus,
    previousRecordStatus: emp.status,
    activity: [
      activity(
        "Offboarding Initiated",
        `${exitTypeLabel(input.exitType)} · LWD ${input.lastWorkingDate}`,
      ),
    ],
    createdBy: CURRENT_USER,
    createdAt: today,
    updatedBy: CURRENT_USER,
    updatedAt: today,
  };
  rec.status = deriveOffboardingStatus(rec);
  saveRaw([rec, ...loadRaw()]);
  createHrNotification({
    eventType: "offboarding_initiated",
    employeeId: rec.employeeId,
    sourceModule: "offboarding",
    sourceId: rec.id,
    context: {
      employee_name: rec.employeeName,
      last_working_date: rec.lastWorkingDate,
    },
  });
  return { ok: true, record: rec };
}

function stamp(r: OffboardingRecord, extraActivity?: OffboardingActivity): OffboardingRecord {
  const next = {
    ...r,
    updatedBy: CURRENT_USER,
    updatedAt: policyToday(),
    activity: extraActivity ? [extraActivity, ...r.activity] : r.activity,
  };
  if (next.status !== "completed" && next.status !== "cancelled" && next.status !== "rejected" && next.status !== "pending_review") {
    next.status = deriveOffboardingStatus(next);
  }
  return next;
}

export function saveOffboarding(
  record: OffboardingRecord,
  extraActivity?: OffboardingActivity,
): OffboardingRecord {
  const next = stamp(record, extraActivity);
  const list = loadRaw();
  const idx = list.findIndex((r) => r.id === next.id);
  if (idx >= 0) {
    const copy = [...list];
    copy[idx] = next;
    saveRaw(copy);
  } else {
    saveRaw([next, ...list]);
  }
  return next;
}

export function addChecklistItem(
  record: OffboardingRecord,
  kind: "handover" | "assets" | "clearance",
  label: string,
  owner: string,
  remark: string,
): OffboardingRecord {
  const row = item(label.trim() || "Custom item", owner.trim(), false, {
    custom: true,
    remark: remark.trim(),
    assetId: kind === "assets" ? "" : undefined,
    condition: kind === "assets" ? "" : undefined,
  });
  const next = {
    ...record,
    [kind]: [...record[kind], row],
  } as OffboardingRecord;
  return saveOffboarding(next, activity("Checklist item added", `${label.trim()} (${kind})`));
}

export function updateChecklistItem(
  record: OffboardingRecord,
  kind: "handover" | "assets" | "clearance",
  itemId: string,
  patch: Partial<OffboardingChecklistItem>,
): OffboardingRecord {
  const list = record[kind].map((i) => (i.id === itemId ? { ...i, ...patch } : i));
  const prev = record[kind].find((i) => i.id === itemId);
  const updated = list.find((i) => i.id === itemId);
  let act: OffboardingActivity | undefined;
  if (prev && updated && prev.status !== updated.status) {
    if (kind === "assets" && updated.status === "returned") {
      act = activity("Asset Returned", updated.label);
    } else if (kind === "clearance" && (updated.status === "cleared" || updated.status === "completed")) {
      act = activity(
        updated.label.toLowerCase().includes("it") ? "IT Clearance Completed" : "Clearance Completed",
        updated.label,
      );
    } else if (kind === "handover" && updated.status === "completed") {
      act = activity("Handover Completed", updated.label);
    }
  }
  const next = { ...record, [kind]: list } as OffboardingRecord;
  if (updated?.label.toLowerCase().includes("access revocation") && updated.status === "cleared") {
    next.accessRevocation = "completed";
  }
  return saveOffboarding(next, act);
}

export function recordLetterGenerated(record: OffboardingRecord, typeLabel: string): OffboardingRecord {
  return saveOffboarding(record, activity("Letter Generated", typeLabel));
}

export function hasMeaningfulActivity(r: OffboardingRecord): boolean {
  if (r.status === "completed" || r.status === "cancelled") return true;
  if (r.attachment) return true;
  if (r.interviewConducted) return true;
  const touched = (items: OffboardingChecklistItem[]) =>
    items.some((i) => i.custom || i.status !== "pending" || i.remark.trim() || i.completedOn);
  if (touched(r.handover) || touched(r.assets) || touched(r.clearance)) return true;
  const letters = listHrLettersForEmployee({ id: r.employeeId, employeeCode: r.employeeCode });
  if (letters.some((d) => d.status !== "draft")) return true;
  return r.activity.length > 1;
}

export function deleteOffboarding(
  id: string,
): { ok: true } | { ok: false; error: string } {
  const rec = getOffboardingById(id);
  if (!rec) return { ok: false, error: "Record not found." };
  if (hasMeaningfulActivity(rec)) {
    return { ok: false, error: "This process has activity. Cancel offboarding instead of deleting." };
  }
  saveRaw(loadRaw().filter((r) => r.id !== id));
  return { ok: true };
}

export function cancelOffboarding(
  id: string,
  reason: string,
): { ok: true; record: OffboardingRecord } | { ok: false; error: string } {
  const rec = getOffboardingById(id);
  if (!rec) return { ok: false, error: "Record not found." };
  if (rec.status === "completed") return { ok: false, error: "Completed offboarding cannot be cancelled." };
  if (rec.status === "cancelled") return { ok: false, error: "Already cancelled." };
  if (rec.status === "pending_review") {
    return { ok: false, error: "Reject the resignation request instead of cancelling." };
  }
  if (rec.status === "rejected") return { ok: false, error: "Rejected requests cannot be cancelled." };
  if (!reason.trim()) return { ok: false, error: "Cancel reason is required." };
  const next: OffboardingRecord = {
    ...rec,
    status: "cancelled",
    cancelReason: reason.trim(),
    cancelledOn: nowIso(),
    cancelledBy: CURRENT_USER,
  };
  const saved = saveOffboarding(
    next,
    activity("Offboarding Cancelled", reason.trim()),
  );
  updateHrEmployee(rec.employeeId, {
    status: rec.previousRecordStatus || "active",
    employmentStatus: rec.previousEmploymentStatus || "active",
  });
  return { ok: true, record: saved };
}

export function completeOffboarding(
  id: string,
): { ok: true; record: OffboardingRecord } | { ok: false; error: string; blockers?: string[] } {
  const rec = getOffboardingById(id);
  if (!rec) return { ok: false, error: "Record not found." };
  if (rec.status === "completed") return { ok: false, error: "Already completed." };
  if (rec.status === "cancelled") return { ok: false, error: "Cancelled records cannot be completed." };
  if (rec.status === "pending_review") {
    return { ok: false, error: "Accept the resignation before completing offboarding." };
  }
  if (rec.status === "rejected") return { ok: false, error: "Rejected resignations cannot be completed." };
  const blockers = getCompletionBlockers(rec);
  if (blockers.length) {
    return { ok: false, error: blockers[0]!, blockers };
  }
  const next: OffboardingRecord = {
    ...rec,
    status: "completed",
    completedOn: nowIso(),
    completedBy: CURRENT_USER,
    accessRevocation:
      rec.clearance.some(
        (c) => c.label.toLowerCase().includes("access revocation") && c.status === "cleared",
      )
        ? "completed"
        : rec.accessRevocation,
  };
  const saved = saveOffboarding(next, activity("Offboarding Completed", exitTypeLabel(rec.exitType)));
  const employmentStatus: EmploymentStatus =
    rec.exitType === "termination" ? "terminated" : "resigned";
  updateHrEmployee(rec.employeeId, {
    status: "inactive",
    employmentStatus,
  });
  createHrNotification({
    eventType: "offboarding_completed",
    employeeId: rec.employeeId,
    sourceModule: "offboarding",
    sourceId: rec.id,
    context: {
      employee_name: rec.employeeName,
      last_working_date: rec.lastWorkingDate,
    },
  });
  return { ok: true, record: saved };
}

export function eligibleOffboardingEmployees(employees: HrEmployee[]): HrEmployee[] {
  return employees.filter(
    (e) =>
      e.status === "active" &&
      !employeeHasOpenOffboarding(e.id) &&
      !employeeHasCompletedOffboarding(e.id),
  );
}

export function offboardingLetterContext(r: OffboardingRecord): Partial<TemplateRenderContext> {
  return {
    last_working_date: r.lastWorkingDate || "",
    issue_date: policyToday(),
  };
}

export function getExitLetters(r: OffboardingRecord): GeneratedHrDocument[] {
  const types = new Set(lettersForExitType(r.exitType));
  return listHrLettersForEmployee({ id: r.employeeId, employeeCode: r.employeeCode }).filter((d) =>
    types.has(d.templateType),
  );
}

export function makeActivity(label: string, detail: string): OffboardingActivity {
  return activity(label, detail);
}

/**
 * Future Employee Mobile App contract — create a pending resignation request.
 * Does NOT change employee status. Does NOT start clearance until HR accepts.
 */
export interface EmployeeResignationInput {
  employeeId: number;
  resignationDate: string;
  proposedLastWorkingDate: string;
  reasonKey?: LeavingReasonKey | "";
  reason: string;
  employeeRemarks?: string;
  requiredNoticeDays?: string;
}

export function submitEmployeeResignation(
  input: EmployeeResignationInput,
): { ok: true; record: OffboardingRecord } | { ok: false; error: string } {
  const emp = getHrEmployeeById(input.employeeId);
  if (!emp) return { ok: false, error: "Employee not found." };
  if (emp.status !== "active") return { ok: false, error: "Only active employees can resign." };
  if (employeeHasOpenOffboarding(emp.id)) {
    return { ok: false, error: "This employee already has an open offboarding or pending resignation." };
  }
  if (employeeHasCompletedOffboarding(emp.id)) {
    return { ok: false, error: "This employee already has a completed offboarding." };
  }
  if (!input.resignationDate) return { ok: false, error: "Resignation Date is required." };
  if (!input.proposedLastWorkingDate) {
    return { ok: false, error: "Proposed Last Working Date is required." };
  }
  if (!input.reason.trim() && !input.reasonKey) {
    return { ok: false, error: "Reason is required." };
  }

  const reasonText =
    input.reasonKey && input.reasonKey !== "other"
      ? leavingReasonLabel(input.reasonKey)
      : input.reason.trim();

  const today = policyToday();
  const submittedAt = nowIso();
  const rec: OffboardingRecord = {
    id: newId("ob"),
    employeeId: emp.id,
    employeeCode: emp.employeeCode,
    employeeName: emp.employeeName,
    designation: emp.designation,
    department: emp.department,
    branch: emp.branch,
    exitType: "resignation",
    status: "pending_review",
    source: "employee",
    initiatedDate: input.resignationDate,
    lastWorkingDate: "",
    proposedLastWorkingDate: input.proposedLastWorkingDate,
    reason: reasonText,
    reasonKey: input.reasonKey || "",
    employeeRemarks: (input.employeeRemarks ?? "").trim(),
    hrRemarks: "",
    internalNotes: "",
    resignationDate: input.resignationDate,
    terminationDate: "",
    immediateExit: false,
    noticeWaiver: false,
    requiredNoticeDays: input.requiredNoticeDays || "",
    servedNoticeDays: "",
    lastAttendedDate: "",
    reportedDate: "",
    handover: [],
    assets: [],
    clearance: [],
    interviewConducted: false,
    interviewDate: "",
    interviewBy: "",
    leavingFeedback: "",
    wouldRehire: "",
    experienceRating: 0,
    fnfStatus: "not_started",
    accessRevocation: "pending",
    attachment: null,
    cancelReason: "",
    completedOn: "",
    completedBy: "",
    cancelledOn: "",
    cancelledBy: "",
    submittedAt,
    acceptedAt: "",
    acceptedBy: "",
    rejectedAt: "",
    rejectedBy: "",
    rejectionReason: "",
    previousEmploymentStatus: emp.employmentStatus,
    previousRecordStatus: emp.status,
    activity: [
      activity(
        "Resignation Submitted",
        `Employee · Proposed LWD ${input.proposedLastWorkingDate}`,
      ),
    ],
    createdBy: emp.employeeName,
    createdAt: today,
    updatedBy: emp.employeeName,
    updatedAt: today,
  };

  saveRaw([rec, ...loadRaw()]);
  createHrNotification({
    eventType: "resignation_submitted",
    employeeId: rec.employeeId,
    sourceModule: "offboarding",
    sourceId: rec.id,
    context: {
      employee_name: rec.employeeName,
      last_working_date: rec.proposedLastWorkingDate,
    },
  });
  return { ok: true, record: rec };
}

export function acceptResignation(
  id: string,
  input: { finalLastWorkingDate: string; hrRemarks?: string },
): { ok: true; record: OffboardingRecord } | { ok: false; error: string } {
  const rec = getOffboardingById(id);
  if (!rec) return { ok: false, error: "Request not found." };
  if (rec.status !== "pending_review") {
    return { ok: false, error: "Only pending resignation requests can be accepted." };
  }
  if (!getHrEmployeeById(rec.employeeId)) {
    return { ok: false, error: "Employee no longer exists." };
  }
  if (!input.finalLastWorkingDate.trim()) {
    return { ok: false, error: "Final Last Working Date is required." };
  }

  const hrRemarks = (input.hrRemarks ?? "").trim();
  const next: OffboardingRecord = {
    ...rec,
    lastWorkingDate: input.finalLastWorkingDate.trim(),
    hrRemarks,
    internalNotes: hrRemarks || rec.internalNotes,
    acceptedAt: nowIso(),
    acceptedBy: CURRENT_USER,
    status: "initiated",
    handover: rec.handover.length ? rec.handover : defaultHandoverItems(),
    assets: rec.assets.length ? rec.assets : defaultAssetItems(),
    clearance: rec.clearance.length ? rec.clearance : defaultClearanceItems(),
  };
  next.status = deriveOffboardingStatus(next);
  const saved = saveOffboarding(
    next,
    activity(
      "Resignation Accepted",
      `Final LWD ${next.lastWorkingDate}` +
        (rec.proposedLastWorkingDate && rec.proposedLastWorkingDate !== next.lastWorkingDate
          ? ` (proposed ${rec.proposedLastWorkingDate})`
          : ""),
    ),
  );
  createHrNotification({
    eventType: "resignation_accepted",
    employeeId: saved.employeeId,
    sourceModule: "offboarding",
    sourceId: saved.id,
    context: {
      employee_name: saved.employeeName,
      last_working_date: saved.lastWorkingDate,
    },
  });
  createHrNotification({
    eventType: "offboarding_initiated",
    employeeId: saved.employeeId,
    sourceModule: "offboarding",
    sourceId: saved.id,
    context: {
      employee_name: saved.employeeName,
      last_working_date: saved.lastWorkingDate,
    },
  });
  return { ok: true, record: saved };
}

export function rejectResignation(
  id: string,
  rejectionReason: string,
): { ok: true; record: OffboardingRecord } | { ok: false; error: string } {
  const rec = getOffboardingById(id);
  if (!rec) return { ok: false, error: "Request not found." };
  if (rec.status !== "pending_review") {
    return { ok: false, error: "Only pending resignation requests can be rejected." };
  }
  const reason = rejectionReason.trim();
  if (!reason) return { ok: false, error: "Rejection reason is required." };

  const next: OffboardingRecord = {
    ...rec,
    status: "rejected",
    rejectedAt: nowIso(),
    rejectedBy: CURRENT_USER,
    rejectionReason: reason,
  };
  const saved = saveOffboarding(next, activity("Resignation Rejected", reason));
  createHrNotification({
    eventType: "resignation_rejected",
    employeeId: saved.employeeId,
    sourceModule: "offboarding",
    sourceId: saved.id,
    context: {
      employee_name: saved.employeeName,
      last_working_date: saved.proposedLastWorkingDate,
    },
  });
  return { ok: true, record: saved };
}

/** Active offboarding (excludes pending review / rejected / completed / cancelled). */
export const ACTIVE_OFFBOARDING_STATUSES: OffboardingStatus[] = [
  "initiated",
  "notice_period",
  "clearance_pending",
  "ready_for_exit",
];

export function isPendingResignation(r: OffboardingRecord): boolean {
  return r.status === "pending_review" && r.source === "employee";
}

/** Dev helper only — seed a pending employee resignation for local QA. */
export function seedDevEmployeeResignation():
  | { ok: true; record: OffboardingRecord }
  | { ok: false; error: string } {
  if (process.env.NODE_ENV !== "development") {
    return { ok: false, error: "Dev seed is only available in development." };
  }
  const employees = loadHrEmployees().filter(
    (e) => e.status === "active" && !employeeHasOpenOffboarding(e.id) && !employeeHasCompletedOffboarding(e.id),
  );
  const emp = employees[0];
  if (!emp) return { ok: false, error: "No eligible active employee for seed." };
  return submitEmployeeResignation({
    employeeId: emp.id,
    resignationDate: policyToday(),
    proposedLastWorkingDate: policyToday(),
    reasonKey: "better_opportunity",
    reason: "Dev seed resignation",
    employeeRemarks: "Seeded for Admin Offboarding QA.",
    requiredNoticeDays: "30",
  });
}
