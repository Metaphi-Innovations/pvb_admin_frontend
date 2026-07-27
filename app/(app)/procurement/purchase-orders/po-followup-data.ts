import { CURRENT_USER } from "@/lib/procurement/config";
import type { ActivityEntry } from "@/lib/procurement/types";
import type { PurchaseOrder } from "./po-data";

export type POFollowUpAvailability = "no_followup" | "followup_available";

export type POFollowUpType = "call" | "email" | "site_visit" | "enquiry" | "dispatch" | "other";

export const PO_FOLLOWUP_TYPE_OPTIONS: { value: POFollowUpType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "site_visit", label: "Site Visit" },
  { value: "enquiry", label: "Enquiry" },
  { value: "dispatch", label: "Dispatch Update" },
  { value: "other", label: "Other" },
];

export function followUpTypeLabel(type?: string): string {
  return PO_FOLLOWUP_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Follow-up";
}

export interface POFollowUpEntry {
  id: string;
  poId: string | number;
  followUpAt: string;
  followUpType?: POFollowUpType;
  nextFollowUpAt?: string;
  spokeWith: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
}

export interface POFollowUpSummary {
  totalFollowUps: number;
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
  availability: POFollowUpAvailability;
}

export interface POFollowUpExportFields {
  totalFollowUps: number;
  lastFollowUpDate: string;
  followUpStatus: string;
}

const STORAGE_KEY = "ds_procurement_po_followups_v2";
const LEGACY_STORAGE_KEY = "ds_procurement_po_followups_v1";
let followUpLocalStorageCleared = false;

function uid(): string {
  return `fu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatActivityDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time}`;
}

export function formatFollowUpDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date} ${time}`;
}

export function followUpAvailabilityLabel(status: POFollowUpAvailability): string {
  return status === "followup_available" ? "Follow-up Available" : "No Follow-up";
}

function clearFollowUpLocalStorage(): void {
  if (typeof window === "undefined" || followUpLocalStorageCleared) return;
  followUpLocalStorageCleared = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore quota / private-mode errors
  }
}

/** Local mock storage removed — follow-ups are API-backed. */
export function loadAllFollowUps(): POFollowUpEntry[] {
  clearFollowUpLocalStorage();
  return [];
}

export function saveAllFollowUps(_entries: POFollowUpEntry[]): void {
  clearFollowUpLocalStorage();
}

export function loadFollowUpsForPO(poId: string | number): POFollowUpEntry[] {
  const key = String(poId);
  return loadAllFollowUps()
    .filter((e) => String(e.poId) === key)
    .sort((a, b) => b.followUpAt.localeCompare(a.followUpAt));
}

export function getPOFollowUpSummary(poId: string | number): POFollowUpSummary {
  const entries = loadFollowUpsForPO(poId);
  const latest = entries[0];
  return {
    totalFollowUps: entries.length,
    lastFollowUpAt: latest?.followUpAt ?? null,
    nextFollowUpAt: latest?.nextFollowUpAt ?? null,
    availability: entries.length > 0 ? "followup_available" : "no_followup",
  };
}

export function getPOFollowUpExportFields(poId: string | number): POFollowUpExportFields {
  const summary = getPOFollowUpSummary(poId);
  return {
    totalFollowUps: summary.totalFollowUps,
    lastFollowUpDate: summary.lastFollowUpAt ? formatFollowUpDateTime(summary.lastFollowUpAt) : "—",
    followUpStatus: followUpAvailabilityLabel(summary.availability),
  };
}

export interface AddFollowUpInput {
  followUpAt: string;
  followUpType?: POFollowUpType;
  nextFollowUpAt?: string;
  spokeWith: string;
  remarks: string;
  by?: string;
}

export function addPOFollowUp(
  po: PurchaseOrder,
  input: AddFollowUpInput,
): { entry: POFollowUpEntry; updatedPo: PurchaseOrder } {
  const by = input.by ?? CURRENT_USER;
  const now = new Date().toISOString();
  const followUpAt = input.followUpAt.includes("T")
    ? new Date(input.followUpAt).toISOString()
    : new Date(`${input.followUpAt}T00:00:00`).toISOString();

  const entry: POFollowUpEntry = {
    id: uid(),
    poId: po.id,
    followUpAt,
    followUpType: input.followUpType,
    nextFollowUpAt: input.nextFollowUpAt
      ? new Date(`${input.nextFollowUpAt}T00:00:00`).toISOString()
      : undefined,
    spokeWith: input.spokeWith.trim() || "—",
    remarks: input.remarks.trim(),
    createdBy: by,
    createdAt: now,
  };

  saveAllFollowUps([...loadAllFollowUps(), entry]);

  const activityEntry: ActivityEntry = {
    date: followUpAt.slice(0, 10),
    action: "Supplier Follow-up Added",
    by,
    note: `${followUpTypeLabel(input.followUpType)}${entry.spokeWith !== "—" ? ` — Spoke with ${entry.spokeWith}` : ""}. ${entry.remarks}`,
  };

  const updatedPo: PurchaseOrder = {
    ...po,
    updatedBy: by,
    updatedDate: followUpAt.slice(0, 10),
    activity: [...po.activity, activityEntry],
  };

  return { entry, updatedPo };
}

export function canAddPOFollowUp(po: PurchaseOrder): boolean {
  return !["draft", "cancelled"].includes(po.status);
}
