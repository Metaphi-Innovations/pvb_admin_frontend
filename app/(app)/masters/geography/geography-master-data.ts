/**
 * Geography Master — flexible folder-style hierarchy (labels only, no enforced levels).
 */

import { GEOGRAPHY_WORKFLOW_SCHEMA } from "./geography-demo-seed";
import type { CoverageType } from "./geography-coverage-data";

export { GEOGRAPHY_WORKFLOW_SCHEMA };

export type BusinessCoverageMode = "Direct" | "Inherited";

export type GeographyStatus = "active" | "inactive";

export type GeographyType = "Zone" | "Region" | "Area" | "Territory";

export const GEOGRAPHY_TYPES: GeographyType[] = [
  "Zone",
  "Region",
  "Area",
  "Territory",
];

/** Map retired labels to business hierarchy types (legacy localStorage). */
const LEGACY_GEOGRAPHY_TYPE_MAP: Record<string, GeographyType> = {
  Country: "Zone",
  Custom: "Territory",
  "Town Coverage": "Territory",
  "Pincode Group": "Territory",
};

export function normalizeGeographyType(type: string): GeographyType {
  const trimmed = type.trim();
  if ((GEOGRAPHY_TYPES as string[]).includes(trimmed)) return trimmed as GeographyType;
  return LEGACY_GEOGRAPHY_TYPE_MAP[trimmed] ?? "Territory";
}

export function isAllowedGeographyType(type: string): type is GeographyType {
  return (GEOGRAPHY_TYPES as string[]).includes(type.trim());
}

export interface GeographyRecord {
  id: number;
  name: string;
  geographyType: GeographyType | string;
  parentId: number | null;
  coverageType?: CoverageType | BusinessCoverageMode | null;
  effectiveFrom: string;
  status: GeographyStatus;
  coverageCount: number;
  assignedUsers: number;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export interface GeographyFormInput {
  name: string;
  geographyType: string;
  parentId: number | null;
  coverageType?: CoverageType | BusinessCoverageMode | null;
  effectiveFrom: string;
  status: GeographyStatus;
  postalScope?: GeographyPostalScopeInput;
  allowSharedPostalScope?: boolean;
}

export interface GeographyPostalScopeInput {
  states: string[];
  districts: string[];
  cities: string[];
  towns: string[];
  pincodeKeys: string[];
}

export interface GeographyHistoryEntry {
  id: number;
  geographyId: number;
  date: string;
  action: string;
  user: string;
  remarks: string;
}

const STORAGE_KEY = "ds_geography_master_v1";
const SCHEMA_VERSION_KEY = "ds_geography_master_schema";
export const DEFAULT_GEOGRAPHY_USER = "Admin";
export const INDIA_GEOGRAPHY_ID = 1;
export const WEST_ZONE_GEOGRAPHY_ID = 1;

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Business geography — user-created Zone / Region / Area / Territory (not seeded). */

const SEED_HISTORY: GeographyHistoryEntry[] = [];

function seedGeographies(): GeographyRecord[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(SCHEMA_VERSION_KEY, GEOGRAPHY_WORKFLOW_SCHEMA);
  }
  return [];
}

export function loadGeographies(): GeographyRecord[] {
  if (typeof window === "undefined") return [];
  const schema = localStorage.getItem(SCHEMA_VERSION_KEY);
  if (schema !== GEOGRAPHY_WORKFLOW_SCHEMA) {
    return seedGeographies();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return seedGeographies();
  }
  try {
    const parsed = JSON.parse(stored) as GeographyRecord[];
    return parsed.map((g) => ({
      ...g,
      geographyType: normalizeGeographyType(String(g.geographyType)),
    }));
  } catch {
    return seedGeographies();
  }
}

export function saveGeographies(records: GeographyRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getGeographyById(id: number): GeographyRecord | undefined {
  return loadGeographies().find((g) => g.id === id);
}

export function getChildren(parentId: number | null, records?: GeographyRecord[]): GeographyRecord[] {
  const list = records ?? loadGeographies();
  return list.filter((g) => g.parentId === parentId);
}

export function getAncestorPath(
  node: GeographyRecord,
  records?: GeographyRecord[],
): GeographyRecord[] {
  const list = records ?? loadGeographies();
  const path: GeographyRecord[] = [];
  let cur: GeographyRecord | undefined = node;
  while (cur) {
    path.unshift(cur);
    if (cur.parentId === null) break;
    cur = list.find((g) => g.id === cur!.parentId);
  }
  return path;
}

export function getParentName(parentId: number | null, records?: GeographyRecord[]): string {
  if (parentId === null) return "—";
  return getGeographyById(parentId)?.name ?? "—";
}

export function isDescendantOf(
  ancestorId: number,
  nodeId: number,
  records?: GeographyRecord[],
): boolean {
  const list = records ?? loadGeographies();
  let cur = list.find((g) => g.id === nodeId);
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = list.find((g) => g.id === cur!.parentId);
  }
  return false;
}

export function validateGeographyForm(
  input: GeographyFormInput,
  excludeId?: number,
  records?: GeographyRecord[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const list = records ?? loadGeographies();

  if (!input.name.trim()) errors.name = "Geography Name is required.";
  if (!input.geographyType.trim()) errors.geographyType = "Geography Type is required.";
  else if (!isAllowedGeographyType(input.geographyType)) {
    errors.geographyType = "Select Zone, Region, Area, or Territory.";
  }
  if (!input.effectiveFrom.trim()) errors.effectiveFrom = "Effective From is required.";

  if (input.parentId !== null) {
    const parent = list.find((g) => g.id === input.parentId);
    if (!parent) errors.parentId = "Parent geography not found.";
  }

  if (excludeId != null) {
    if (input.parentId === excludeId) {
      errors.parentId = "Cannot assign geography under itself.";
    } else if (input.parentId != null && isDescendantOf(excludeId, input.parentId, list)) {
      errors.parentId = "Cannot create circular hierarchy.";
    }
  }

  const nameNorm = input.name.trim().toLowerCase();
  const duplicate = list.find(
    (g) =>
      g.id !== excludeId &&
      g.parentId === input.parentId &&
      g.name.trim().toLowerCase() === nameNorm,
  );
  if (duplicate) {
    errors.name = "A geography with this name already exists at this level.";
  }

  return errors;
}

export function createGeography(input: GeographyFormInput): GeographyRecord {
  const all = loadGeographies();
  const id = Math.max(0, ...all.map((g) => g.id)) + 1;
  const now = todayStr();
  const record: GeographyRecord = {
    id,
    name: input.name.trim(),
    geographyType: input.geographyType.trim(),
    parentId: input.parentId,
    coverageType: input.coverageType ?? null,
    effectiveFrom: input.effectiveFrom,
    status: input.status,
    coverageCount: 0,
    assignedUsers: 0,
    createdBy: DEFAULT_GEOGRAPHY_USER,
    createdDate: now,
    updatedBy: DEFAULT_GEOGRAPHY_USER,
    updatedDate: now,
  };
  saveGeographies([...all, record]);
  return record;
}

export function updateGeography(id: number, input: GeographyFormInput): GeographyRecord | null {
  const all = loadGeographies();
  const idx = all.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  const now = todayStr();
  const updated: GeographyRecord = {
    ...all[idx],
    name: input.name.trim(),
    geographyType: input.geographyType.trim(),
    parentId: input.parentId,
    coverageType: input.coverageType ?? all[idx].coverageType ?? null,
    effectiveFrom: input.effectiveFrom,
    status: input.status,
    updatedBy: DEFAULT_GEOGRAPHY_USER,
    updatedDate: now,
  };
  const next = [...all];
  next[idx] = updated;
  saveGeographies(next);
  return updated;
}

export function setGeographyStatus(id: number, status: GeographyStatus): GeographyRecord | null {
  const all = loadGeographies();
  const idx = all.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  const next = [...all];
  next[idx] = {
    ...next[idx],
    status,
    updatedBy: DEFAULT_GEOGRAPHY_USER,
    updatedDate: todayStr(),
  };
  saveGeographies(next);
  return next[idx];
}

export function getGeographySummary(records?: GeographyRecord[]) {
  const list = records ?? loadGeographies();
  return {
    total: list.length,
    active: list.filter((g) => g.status === "active").length,
    usersAssigned: list.reduce((sum, g) => sum + g.assignedUsers, 0),
    coverageMapped: list.filter((g) => g.coverageCount > 0).length,
    unmappedPincodes: 156,
    pendingChanges: 3,
  };
}

export function getGeographyHistory(geographyId: number): GeographyHistoryEntry[] {
  const specific = SEED_HISTORY.filter((h) => h.geographyId === geographyId);
  if (specific.length > 0) return specific;
  const geo = getGeographyById(geographyId);
  if (!geo) return [];
  return [
    {
      id: geographyId * 100,
      geographyId,
      date: geo.createdDate,
      action: "Created",
      user: geo.createdBy,
      remarks: `${geo.name} created.`,
    },
    {
      id: geographyId * 100 + 1,
      geographyId,
      date: geo.updatedDate,
      action: "Updated",
      user: geo.updatedBy,
      remarks: "Record last updated.",
    },
  ];
}

export function getDistinctGeographyTypes(_records?: GeographyRecord[]): string[] {
  return [...GEOGRAPHY_TYPES];
}
