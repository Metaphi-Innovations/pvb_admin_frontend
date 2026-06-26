/**
 * Geography module audit trail — mock localStorage only.
 */

export type AuditActionType =
  | "Postal Master Uploaded"
  | "Geography Created"
  | "Geography Edited"
  | "Coverage Added"
  | "Pincode Reassigned"
  | "User Assigned"
  | "User Reassigned"
  | "Assignment Ended"
  | "Geography Split"
  | "Geography Merged"
  | "Geography Deactivated";

export interface GeographyAuditEntry {
  id: number;
  dateTime: string;
  actionType: AuditActionType;
  oldGeography?: string;
  newGeography?: string;
  pincode?: string;
  user?: string;
  changedBy: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  remarks: string;
}

const AUDIT_KEY = "ds_geography_audit_v1";
const AUDIT_SCHEMA_KEY = "ds_geography_audit_schema";
export const AUDIT_SCHEMA = "geography-v7-india-post";
export const DEFAULT_AUDIT_USER = "Admin";

const SEED_AUDIT: GeographyAuditEntry[] = [];

function seedAudit(): GeographyAuditEntry[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(SEED_AUDIT));
    localStorage.setItem(AUDIT_SCHEMA_KEY, AUDIT_SCHEMA);
  }
  return [...SEED_AUDIT];
}

export function loadAuditEntries(): GeographyAuditEntry[] {
  if (typeof window === "undefined") return [...SEED_AUDIT];
  const schema = localStorage.getItem(AUDIT_SCHEMA_KEY);
  if (schema !== AUDIT_SCHEMA) return seedAudit();
  const stored = localStorage.getItem(AUDIT_KEY);
  if (!stored) return seedAudit();
  try {
    return JSON.parse(stored) as GeographyAuditEntry[];
  } catch {
    return seedAudit();
  }
}

export function addAuditEntry(
  entry: Omit<GeographyAuditEntry, "id" | "dateTime" | "changedBy"> & {
    changedBy?: string;
    dateTime?: string;
  },
): GeographyAuditEntry {
  const all = loadAuditEntries();
  const record: GeographyAuditEntry = {
    id: Math.max(0, ...all.map((e) => e.id)) + 1,
    dateTime: entry.dateTime ?? new Date().toISOString(),
    changedBy: entry.changedBy ?? DEFAULT_AUDIT_USER,
    actionType: entry.actionType,
    oldGeography: entry.oldGeography,
    newGeography: entry.newGeography,
    pincode: entry.pincode,
    user: entry.user,
    effectiveFrom: entry.effectiveFrom,
    effectiveTo: entry.effectiveTo,
    remarks: entry.remarks,
  };
  const next = [record, ...all];
  if (typeof window !== "undefined") {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
  }
  return record;
}
