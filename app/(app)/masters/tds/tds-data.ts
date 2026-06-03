// TDS Master Data & Helpers

export interface TDSMaster {
  id: number;
  tdsCode: string;           // e.g., "194C", "194J", "194H"
  tdsRate: number;           // Main TDS rate percentage (e.g., 5, 10, 20)
  status: "active" | "inactive" | "archived";
  remarks?: string;
  createdBy: string;
  createdDate: string;       // YYYY-MM-DD
  updatedBy: string;
  updatedDate: string;       // YYYY-MM-DD
  lastStatusChange: string;  // YYYY-MM-DD
}

const SEED_TDS: TDSMaster[] = [
  {
    id: 1,
    tdsCode: "194C",
    tdsRate: 1,
    status: "active",
    remarks: "TDS on Contractor Payments",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
    lastStatusChange: "2024-01-10",
  },
  {
    id: 2,
    tdsCode: "194J",
    tdsRate: 10,
    status: "active",
    remarks: "TDS on Professional Fees",
    createdBy: "Admin",
    createdDate: "2024-01-12",
    updatedBy: "Admin",
    updatedDate: "2024-01-12",
    lastStatusChange: "2024-01-12",
  },
  {
    id: 3,
    tdsCode: "194H",
    tdsRate: 5,
    status: "active",
    remarks: "TDS on Commission/Brokerage",
    createdBy: "Admin",
    createdDate: "2024-01-15",
    updatedBy: "Admin",
    updatedDate: "2024-01-15",
    lastStatusChange: "2024-01-15",
  },
  {
    id: 4,
    tdsCode: "194Q",
    tdsRate: 0.1,
    status: "active",
    remarks: "TDS on Agricultural Products",
    createdBy: "Admin",
    createdDate: "2024-01-18",
    updatedBy: "Admin",
    updatedDate: "2024-01-18",
    lastStatusChange: "2024-01-18",
  },
  {
    id: 5,
    tdsCode: "194LA",
    tdsRate: 1,
    status: "inactive",
    remarks: "TDS on Life Insurance Premium",
    createdBy: "Admin",
    createdDate: "2024-02-01",
    updatedBy: "Admin",
    updatedDate: "2024-02-15",
    lastStatusChange: "2024-02-15",
  },
];

const STORAGE_KEY = "ds_tds_masters";

export function loadTDSMasters(): TDSMaster[] {
  if (typeof window === "undefined") return SEED_TDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_TDS;
  } catch {
    return SEED_TDS;
  }
}

export function saveTDSMasters(data: TDSMaster[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function nextTDSId(list: TDSMaster[]): number {
  return Math.max(0, ...list.map(t => t.id)) + 1;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
