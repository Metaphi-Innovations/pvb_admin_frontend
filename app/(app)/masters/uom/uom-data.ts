// ── Unit Master — data types, seed data & localStorage helpers ─────────────

export interface UOMMaster {
  id: number;
  unitCode: string;       // e.g. "KG", "LTR"
  unitName: string;       // e.g. "Kilogram", "Litre"
  shortName: string;      // e.g. "KG", "LTR"
  description: string;
  baseUnit: string;       // the unit this converts FROM (empty = is itself a base unit)
  conversionFactor: number; // 1 <this unit> = conversionFactor <baseUnit>
  status: "active" | "inactive";
  // Audit
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  lastStatusChange: string;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const STORAGE_KEY = "ds_uom_masters";
const SEED_VERSION = 1;

const SEED: UOMMaster[] = [
  {
    id: 1, unitCode: "KG", unitName: "Kilogram", shortName: "KG",
    description: "Standard unit of weight",
    baseUnit: "", conversionFactor: 1,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 2, unitCode: "GM", unitName: "Gram", shortName: "GM",
    description: "One thousandth of a kilogram",
    baseUnit: "KG", conversionFactor: 0.001,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 3, unitCode: "MT", unitName: "Metric Ton", shortName: "MT",
    description: "One thousand kilograms",
    baseUnit: "KG", conversionFactor: 1000,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 4, unitCode: "LTR", unitName: "Litre", shortName: "LTR",
    description: "Standard unit of liquid volume",
    baseUnit: "", conversionFactor: 1,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 5, unitCode: "ML", unitName: "Millilitre", shortName: "ML",
    description: "One thousandth of a litre",
    baseUnit: "LTR", conversionFactor: 0.001,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 6, unitCode: "PCS", unitName: "Piece", shortName: "PCS",
    description: "Individual unit / piece",
    baseUnit: "", conversionFactor: 1,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 7, unitCode: "PKT", unitName: "Packet", shortName: "PKT",
    description: "A sealed packet",
    baseUnit: "", conversionFactor: 1,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 8, unitCode: "BAG", unitName: "Bag", shortName: "BAG",
    description: "Standard bag — common for agri inputs (fertilizers, seeds)",
    baseUnit: "", conversionFactor: 1,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 9, unitCode: "BTL", unitName: "Bottle", shortName: "BTL",
    description: "Bottle — common for pesticides and liquid inputs",
    baseUnit: "", conversionFactor: 1,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 10, unitCode: "BOX", unitName: "Box", shortName: "BOX",
    description: "Box containing multiple pieces",
    baseUnit: "PCS", conversionFactor: 12,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
  {
    id: 11, unitCode: "CTN", unitName: "Carton", shortName: "CTN",
    description: "Carton containing multiple bottles",
    baseUnit: "BTL", conversionFactor: 24,
    status: "active", createdBy: "Admin", createdDate: "2024-01-01",
    updatedBy: "Admin", updatedDate: "2024-01-01", lastStatusChange: "2024-01-01",
  },
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
    // Version-based migration: if seed version changed, re-seed
    if (!parsed.version || parsed.version < SEED_VERSION) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: SEED }));
      return SEED;
    }
    return parsed.data as UOMMaster[];
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
