/**
 * Pincode Master — location hierarchy: State → District → City → Town → Pincode
 * Loads from normalized India Post JSON file and/or bulk upload (localStorage).
 */

import { cleanTownName as cleanTownNameShared } from "@/lib/geography/india-post-normalize";
import {
  appendPostalMasterRecord,
  getPostalMasterIndexes,
  getPostalMasterRecords,
  hydratePostalMaster,
  importNormalizedRows,
  isPostalMasterLoaded,
  patchPostalMasterRecord,
  getNextPostalMasterId,
  appendNormalizedRows,
  POSTAL_MASTER_EMPTY_MESSAGE,
  queryPostalMasterRecords,
  setPostalMasterRecords,
  type PostalMasterQuery,
  type PostalMasterRecord,
} from "@/lib/geography/postal-master-store";
import {
  getIndexedCities,
  getIndexedDistricts,
  getIndexedStates,
  getIndexedTowns,
} from "@/lib/geography/postal-master-index";
import {
  getActivePostalRecords,
  getPostalRecordCount,
  getPostalRecords,
  isPostalDataAvailable,
  type PostalRecord,
} from "@/lib/geography/postal-records";
import { GEOGRAPHY_WORKFLOW_SCHEMA } from "./geography-demo-seed";

export type PincodeStatus = "active" | "inactive";

export type PincodeRecord = PostalMasterRecord;

export interface PincodeFormInput {
  pincode: string;
  stateName: string;
  district: string;
  city: string;
  town: string;
  status: PincodeStatus;
}

export interface PincodeUploadRow {
  rowNumber: number;
  pincode: string;
  stateName: string;
  district: string;
  city: string;
  town: string;
}

export type PincodeUploadErrorReason =
  | "Missing Pincode"
  | "Invalid Pincode"
  | "Missing State"
  | "Missing District"
  | "Missing Town"
  | "Duplicate Pincode + Town";

export interface PincodeUploadErrorRow extends PincodeUploadRow {
  errorReason: PincodeUploadErrorReason;
}

export interface PincodeUploadValidation {
  totalRows: number;
  validRows: PincodeUploadRow[];
  errorRows: PincodeUploadErrorRow[];
  duplicateRows: number;
}

/** ERP-ready JSON row (from India Post CSV conversion script). */
export interface PincodeJsonRow {
  pincode: string;
  state: string;
  district: string;
  city?: string;
  town: string;
  deliveryStatus?: string;
  status?: PincodeStatus | "Active" | "Inactive";
}

export {
  getPostalRecords,
  getActivePostalRecords,
  getPostalRecordCount,
  isPostalDataAvailable,
  type PostalRecord,
};
export {
  isPostalMasterLoaded,
  hydratePostalMaster,
  POSTAL_MASTER_EMPTY_MESSAGE,
  queryPostalMasterRecords,
  type PostalMasterQuery,
};

export function cleanTownName(officename: string): string {
  return cleanTownNameShared(officename);
}

const PINCODE_SCHEMA_KEY = "ds_pincode_master_schema";
export const PINCODE_WORKFLOW_SCHEMA = GEOGRAPHY_WORKFLOW_SCHEMA;
const UPLOAD_ERRORS_KEY = "ds_pincode_upload_errors";
export const DEFAULT_PINCODE_USER = "Admin";

export const PINCODE_UPLOAD_REQUIRED_COLUMNS = [
  "pincode",
  "statename",
  "district",
  "officename",
] as const;

export const PINCODE_SAMPLE_TEMPLATE_ROWS: Record<string, string>[] = [
  {
    pincode: "110001",
    statename: "Delhi",
    district: "Central Delhi",
    officename: "Connaught Place S.O",
    cityname: "New Delhi",
  },
  {
    pincode: "560001",
    statename: "Karnataka",
    district: "Bengaluru Urban",
    officename: "Bangalore GPO",
    cityname: "Bengaluru",
  },
];

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function migrateLegacyRecord(raw: Record<string, unknown>): PincodeRecord {
  if (typeof raw.town === "string" && raw.town) {
    return raw as unknown as PincodeRecord;
  }
  const officeName = String(raw.officeName ?? raw.town ?? "");
  const district = String(raw.district ?? "");
  return {
    id: Number(raw.id),
    pincode: String(raw.pincode ?? ""),
    stateName: String(raw.stateName ?? ""),
    district,
    city: String(raw.city ?? district),
    town: cleanTownName(officeName) || officeName,
    deliveryStatus: String(raw.deliveryStatus ?? "Non-Delivery"),
    status: (raw.status as PincodeStatus) ?? "active",
    createdBy: String(raw.createdBy ?? DEFAULT_PINCODE_USER),
    createdDate: String(raw.createdDate ?? todayStr()),
    updatedBy: String(raw.updatedBy ?? DEFAULT_PINCODE_USER),
    updatedDate: String(raw.updatedDate ?? todayStr()),
  };
}

export function loadPincodeRecords(): PincodeRecord[] {
  if (typeof window === "undefined") return [];
  const schema = localStorage.getItem(PINCODE_SCHEMA_KEY);
  if (schema !== PINCODE_WORKFLOW_SCHEMA) {
    localStorage.setItem(PINCODE_SCHEMA_KEY, PINCODE_WORKFLOW_SCHEMA);
  }
  return getPostalMasterRecords();
}

export function savePincodeRecords(records: PincodeRecord[]): void {
  setPostalMasterRecords(records, { persist: true, source: "upload" });
}

export function getUploadErrorCount(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(UPLOAD_ERRORS_KEY);
  return v ? Number(v) || 0 : 0;
}

export function setUploadErrorCount(count: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(UPLOAD_ERRORS_KEY, String(count));
}

export function getPincodeById(id: number): PincodeRecord | undefined {
  return loadPincodeRecords().find((r) => r.id === id);
}

export function pincodeComboKey(
  pincode: string,
  stateName: string,
  district: string,
  city: string,
  town: string,
): string {
  return [pincode.trim(), stateName.trim(), district.trim(), city.trim(), town.trim().toLowerCase()].join("|");
}

export function isDuplicatePincodeTown(
  input: Pick<PincodeFormInput, "pincode" | "stateName" | "district" | "city" | "town">,
  excludeId?: number,
): boolean {
  const key = pincodeComboKey(input.pincode, input.stateName, input.district, input.city, input.town);
  return loadPincodeRecords().some(
    (r) =>
      r.id !== excludeId &&
      pincodeComboKey(r.pincode, r.stateName, r.district, r.city, r.town) === key,
  );
}

export function validatePincodeForm(
  input: PincodeFormInput,
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const pin = input.pincode.trim();

  if (!pin) errors.pincode = "Pincode is required.";
  else if (!/^\d{6}$/.test(pin)) errors.pincode = "Pincode must be exactly 6 digits.";

  if (!input.stateName.trim()) errors.stateName = "State is required.";
  if (!input.district.trim()) errors.district = "District is required.";
  if (!input.city.trim()) errors.city = "City is required.";
  if (!input.town.trim()) errors.town = "Town is required.";

  if (
    pin &&
    input.stateName.trim() &&
    input.district.trim() &&
    input.city.trim() &&
    input.town.trim() &&
    isDuplicatePincodeTown(input, excludeId)
  ) {
    errors.pincode = "This pincode already exists.";
  }

  return errors;
}

function activePostalList(records?: PincodeRecord[]): PostalRecord[] {
  if (records) {
    return records
      .filter((r) => r.status === "active")
      .map((r) => ({
        state: r.stateName,
        district: r.district,
        city: r.city,
        town: r.town,
        pincode: r.pincode,
        deliveryStatus: r.deliveryStatus ?? "Non-Delivery",
        status: r.status,
      }));
  }
  return getActivePostalRecords();
}


export function getDistinctStates(records?: PincodeRecord[]): string[] {
  const indexes = getPostalMasterIndexes();
  if (!records && indexes) return indexes.states;
  const list = activePostalList(records);
  return [...new Set(list.map((r) => r.state).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getDistinctDistricts(stateName: string, records?: PincodeRecord[]): string[] {
  const indexes = getPostalMasterIndexes();
  if (!records && indexes) {
    if (!stateName) return [];
    return getIndexedDistricts(indexes, stateName);
  }
  const list = activePostalList(records);
  return [
    ...new Set(
      list
        .filter((r) => !stateName || r.state === stateName)
        .map((r) => r.district)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getDistinctDistrictsForStates(states: string[], records?: PincodeRecord[]): string[] {
  const list = activePostalList(records);
  return [
    ...new Set(
      list
        .filter((r) => states.length === 0 || states.includes(r.state))
        .map((r) => r.district)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getDistinctCities(
  stateName: string,
  district: string,
  records?: PincodeRecord[],
): string[] {
  const indexes = getPostalMasterIndexes();
  if (!records && indexes && stateName && district) {
    return getIndexedCities(indexes, stateName, district);
  }
  const list = activePostalList(records);
  return [
    ...new Set(
      list
        .filter(
          (r) =>
            (!stateName || r.state === stateName) &&
            (!district || r.district === district),
        )
        .map((r) => r.city)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getDistinctTowns(
  stateName: string,
  district: string,
  city: string,
  records?: PincodeRecord[],
): string[] {
  const indexes = getPostalMasterIndexes();
  if (!records && indexes && stateName && district && city) {
    return getIndexedTowns(indexes, stateName, district, city);
  }
  const list = activePostalList(records);
  return [
    ...new Set(
      list
        .filter(
          (r) =>
            (!stateName || r.state === stateName) &&
            (!district || r.district === district) &&
            (!city || r.city === city),
        )
        .map((r) => r.town)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getDistinctCitiesForDistricts(
  stateName: string,
  districts: string[],
  records?: PincodeRecord[],
): string[] {
  const list = activePostalList(records);
  return [
    ...new Set(
      list
        .filter(
          (r) =>
            (!stateName || r.state === stateName) &&
            (districts.length === 0 || districts.includes(r.district)),
        )
        .map((r) => r.city)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getDistinctTownsForFilters(
  stateName: string,
  districts: string[],
  cities: string[],
  records?: PincodeRecord[],
): string[] {
  const list = activePostalList(records);
  return [
    ...new Set(
      list
        .filter(
          (r) =>
            (!stateName || r.state === stateName) &&
            (districts.length === 0 || districts.includes(r.district)) &&
            (cities.length === 0 || cities.includes(r.city)),
        )
        .map((r) => r.town)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getPincodeSummary(records?: PincodeRecord[]) {
  const list = records ?? loadPincodeRecords();
  return {
    total: list.length,
    active: list.filter((r) => r.status === "active").length,
    inactive: list.filter((r) => r.status === "inactive").length,
    statesCovered: new Set(list.map((r) => r.stateName)).size,
    districtsCovered: new Set(list.map((r) => r.district)).size,
    uploadErrors: getUploadErrorCount(),
  };
}

export function createPincodeRecord(input: PincodeFormInput): PincodeRecord {
  const id = getNextPostalMasterId();
  const now = todayStr();
  const record: PincodeRecord = {
    id,
    pincode: input.pincode.trim(),
    stateName: input.stateName.trim(),
    district: input.district.trim(),
    city: input.city.trim(),
    town: input.town.trim(),
    deliveryStatus: "Delivery",
    status: input.status,
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: now,
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: now,
  };
  appendPostalMasterRecord(record);
  return record;
}

export function updatePincodeRecord(id: number, input: PincodeFormInput): PincodeRecord | null {
  const existing = getPostalMasterRecords().find((r) => r.id === id);
  if (!existing) return null;
  const now = todayStr();
  const updated: PincodeRecord = {
    ...existing,
    pincode: input.pincode.trim(),
    stateName: input.stateName.trim(),
    district: input.district.trim(),
    city: input.city.trim(),
    town: input.town.trim(),
    deliveryStatus: existing.deliveryStatus ?? "Delivery",
    status: input.status,
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: now,
  };
  patchPostalMasterRecord(id, {
    pincode: updated.pincode,
    stateName: updated.stateName,
    district: updated.district,
    city: updated.city,
    town: updated.town,
    deliveryStatus: updated.deliveryStatus,
    status: updated.status,
    updatedBy: updated.updatedBy,
    updatedDate: updated.updatedDate,
  });
  return updated;
}

export function setPincodeStatus(id: number, status: PincodeStatus): PincodeRecord | null {
  const existing = getPostalMasterRecords().find((r) => r.id === id);
  if (!existing) return null;
  const updated = {
    ...existing,
    status,
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: todayStr(),
  };
  patchPostalMasterRecord(id, {
    status,
    updatedBy: updated.updatedBy,
    updatedDate: updated.updatedDate,
  });
  return updated;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function pickField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of Object.keys(row)) {
    const norm = normalizeHeader(key);
    if (keys.some((k) => norm === normalizeHeader(k))) {
      return String(row[key] ?? "").trim();
    }
  }
  return "";
}

export function mapRawUploadRow(
  row: Record<string, unknown>,
  rowNumber: number,
): PincodeUploadRow {
  const district = pickField(row, "district", "districtname");
  const city = pickField(row, "cityname", "city") || district;
  const town = cleanTownName(pickField(row, "officename", "office name", "town", "post office"));
  return {
    rowNumber,
    pincode: pickField(row, "pincode"),
    stateName: pickField(row, "statename", "state"),
    district,
    city,
    town,
  };
}

export function mapJsonImportRow(row: PincodeJsonRow): Omit<PincodeUploadRow, "rowNumber"> {
  const district = row.district.trim();
  const town = cleanTownName(row.town);
  return {
    pincode: row.pincode.trim(),
    stateName: row.state.trim(),
    district,
    city: (row.city?.trim() || district),
    town,
  };
}

export interface PincodeJsonImportPayload {
  records?: PincodeJsonRow[];
}

export function parsePincodeJsonFile(json: unknown): PincodeUploadRow[] {
  let rows: PincodeJsonRow[] = [];
  if (Array.isArray(json)) {
    rows = json as PincodeJsonRow[];
  } else if (json && typeof json === "object" && Array.isArray((json as PincodeJsonImportPayload).records)) {
    rows = (json as PincodeJsonImportPayload).records!;
  }
  return rows.map((row, i) => ({
    rowNumber: i + 1,
    ...mapJsonImportRow(row),
  }));
}

export function importJsonPincodeRows(rows: PincodeJsonRow[]): number {
  const uploadRows = rows.map((row, i) => ({
    rowNumber: i + 1,
    ...mapJsonImportRow(row),
  }));
  const validation = validateUploadRows(uploadRows);
  setUploadErrorCount(validation.errorRows.length);
  return importValidUploadRows(validation.validRows);
}

export function validateUploadRows(
  rows: PincodeUploadRow[],
  existing?: PincodeRecord[],
): PincodeUploadValidation {
  const all = existing ?? loadPincodeRecords();
  const existingKeys = new Set(
    all.map((r) => pincodeComboKey(r.pincode, r.stateName, r.district, r.city, r.town)),
  );
  const batchKeys = new Set<string>();

  const validRows: PincodeUploadRow[] = [];
  const errorRows: PincodeUploadErrorRow[] = [];
  let duplicateRows = 0;

  for (const row of rows) {
    const pin = row.pincode.trim();
    const town = row.town.trim();
    const key = pincodeComboKey(pin, row.stateName, row.district, row.city, town);

    let errorReason: PincodeUploadErrorReason | null = null;
    if (!pin) errorReason = "Missing Pincode";
    else if (!/^\d{6}$/.test(pin)) errorReason = "Invalid Pincode";
    else if (!row.stateName.trim()) errorReason = "Missing State";
    else if (!row.district.trim()) errorReason = "Missing District";
    else if (!town) errorReason = "Missing Town";
    else if (existingKeys.has(key) || batchKeys.has(key)) {
      errorReason = "Duplicate Pincode + Town";
      duplicateRows += 1;
    }

    if (errorReason) {
      errorRows.push({ ...row, errorReason });
    } else {
      validRows.push(row);
      batchKeys.add(key);
    }
  }

  return {
    totalRows: rows.length,
    validRows,
    errorRows,
    duplicateRows,
  };
}

export function importValidUploadRows(rows: PincodeUploadRow[]): number {
  const normalized = rows.map((row) => ({
    pincode: row.pincode.trim(),
    state: row.stateName.trim(),
    district: row.district.trim(),
    city: row.city.trim(),
    town: row.town.trim(),
    deliveryStatus: "Delivery",
    status: "active" as const,
  }));
  if (loadPincodeRecords().length === 0) {
    return importNormalizedRows(normalized);
  }
  return appendNormalizedRows(normalized);
}

export function replaceAllPincodeRecords(rows: PincodeUploadRow[]): number {
  const normalized = rows.map((row) => ({
    pincode: row.pincode.trim(),
    state: row.stateName.trim(),
    district: row.district.trim(),
    city: row.city.trim(),
    town: row.town.trim(),
    deliveryStatus: "Delivery",
    status: "active" as const,
  }));
  return importNormalizedRows(normalized);
}

export function downloadPincodeSampleTemplate(): void {
  if (typeof window === "undefined") return;
  const header = ["pincode", "statename", "district", "officename", "cityname"].join(",");
  const rows = PINCODE_SAMPLE_TEMPLATE_ROWS.map((r) =>
    ["pincode", "statename", "district", "officename", "cityname"]
      .map((col) => `"${(r[col] ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "india-post-pincode-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadDemoPostalJson(): void {
  if (typeof window === "undefined") return;
  const records: PincodeJsonRow[] = PINCODE_SAMPLE_TEMPLATE_ROWS.map((r) => ({
    pincode: r.pincode,
    state: r.statename,
    district: r.district,
    city: r.cityname,
    town: cleanTownName(r.officename),
    deliveryStatus: "Delivery",
    status: "Active",
  }));
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "postal-master-template.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPostalData(records?: PincodeRecord[]): void {
  if (typeof window === "undefined") return;
  const list = records ?? loadPincodeRecords();
  const header = ["pincode", "state", "district", "city", "town", "deliveryStatus", "status", "createdDate", "updatedDate"];
  const rows = list.map((r) =>
    header.map((col) => `"${String(r[col as keyof PincodeRecord] ?? "").replace(/"/g, '""')}"`).join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "postal-location-master-export.csv";
  a.click();
  URL.revokeObjectURL(url);
}
