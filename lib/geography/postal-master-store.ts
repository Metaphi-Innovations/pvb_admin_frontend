/**
 * In-memory postal master cache — loads from postal-master.json or localStorage uploads.
 * Large India Post datasets stay in memory; only small overrides are persisted.
 */

import {
  buildPostalMasterIndexes,
  type PostalMasterIndexes,
} from "./postal-master-index";
import { parsePostalMasterJson, type NormalizedPostalRow } from "./india-post-normalize";
import { LOCAL_STORAGE_MAX_BYTES, maxRecordId, purgeOversizedPostalStorage } from "./postal-master-utils";

export { purgeOversizedPostalStorage };

export const NORMALIZED_POSTAL_JSON_PATH = "/data/postal-master.json";

/** @deprecated Use NORMALIZED_POSTAL_JSON_PATH */
export const LEGACY_POSTAL_JSON_PATH = "/data/india-post-pincodes.json";

export const POSTAL_MASTER_EMPTY_MESSAGE =
  "Postal Master data is not loaded. Please upload India Post data first.";

/** Above this size, full dataset is not written to localStorage. */
export const LARGE_DATASET_THRESHOLD = 1_000;

export interface PostalMasterRecord {
  id: number;
  pincode: string;
  stateName: string;
  district: string;
  city: string;
  town: string;
  locality?: string;
  deliveryStatus: string;
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export interface PostalMasterQuery {
  search?: string;
  state?: string;
  district?: string;
  status?: string;
  sortKey?: keyof PostalMasterRecord | "";
  sortDirection?: "asc" | "desc" | "none";
  page: number;
  pageSize: number;
}

interface PostalOverrides {
  added: PostalMasterRecord[];
  patches: Record<number, Partial<Pick<PostalMasterRecord, "pincode" | "stateName" | "district" | "city" | "town" | "deliveryStatus" | "status" | "updatedBy" | "updatedDate">>>;
}

const STORAGE_KEY = "ds_pincode_master_v3";
const STORAGE_SOURCE_KEY = "ds_pincode_master_source";
const OVERRIDES_KEY = "ds_pincode_master_overrides_v1";
const DEFAULT_USER = "Admin";

let baseRecords: PostalMasterRecord[] = [];
let mergedRecords: PostalMasterRecord[] = [];
let indexes: PostalMasterIndexes | null = null;
let indexesReady = false;
let hydratePromise: Promise<PostalMasterRecord[]> | null = null;
let loadedFromFile = false;
let cacheVersion = 0;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function bumpCache(): void {
  cacheVersion += 1;
}

export function getPostalMasterCacheVersion(): number {
  return cacheVersion;
}

function rebuildMerged(): void {
  const overrides = readOverrides();
  mergedRecords = baseRecords.map((row) => {
    const patch = overrides.patches[row.id];
    return patch ? { ...row, ...patch } : row;
  });
  if (overrides.added.length > 0) {
    mergedRecords = [...mergedRecords, ...overrides.added];
  }

  indexes = null;
  indexesReady = false;
  bumpCache();

  const records = mergedRecords;
  const build = (): void => {
    indexes = buildPostalMasterIndexes(records);
    indexesReady = true;
    bumpCache();
  };

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => build(), { timeout: 2_000 });
  } else {
    setTimeout(build, 0);
  }
}

function readOverrides(): PostalOverrides {
  if (typeof window === "undefined") return { added: [], patches: {} };
  const raw = localStorage.getItem(OVERRIDES_KEY);
  if (!raw) return { added: [], patches: {} };
  try {
    const parsed = JSON.parse(raw) as PostalOverrides;
    return {
      added: Array.isArray(parsed.added) ? parsed.added : [],
      patches: parsed.patches && typeof parsed.patches === "object" ? parsed.patches : {},
    };
  } catch {
    return { added: [], patches: {} };
  }
}

function writeOverrides(overrides: PostalOverrides): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // ignore quota errors
  }
}

function clearOverrides(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OVERRIDES_KEY);
}

export function clearPostalMasterCache(): void {
  baseRecords = [];
  mergedRecords = [];
  indexes = null;
  indexesReady = false;
  hydratePromise = null;
  loadedFromFile = false;
  bumpCache();
}

export function isPostalMasterLoaded(): boolean {
  return mergedRecords.length > 0;
}

export function getPostalMasterRecordCount(): number {
  return mergedRecords.length;
}

export function getPostalMasterIndexes(): PostalMasterIndexes | null {
  return indexes;
}

export function arePostalMasterIndexesReady(): boolean {
  return indexesReady;
}

async function normalizedToRecordsAsync(
  rows: NormalizedPostalRow[],
  user = DEFAULT_USER,
): Promise<PostalMasterRecord[]> {
  const now = todayStr();
  const out: PostalMasterRecord[] = new Array(rows.length);
  const chunk = 2_500;

  for (let start = 0; start < rows.length; start += chunk) {
    const end = Math.min(start + chunk, rows.length);
    for (let i = start; i < end; i++) {
      const row = rows[i];
      out[i] = {
        id: i + 1,
        pincode: row.pincode,
        stateName: row.state,
        district: row.district,
        city: row.city || row.district,
        town: row.town,
        deliveryStatus: row.deliveryStatus || "Non-Delivery",
        status: row.status ?? "active",
        createdBy: user,
        createdDate: now,
        updatedBy: user,
        updatedDate: now,
      };
    }
    if (end < rows.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  return out;
}

function normalizePostalStatus(status: unknown): "active" | "inactive" {
  const v = String(status ?? "active").trim().toLowerCase();
  return v === "inactive" ? "inactive" : "active";
}

function normalizePostalRecord(record: PostalMasterRecord): PostalMasterRecord {
  return {
    ...record,
    deliveryStatus: record.deliveryStatus ?? "Non-Delivery",
    status: normalizePostalStatus(record.status),
  };
}

function readLocalStorageRecords(): PostalMasterRecord[] | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  if (stored.length > LOCAL_STORAGE_MAX_BYTES) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_SOURCE_KEY, "file");
    return null;
  }
  try {
    const parsed = JSON.parse(stored) as PostalMasterRecord[];
    if (parsed.length > LARGE_DATASET_THRESHOLD) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_SOURCE_KEY, "file");
      return null;
    }
    return parsed.map((r) => normalizePostalRecord(r));
  } catch {
    return null;
  }
}

function persistFullDataset(records: PostalMasterRecord[], source: "upload" | "reset"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    localStorage.setItem(STORAGE_SOURCE_KEY, source);
    clearOverrides();
  } catch {
    // keep in-memory only
  }
}

function setBaseRecords(
  records: PostalMasterRecord[],
  options?: { persist?: boolean; source?: "upload" | "reset"; fromFile?: boolean },
): void {
  baseRecords = records;
  loadedFromFile = options?.fromFile ?? false;
  rebuildMerged();

  if (options?.persist === false || typeof window === "undefined") return;

  if (records.length <= LARGE_DATASET_THRESHOLD) {
    persistFullDataset(records, options?.source ?? "upload");
    loadedFromFile = false;
  } else {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_SOURCE_KEY, "file");
    clearOverrides();
    loadedFromFile = true;
  }
}

async function fetchJsonPath(path: string): Promise<NormalizedPostalRow[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return parsePostalMasterJson(json);
  } catch {
    return [];
  }
}

async function fetchNormalizedFile(): Promise<NormalizedPostalRow[]> {
  const primary = await fetchJsonPath(NORMALIZED_POSTAL_JSON_PATH);
  if (primary.length > 0) return primary;
  return fetchJsonPath(LEGACY_POSTAL_JSON_PATH);
}

export function setPostalMasterRecords(
  records: PostalMasterRecord[],
  options?: { persist?: boolean; source?: "upload" | "reset" },
): void {
  setBaseRecords(records, {
    persist: options?.persist,
    source: options?.source ?? "upload",
    fromFile: false,
  });
}

export function getPostalMasterRecords(): PostalMasterRecord[] {
  return mergedRecords;
}

/** Exact pincode match against loaded Geography / Postal Master records. */
export function getActiveRecordsByPincode(pincode: string): PostalMasterRecord[] {
  const digits = pincode.replace(/\D/g, "").slice(0, 6);
  if (digits.length !== 6) return [];

  return mergedRecords.filter(
    (row) => row.pincode === digits && normalizePostalStatus(row.status) === "active",
  );
}

export function queryPostalMasterRecords(query: PostalMasterQuery): {
  rows: PostalMasterRecord[];
  total: number;
} {
  const q = query.search?.trim().toLowerCase() ?? "";
  const hasSearch = q.length > 0;
  const hasFilters = Boolean(query.state || query.district || query.status || hasSearch);
  const needsSort = Boolean(query.sortKey && query.sortDirection && query.sortDirection !== "none");
  const start = (query.page - 1) * query.pageSize;

  if (!hasFilters && !needsSort) {
    return {
      rows: mergedRecords.slice(start, start + query.pageSize),
      total: mergedRecords.length,
    };
  }

  const matched: PostalMasterRecord[] = [];
  for (const row of mergedRecords) {
    if (query.state && row.stateName !== query.state) continue;
    if (query.district && row.district !== query.district) continue;
    if (query.status && normalizePostalStatus(row.status) !== normalizePostalStatus(query.status)) continue;
    if (hasSearch) {
      const hit = [row.pincode, row.stateName, row.district, row.city, row.town].some((v) =>
        v.toLowerCase().includes(q),
      );
      if (!hit) continue;
    }
    matched.push(row);
  }

  if (needsSort && query.sortKey) {
    const key = query.sortKey;
    const dir = query.sortDirection === "asc" ? 1 : -1;
    matched.sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * dir);
  }

  return { rows: matched.slice(start, start + query.pageSize), total: matched.length };
}

export async function hydratePostalMaster(options?: {
  forceFile?: boolean;
}): Promise<PostalMasterRecord[]> {
  const canUseCached =
    !options?.forceFile &&
    mergedRecords.length > 0 &&
    (loadedFromFile || mergedRecords.length > LARGE_DATASET_THRESHOLD);

  if (canUseCached) return mergedRecords;
  if (!options?.forceFile && hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    purgeOversizedPostalStorage();

    if (options?.forceFile && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_SOURCE_KEY);
      clearOverrides();
    }

    const fileRows = await fetchNormalizedFile();
    const source =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_SOURCE_KEY) : null;
    const fromLs =
      !options?.forceFile && source !== "file" ? readLocalStorageRecords() : null;

    // Prefer the full India Post file when localStorage only has a small partial upload.
    const preferFileDataset =
      fileRows.length > 0 &&
      (!fromLs || fromLs.length === 0 || fileRows.length > fromLs.length);

    if (preferFileDataset) {
      const records = await normalizedToRecordsAsync(fileRows);
      setBaseRecords(records, {
        persist: false,
        source: "reset",
        fromFile: records.length > LARGE_DATASET_THRESHOLD,
      });
      return mergedRecords;
    }

    if (fromLs && fromLs.length > 0) {
      setBaseRecords(fromLs, { persist: false, fromFile: false });
      return mergedRecords;
    }

    if (fileRows.length > 0) {
      const records = await normalizedToRecordsAsync(fileRows);
      setBaseRecords(records, {
        persist: false,
        source: "reset",
        fromFile: true,
      });
      return mergedRecords;
    }

    setBaseRecords([], { persist: false });
    return mergedRecords;
  })();

  try {
    return await hydratePromise;
  } finally {
    hydratePromise = null;
  }
}

export function isPostalMasterLoadedFromFile(): boolean {
  return loadedFromFile;
}

export function importNormalizedRows(rows: NormalizedPostalRow[]): number {
  const records = rows.map((row, i) => {
    const now = todayStr();
    return {
      id: i + 1,
      pincode: row.pincode,
      stateName: row.state,
      district: row.district,
      city: row.city || row.district,
      town: row.town,
      deliveryStatus: row.deliveryStatus || "Non-Delivery",
      status: row.status ?? "active" as const,
      createdBy: DEFAULT_USER,
      createdDate: now,
      updatedBy: DEFAULT_USER,
      updatedDate: now,
    };
  });
  setBaseRecords(records, {
    persist: true,
    source: "upload",
    fromFile: records.length > LARGE_DATASET_THRESHOLD,
  });
  return records.length;
}

export function appendNormalizedRows(rows: NormalizedPostalRow[]): number {
  const keySet = new Set(
    mergedRecords.map((r) =>
      [r.stateName, r.district, r.town, r.pincode].join("|").toLowerCase(),
    ),
  );
  let nextId = maxRecordId(mergedRecords) + 1;
  const added: PostalMasterRecord[] = [];

  for (const row of rows) {
    const now = todayStr();
    const mapped: PostalMasterRecord = {
      id: nextId++,
      pincode: row.pincode,
      stateName: row.state,
      district: row.district,
      city: row.city || row.district,
      town: row.town,
      deliveryStatus: row.deliveryStatus || "Non-Delivery",
      status: row.status ?? "active",
      createdBy: DEFAULT_USER,
      createdDate: now,
      updatedBy: DEFAULT_USER,
      updatedDate: now,
    };
    const key = [mapped.stateName, mapped.district, mapped.town, mapped.pincode].join("|").toLowerCase();
    if (keySet.has(key)) continue;
    keySet.add(key);
    added.push(mapped);
  }

  if (added.length === 0) return 0;

  if (loadedFromFile || mergedRecords.length > LARGE_DATASET_THRESHOLD) {
    const overrides = readOverrides();
    overrides.added.push(...added);
    writeOverrides(overrides);
    rebuildMerged();
  } else {
    setBaseRecords([...baseRecords, ...added], { persist: true, source: "upload" });
  }

  return added.length;
}

export function appendPostalMasterRecord(record: PostalMasterRecord): void {
  if (loadedFromFile || mergedRecords.length >= LARGE_DATASET_THRESHOLD) {
    const overrides = readOverrides();
    overrides.added.push(record);
    writeOverrides(overrides);
    rebuildMerged();
    return;
  }
  setBaseRecords([...baseRecords, record], { persist: true, source: "upload" });
}

export function patchPostalMasterRecord(
  id: number,
  patch: Partial<Pick<PostalMasterRecord, "pincode" | "stateName" | "district" | "city" | "town" | "deliveryStatus" | "status" | "updatedBy" | "updatedDate">>,
): void {
  const inAdded = readOverrides().added.some((r) => r.id === id);
  if (inAdded) {
    const overrides = readOverrides();
    overrides.added = overrides.added.map((r) => (r.id === id ? { ...r, ...patch } : r));
    writeOverrides(overrides);
    rebuildMerged();
    return;
  }

  if (loadedFromFile || mergedRecords.length > LARGE_DATASET_THRESHOLD) {
    const overrides = readOverrides();
    overrides.patches[id] = { ...overrides.patches[id], ...patch };
    writeOverrides(overrides);
    rebuildMerged();
    return;
  }

  const idx = baseRecords.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const next = [...baseRecords];
  next[idx] = { ...next[idx], ...patch };
  setBaseRecords(next, { persist: true, source: "upload" });
}

export function getNextPostalMasterId(): number {
  return maxRecordId(mergedRecords) + 1;
}
