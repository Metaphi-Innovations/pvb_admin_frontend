// Unit Master - data types, seed data & localStorage helpers

export interface UOMMaster {
  id: number;
  uomId: string;           // Auto Generated, e.g. "UOM-0001"
  unitName: string;        // e.g. "Kilogram"
  shortName: string;       // e.g. "KG"
  uom?: string;            // e.g. "Gram" (or reference unit)
  conversionUnit?: number; // e.g. 1000
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const STORAGE_KEY = "ds_uom_masters";
const SEED_VERSION = 3; // Incremented version to force migration

const SEED: UOMMaster[] = [
  {
    id: 1, uomId: "UOM-0001", unitName: "Kilogram", shortName: "KG",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 2, uomId: "UOM-0002", unitName: "Gram", shortName: "GM",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 3, uomId: "UOM-0003", unitName: "Litre", shortName: "LTR",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 4, uomId: "UOM-0004", unitName: "Millilitre", shortName: "ML",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 5, uomId: "UOM-0005", unitName: "Packet", shortName: "PKT",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 6, uomId: "UOM-0006", unitName: "Bottle", shortName: "BTL",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 7, uomId: "UOM-0007", unitName: "Box", shortName: "BOX",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 8, uomId: "UOM-0008", unitName: "Drum", shortName: "DRM",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 9, uomId: "UOM-0009", unitName: "Ton", shortName: "TON",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  },
  {
    id: 10, uomId: "UOM-0010", unitName: "Piece", shortName: "PCS",
    status: "active",
    createdBy: "Admin", createdDate: "2026-01-01", updatedBy: "Admin", updatedDate: "2026-01-01"
  }
];

export function loadUOMMasters(): UOMMaster[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: SEED }));
      return SEED;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.version || parsed.version < SEED_VERSION) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: SEED }));
      return SEED;
    }
    return (parsed.data as any[]).map(item => ({
      ...item,
      uom: item.uom ?? item.measuringUnit ?? "",
      conversionUnit: item.conversionUnit ?? 1
    }));
  } catch {
    return SEED;
  }
}

export function saveUOMMasters(records: UOMMaster[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: records }));
}

export function nextUOMId(records: UOMMaster[]): number {
  if (records.length === 0) return 1;
  return Math.max(...records.map(r => r.id)) + 1;
}

export function generateUOMCode(id: number): string {
  return `UOM-${String(id).padStart(4, "0")}`;
}
