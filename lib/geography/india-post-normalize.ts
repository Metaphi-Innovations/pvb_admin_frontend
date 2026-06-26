/**
 * Shared India Post CSV/JSON → ERP postal master normalization.
 * Used by scripts/import-india-post.ts and the Geography module.
 */

export interface ErpPostalJsonRow {
  state: string;
  district: string;
  city: string;
  town: string;
  pincode: string;
  deliveryStatus: string;
  status: "Active" | "Inactive";
}

export interface NormalizedPostalRow {
  pincode: string;
  state: string;
  district: string;
  city: string;
  town: string;
  deliveryStatus: string;
  status: "active" | "inactive";
}

/** @deprecated Wrapped payload — prefer flat ErpPostalJsonRow[] in postal-master.json */
export interface NormalizedPostalPayload {
  generatedAt: string;
  sourceFile: string;
  recordCount: number;
  records: NormalizedPostalRow[];
}

export interface MappedPostalRow extends Omit<NormalizedPostalRow, "status"> {
  officePriority: number;
}

const OFFICE_SUFFIX_RE =
  /\s+(?:S\.O\.?|B\.O\.?|G\.P\.O\.?|GPO|H\.O\.?|RMS)\s*$/i;

export function normalizeHeader(h: string): string {
  return String(h).trim().toLowerCase().replace(/\s+/g, "");
}

export function cleanTownName(officename: string): string {
  return officename.replace(OFFICE_SUFFIX_RE, "").trim() || officename.trim();
}

export function officePriority(officename: string): number {
  const n = officename.toUpperCase();
  if (/\bG\.?P\.?O\.?\b|\bGPO\b/.test(n)) return 100;
  if (/\bH\.?O\.?\b/.test(n)) return 90;
  if (/\bS\.?O\.?\b/.test(n)) return 80;
  if (/\bB\.?O\.?\b/.test(n)) return 40;
  if (/\bRMS\b/.test(n)) return 5;
  return 50;
}

export function normalizePlaceName(value: string): string {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return v;
  if (v === v.toUpperCase() && /[A-Z]/.test(v)) {
    return v
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return v;
}

export function deriveCity(district: string, taluk: string, cityField: string): string {
  const city = normalizePlaceName(cityField);
  if (city) return city;
  const sub = normalizePlaceName(taluk);
  if (sub) return sub;
  return normalizePlaceName(district);
}

export function normalizeDeliveryStatus(raw: string): string {
  const v = raw.trim();
  return v || "Non-Delivery";
}

export function normalizeErpStatus(raw?: string): "active" | "inactive" {
  const v = String(raw ?? "Active").trim().toLowerCase();
  return v === "inactive" ? "inactive" : "active";
}

export function toErpJsonRow(row: NormalizedPostalRow): ErpPostalJsonRow {
  return {
    state: row.state,
    district: row.district,
    city: row.city,
    town: row.town,
    pincode: row.pincode,
    deliveryStatus: row.deliveryStatus,
    status: row.status === "inactive" ? "Inactive" : "Active",
  };
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

export function dedupeKey(row: Pick<NormalizedPostalRow, "state" | "district" | "town" | "pincode">): string {
  return [row.state, row.district, row.town, row.pincode].join("|").toLowerCase();
}

export function mapRawCsvRow(
  row: Record<string, unknown>,
): Omit<MappedPostalRow, "officePriority"> & { rawOfficeName: string } | null {
  const pincode = pickField(row, "pincode");
  const state = pickField(row, "statename", "state");
  const district = pickField(row, "district", "districtname");
  const taluk = pickField(row, "taluk", "subdistrict", "sub district");
  const cityField = pickField(row, "cityname", "city");
  const rawOffice = pickField(row, "officename", "office name", "town", "locality", "post office");
  const town = cleanTownName(rawOffice);
  const deliveryStatus = normalizeDeliveryStatus(
    pickField(row, "delivery", "deliverystatus", "delivery status"),
  );

  if (!pincode && !state && !district && !town) return null;
  if (!pincode || !/^\d{6}$/.test(pincode)) return null;
  if (!state || !district || !town) return null;

  return {
    pincode,
    state: normalizePlaceName(state),
    district: normalizePlaceName(district),
    city: deriveCity(district, taluk, cityField),
    town: normalizePlaceName(town),
    deliveryStatus,
    rawOfficeName: rawOffice,
  };
}

export function mapJsonRow(row: Record<string, unknown>): Omit<MappedPostalRow, "officePriority"> | null {
  const pincode = String(row.pincode ?? "").trim();
  const state = String(row.state ?? row.stateName ?? "").trim();
  const districtRaw = String(row.district ?? "").trim();
  const district = normalizePlaceName(districtRaw);
  const city = normalizePlaceName(String(row.city ?? "").trim()) || district;
  const rawOffice = String(row.town ?? row.officename ?? "").trim();
  const town = cleanTownName(rawOffice);
  const deliveryStatus = normalizeDeliveryStatus(String(row.deliveryStatus ?? row.delivery ?? ""));

  if (!pincode || !/^\d{6}$/.test(pincode)) return null;
  if (!state || !district || !town) return null;

  return {
    pincode,
    state: normalizePlaceName(state),
    district: normalizePlaceName(district),
    city: normalizePlaceName(city),
    town: normalizePlaceName(town),
    deliveryStatus,
  };
}

export function dedupeMappedRows(rows: Array<Omit<MappedPostalRow, "officePriority"> & { rawOfficeName?: string }>): MappedPostalRow[] {
  const seen = new Set<string>();
  const out: MappedPostalRow[] = [];

  for (const row of rows) {
    const key = dedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const rawOffice = row.rawOfficeName ?? row.town;
    out.push({
      pincode: row.pincode,
      state: row.state,
      district: row.district,
      city: row.city,
      town: row.town,
      deliveryStatus: row.deliveryStatus,
      officePriority: officePriority(rawOffice),
    });
  }

  return out;
}

export function toNormalizedRows(rows: MappedPostalRow[]): NormalizedPostalRow[] {
  return rows.map((row) => ({
    pincode: row.pincode,
    state: row.state,
    district: row.district,
    city: row.city,
    town: row.town,
    deliveryStatus: row.deliveryStatus,
    status: "active" as const,
  }));
}

export function dedupeNormalizedRows(
  rows: Array<Omit<NormalizedPostalRow, "status" | "deliveryStatus"> & Partial<Pick<NormalizedPostalRow, "deliveryStatus">>>,
): NormalizedPostalRow[] {
  const seen = new Set<string>();
  const out: NormalizedPostalRow[] = [];

  for (const row of rows) {
    const key = dedupeKey({
      state: row.state,
      district: row.district,
      town: row.town,
      pincode: row.pincode,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...row,
      deliveryStatus: normalizeDeliveryStatus(row.deliveryStatus ?? ""),
      status: "active",
    });
  }

  return out;
}

export function normalizeIndiaPostCsvRows(rawRows: Record<string, unknown>[]): NormalizedPostalRow[] {
  const mapped = rawRows
    .map((row) => mapRawCsvRow(row))
    .filter((r): r is NonNullable<ReturnType<typeof mapRawCsvRow>> => r != null);
  return toNormalizedRows(dedupeMappedRows(mapped));
}

export function normalizeIndiaPostJsonInput(json: unknown): NormalizedPostalRow[] {
  let rows: Record<string, unknown>[] = [];
  if (Array.isArray(json)) {
    rows = json as Record<string, unknown>[];
  } else if (json && typeof json === "object") {
    const obj = json as { records?: unknown[] };
    if (Array.isArray(obj.records)) rows = obj.records as Record<string, unknown>[];
  }
  const mapped = rows
    .map((row) => mapJsonRow(row))
    .filter((r): r is NonNullable<ReturnType<typeof mapJsonRow>> => r != null)
    .map((row) => ({ ...row, officePriority: officePriority(row.town) }));
  return toNormalizedRows(dedupeMappedRows(mapped));
}

export function parsePostalMasterJson(json: unknown): NormalizedPostalRow[] {
  if (Array.isArray(json)) {
    return (json as Record<string, unknown>[])
      .map((row) => {
        const pincode = String(row.pincode ?? "").trim();
        const state = normalizePlaceName(String(row.state ?? row.stateName ?? "").trim());
        const district = normalizePlaceName(String(row.district ?? "").trim());
        const city = normalizePlaceName(String(row.city ?? "").trim()) || district;
        const town = normalizePlaceName(cleanTownName(String(row.town ?? row.officename ?? "")));
        const deliveryStatus = normalizeDeliveryStatus(String(row.deliveryStatus ?? row.delivery ?? ""));
        const status = normalizeErpStatus(String(row.status ?? "Active"));
        if (!pincode || !state || !district || !town) return null;
        return { pincode, state, district, city, town, deliveryStatus, status };
      })
      .filter((r): r is NormalizedPostalRow => r != null);
  }
  return normalizeIndiaPostJsonInput(json);
}

/**
 * Build a practical working dataset (10k–20k) from the full normalized set.
 * Ensures every state and district is represented; adds major-city coverage; fills to target.
 */
export function buildPracticalDataset(
  allRows: MappedPostalRow[],
  options?: { minTarget?: number; maxTarget?: number; recordsPerCity?: number },
): MappedPostalRow[] {
  const minTarget = options?.minTarget ?? 10_000;
  const maxTarget = options?.maxTarget ?? 20_000;
  const recordsPerCity = options?.recordsPerCity ?? 20;

  const selected = new Map<string, MappedPostalRow>();

  const add = (row: MappedPostalRow): void => {
    const key = dedupeKey(row);
    if (!selected.has(key)) selected.set(key, row);
  };

  const byDistrict = new Map<string, MappedPostalRow[]>();
  const byCity = new Map<string, MappedPostalRow[]>();

  for (const row of allRows) {
    const dKey = `${row.state}|${row.district}`.toLowerCase();
    const cKey = `${row.state}|${row.district}|${row.city}`.toLowerCase();
    if (!byDistrict.has(dKey)) byDistrict.set(dKey, []);
    byDistrict.get(dKey)!.push(row);
    if (!byCity.has(cKey)) byCity.set(cKey, []);
    byCity.get(cKey)!.push(row);
  }

  // Phase 1 — at least one record per district (prefer GPO/SO/HO)
  for (const rows of byDistrict.values()) {
    const best = [...rows].sort((a, b) => b.officePriority - a.officePriority)[0];
    add(best);
  }

  // Phase 2 — expand major cities within each district
  for (const rows of byCity.values()) {
    const sorted = [...rows].sort((a, b) => b.officePriority - a.officePriority);
    const limit = rows.length >= 30 ? recordsPerCity : rows.length >= 10 ? Math.min(10, recordsPerCity) : 3;
    for (const row of sorted.slice(0, limit)) add(row);
  }

  // Phase 3 — fill toward minTarget, round-robin by state
  if (selected.size < minTarget) {
    const byState = new Map<string, MappedPostalRow[]>();
    for (const row of allRows) {
      const sKey = row.state.toLowerCase();
      if (!byState.has(sKey)) byState.set(sKey, []);
      byState.get(sKey)!.push(row);
    }
    for (const rows of byState.values()) {
      rows.sort((a, b) => b.officePriority - a.officePriority);
    }
    const stateKeys = [...byState.keys()].sort();
    let idx = 0;
    let stagnant = 0;
    while ( selected.size < minTarget && stagnant < stateKeys.length * 2) {
      const sKey = stateKeys[idx % stateKeys.length];
      const rows = byState.get(sKey)!;
      const cursor = Math.floor(idx / stateKeys.length);
      if (cursor < rows.length) {
        const before = selected.size;
        add(rows[cursor]);
        stagnant = selected.size === before ? stagnant + 1 : 0;
      } else {
        stagnant++;
      }
      idx++;
    }
  }

  // Phase 4 — trim to maxTarget (drop lowest priority first, keep district anchors)
  if (selected.size > maxTarget) {
    const districtAnchors = new Set<string>();
    for (const rows of byDistrict.values()) {
      const best = [...rows].sort((a, b) => b.officePriority - a.officePriority)[0];
      districtAnchors.add(dedupeKey(best));
    }
    const sorted = [...selected.values()].sort((a, b) => {
      const aAnchor = districtAnchors.has(dedupeKey(a)) ? 1 : 0;
      const bAnchor = districtAnchors.has(dedupeKey(b)) ? 1 : 0;
      if (aAnchor !== bAnchor) return bAnchor - aAnchor;
      return b.officePriority - a.officePriority;
    });
    const trimmed = sorted.slice(0, maxTarget);
    return trimmed;
  }

  return [...selected.values()];
}

export function summarizePostalRows(rows: Pick<NormalizedPostalRow, "state" | "district" | "city" | "town" | "pincode">[]): {
  states: number;
  districts: number;
  cities: number;
  towns: number;
  pincodes: number;
  records: number;
} {
  return {
    states: new Set(rows.map((r) => r.state)).size,
    districts: new Set(rows.map((r) => `${r.state}|${r.district}`)).size,
    cities: new Set(rows.map((r) => `${r.state}|${r.district}|${r.city}`)).size,
    towns: new Set(rows.map((r) => `${r.state}|${r.district}|${r.town}`)).size,
    pincodes: new Set(rows.map((r) => r.pincode)).size,
    records: rows.length,
  };
}

export function parseCsvText(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = parseLine(lines[0]).map(normalizeHeader);
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}
