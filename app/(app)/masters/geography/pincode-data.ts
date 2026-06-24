/**
 * Pincode Master — location hierarchy: State → District → City → Town → Pincode
 * Frontend mock / localStorage only.
 */

export type PincodeStatus = "active" | "inactive";

export interface PincodeRecord {
  id: number;
  pincode: string;
  stateName: string;
  district: string;
  city: string;
  town: string;
  status: PincodeStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

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
  town: string;
  city?: string;
}

const STORAGE_KEY = "ds_pincode_master_v2";
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
    pincode: "400001",
    statename: "Maharashtra",
    district: "Mumbai",
    officename: "Mumbai GPO",
    cityname: "Mumbai",
  },
  {
    pincode: "411001",
    statename: "Maharashtra",
    district: "Pune",
    officename: "Pune City S.O",
    cityname: "Pune",
  },
];

const SEED_PINCODES: PincodeRecord[] = [
  {
    id: 1,
    pincode: "411057",
    stateName: "Maharashtra",
    district: "Pune",
    city: "Pune",
    town: "Hinjewadi",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-01-10",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-03-15",
  },
  {
    id: 2,
    pincode: "411004",
    stateName: "Maharashtra",
    district: "Pune",
    city: "Pune",
    town: "Shivaji Nagar",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-01-10",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-02-20",
  },
  {
    id: 3,
    pincode: "400001",
    stateName: "Maharashtra",
    district: "Mumbai",
    city: "Mumbai",
    town: "Mumbai GPO",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-01-12",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-01-12",
  },
  {
    id: 4,
    pincode: "440001",
    stateName: "Maharashtra",
    district: "Nagpur",
    city: "Nagpur",
    town: "Nagpur GPO",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-01-15",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-04-01",
  },
  {
    id: 5,
    pincode: "560001",
    stateName: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    town: "Bangalore GPO",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-02-01",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-02-01",
  },
  {
    id: 6,
    pincode: "560100",
    stateName: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    town: "Electronic City",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-02-05",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-02-05",
  },
  {
    id: 7,
    pincode: "110001",
    stateName: "Delhi",
    district: "New Delhi",
    city: "New Delhi",
    town: "New Delhi GPO",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-02-10",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-02-10",
  },
  {
    id: 8,
    pincode: "380001",
    stateName: "Gujarat",
    district: "Ahmedabad",
    city: "Ahmedabad",
    town: "Ahmedabad GPO",
    status: "inactive",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-02-12",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-05-20",
  },
  {
    id: 9,
    pincode: "600001",
    stateName: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    town: "Chennai GPO",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-02-15",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-02-15",
  },
  {
    id: 10,
    pincode: "500001",
    stateName: "Telangana",
    district: "Hyderabad",
    city: "Hyderabad",
    town: "Hyderabad GPO",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-02-18",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-03-01",
  },
  {
    id: 11,
    pincode: "411045",
    stateName: "Maharashtra",
    district: "Pune",
    city: "Pune",
    town: "Wakad",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-03-01",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-03-01",
  },
  {
    id: 12,
    pincode: "415612",
    stateName: "Maharashtra",
    district: "Ratnagiri",
    city: "Ratnagiri",
    town: "Ratnagiri S.O",
    status: "active",
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: "2024-03-05",
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: "2024-03-05",
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
    town: officeName.replace(/\s+S\.O$/i, "").replace(/\s+GPO$/i, " GPO").trim() || officeName,
    status: (raw.status as PincodeStatus) ?? "active",
    createdBy: String(raw.createdBy ?? DEFAULT_PINCODE_USER),
    createdDate: String(raw.createdDate ?? todayStr()),
    updatedBy: String(raw.updatedBy ?? DEFAULT_PINCODE_USER),
    updatedDate: String(raw.updatedDate ?? todayStr()),
  };
}

export function loadPincodeRecords(): PincodeRecord[] {
  if (typeof window === "undefined") return SEED_PINCODES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const legacy = localStorage.getItem("ds_pincode_master_v1");
    if (legacy) {
      try {
        const migrated = (JSON.parse(legacy) as Record<string, unknown>[]).map(migrateLegacyRecord);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      } catch {
        /* fall through */
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PINCODES));
    return SEED_PINCODES;
  }
  try {
    return (JSON.parse(stored) as Record<string, unknown>[]).map(migrateLegacyRecord);
  } catch {
    return SEED_PINCODES;
  }
}

export function savePincodeRecords(records: PincodeRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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
    errors.town = "This pincode and town combination already exists.";
  }

  return errors;
}

export function getDistinctStates(records?: PincodeRecord[]): string[] {
  const list = records ?? loadPincodeRecords();
  return [...new Set(list.map((r) => r.stateName).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getDistinctDistricts(stateName: string, records?: PincodeRecord[]): string[] {
  const list = records ?? loadPincodeRecords();
  return [
    ...new Set(
      list
        .filter((r) => !stateName || r.stateName === stateName)
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
  const list = records ?? loadPincodeRecords();
  return [
    ...new Set(
      list
        .filter(
          (r) =>
            (!stateName || r.stateName === stateName) &&
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
  const list = records ?? loadPincodeRecords();
  return [
    ...new Set(
      list
        .filter(
          (r) =>
            (!stateName || r.stateName === stateName) &&
            (!district || r.district === district) &&
            (!city || r.city === city),
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
  const all = loadPincodeRecords();
  const id = Math.max(0, ...all.map((r) => r.id)) + 1;
  const now = todayStr();
  const record: PincodeRecord = {
    id,
    pincode: input.pincode.trim(),
    stateName: input.stateName.trim(),
    district: input.district.trim(),
    city: input.city.trim(),
    town: input.town.trim(),
    status: input.status,
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: now,
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: now,
  };
  savePincodeRecords([...all, record]);
  return record;
}

export function updatePincodeRecord(id: number, input: PincodeFormInput): PincodeRecord | null {
  const all = loadPincodeRecords();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const now = todayStr();
  const updated: PincodeRecord = {
    ...all[idx],
    pincode: input.pincode.trim(),
    stateName: input.stateName.trim(),
    district: input.district.trim(),
    city: input.city.trim(),
    town: input.town.trim(),
    status: input.status,
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: now,
  };
  const next = [...all];
  next[idx] = updated;
  savePincodeRecords(next);
  return updated;
}

export function setPincodeStatus(id: number, status: PincodeStatus): PincodeRecord | null {
  const all = loadPincodeRecords();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const next = [...all];
  next[idx] = {
    ...next[idx],
    status,
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: todayStr(),
  };
  savePincodeRecords(next);
  return next[idx];
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
  const district = pickField(row, "district");
  const city = pickField(row, "cityname", "city") || district;
  const town = pickField(row, "officename", "office name", "town", "post office");
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
  return {
    pincode: row.pincode.trim(),
    stateName: row.state.trim(),
    district,
    city: (row.city?.trim() || district),
    town: row.town.trim(),
  };
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
  const all = loadPincodeRecords();
  let nextId = Math.max(0, ...all.map((r) => r.id)) + 1;
  const now = todayStr();
  const imported: PincodeRecord[] = rows.map((row) => ({
    id: nextId++,
    pincode: row.pincode.trim(),
    stateName: row.stateName.trim(),
    district: row.district.trim(),
    city: row.city.trim(),
    town: row.town.trim(),
    status: "active" as const,
    createdBy: DEFAULT_PINCODE_USER,
    createdDate: now,
    updatedBy: DEFAULT_PINCODE_USER,
    updatedDate: now,
  }));
  savePincodeRecords([...all, ...imported]);
  return imported.length;
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
