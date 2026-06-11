// GST Master Data & Helpers

export interface GSTMaster {
  id: number;
  gstId: string;             // Auto Generated, e.g., "GST-0001"
  gstCode?: string;          // Optional code field compatible with CustomerInfoDialog
  gstPercentage: number;     // Decimal
  remarks?: string;          // Optional remarks/remark field
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;       // YYYY-MM-DD
  updatedBy: string;
  updatedDate: string;       // YYYY-MM-DD
}

const SEED_GST: GSTMaster[] = [
  {
    id: 1,
    gstId: "GST-0001",
    gstCode: "GST-0001",
    gstPercentage: 0.0,
    remarks: "Zero rate basic GST",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-10",
    updatedBy: "Admin",
    updatedDate: "2026-01-10",
  },
  {
    id: 2,
    gstId: "GST-0002",
    gstCode: "GST-0002",
    gstPercentage: 2.5,
    remarks: "Essential goods rate",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-12",
    updatedBy: "Admin",
    updatedDate: "2026-01-12",
  },
  {
    id: 3,
    gstId: "GST-0003",
    gstCode: "GST-0003",
    gstPercentage: 18.0,
    remarks: "Standard rate for services and manufacturing",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-15",
    updatedBy: "Admin",
    updatedDate: "2026-01-15",
  },
];

const STORAGE_KEY = "ds_gst_masters";

export function loadGSTMasters(): GSTMaster[] {
  if (typeof window === "undefined") return SEED_GST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_GST;
    const list = JSON.parse(raw);
    return list.map((g: any) => ({
      ...g,
      gstCode: g.gstCode || g.gstId || `GST-${String(g.id).padStart(4, "0")}`
    }));
  } catch {
    return SEED_GST;
  }
}

export function saveGSTMasters(data: GSTMaster[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function nextGSTId(list: GSTMaster[]): number {
  return Math.max(0, ...list.map(g => g.id)) + 1;
}

export function generateGSTCode(id: number): string {
  return `GST-${String(id).padStart(4, "0")}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
