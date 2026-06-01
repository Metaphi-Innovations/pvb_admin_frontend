// HSN Master Data & Helpers

export interface HSNMaster {
  id: number;
  hsnCode: string;           // e.g., "010210"
  gstRate: number;           // 0, 5, 12, 18, 28
  uom?: string;              // Optional: KG, LTR, etc.
  status: "active" | "inactive";
  remarks?: string;
  createdBy: string;
  createdDate: string;       // YYYY-MM-DD
  updatedBy: string;
  updatedDate: string;       // YYYY-MM-DD
  lastStatusChange: string;  // YYYY-MM-DD
}

const SEED_HSN: HSNMaster[] = [
  {
    id: 1,
    hsnCode: "010210",
    gstRate: 5,
    uom: "KG",
    status: "active",
    remarks: "Meat of bovine animals, fresh or chilled",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
    lastStatusChange: "2024-01-10",
  },
  {
    id: 2,
    hsnCode: "020110",
    gstRate: 5,
    uom: "KG",
    status: "active",
    remarks: "Meat of swine, fresh or chilled",
    createdBy: "Admin",
    createdDate: "2024-01-12",
    updatedBy: "Admin",
    updatedDate: "2024-01-12",
    lastStatusChange: "2024-01-12",
  },
  {
    id: 3,
    hsnCode: "020714",
    gstRate: 5,
    uom: "KG",
    status: "active",
    remarks: "Meat of poultry, not cut in pieces, fresh or chilled",
    createdBy: "Admin",
    createdDate: "2024-01-15",
    updatedBy: "Admin",
    updatedDate: "2024-01-15",
    lastStatusChange: "2024-01-15",
  },
  {
    id: 4,
    hsnCode: "030389",
    gstRate: 5,
    uom: "KG",
    status: "active",
    remarks: "Fish, not elsewhere specified, fresh or chilled",
    createdBy: "Admin",
    createdDate: "2024-01-18",
    updatedBy: "Admin",
    updatedDate: "2024-01-18",
    lastStatusChange: "2024-01-18",
  },
  {
    id: 5,
    hsnCode: "040710",
    gstRate: 0,
    uom: "KG",
    status: "active",
    remarks: "Natural honey",
    createdBy: "Admin",
    createdDate: "2024-01-20",
    updatedBy: "Admin",
    updatedDate: "2024-01-20",
    lastStatusChange: "2024-01-20",
  },
  {
    id: 6,
    hsnCode: "100610",
    gstRate: 0,
    uom: "KG",
    status: "active",
    remarks: "Barley, not pearled or hulled",
    createdBy: "Admin",
    createdDate: "2024-02-01",
    updatedBy: "Admin",
    updatedDate: "2024-02-01",
    lastStatusChange: "2024-02-01",
  },
  {
    id: 7,
    hsnCode: "120991",
    gstRate: 0,
    uom: "KG",
    status: "inactive",
    remarks: "Seeds of other plants, oil-bearing",
    createdBy: "Admin",
    createdDate: "2024-02-05",
    updatedBy: "Admin",
    updatedDate: "2024-02-15",
    lastStatusChange: "2024-02-15",
  },
];

const STORAGE_KEY = "ds_hsn_masters";

export function loadHSNMasters(): HSNMaster[] {
  if (typeof window === "undefined") return SEED_HSN;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_HSN;
  } catch {
    return SEED_HSN;
  }
}

export function saveHSNMasters(data: HSNMaster[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function nextHSNId(list: HSNMaster[]): number {
  return Math.max(0, ...list.map(h => h.id)) + 1;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
