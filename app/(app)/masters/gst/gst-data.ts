// GST Master Data & Helpers

export interface GSTMaster {
  id: number;
  gstCode: string;           // e.g., "GST-0", "GST-5", "GST-18"
  gstPercentage: number;     // 0, 5, 12, 18, 28
  cgst: number;              // CGST percentage
  sgst: number;              // SGST percentage
  igst: number;              // IGST percentage
  status: "active" | "inactive";
  remarks?: string;
  createdBy: string;
  createdDate: string;       // YYYY-MM-DD
  updatedBy: string;
  updatedDate: string;       // YYYY-MM-DD
  lastStatusChange: string;  // YYYY-MM-DD
}

const SEED_GST: GSTMaster[] = [
  {
    id: 1,
    gstCode: "GST-0",
    gstPercentage: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    status: "active",
    remarks: "Zero GST for exempted goods",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
    lastStatusChange: "2024-01-10",
  },
  {
    id: 2,
    gstCode: "GST-5",
    gstPercentage: 5,
    cgst: 2.5,
    sgst: 2.5,
    igst: 5,
    status: "active",
    remarks: "5% GST for essential items",
    createdBy: "Admin",
    createdDate: "2024-01-12",
    updatedBy: "Admin",
    updatedDate: "2024-01-12",
    lastStatusChange: "2024-01-12",
  },
  {
    id: 3,
    gstCode: "GST-12",
    gstPercentage: 12,
    cgst: 6,
    sgst: 6,
    igst: 12,
    status: "active",
    remarks: "12% GST for standard products",
    createdBy: "Admin",
    createdDate: "2024-01-15",
    updatedBy: "Admin",
    updatedDate: "2024-01-15",
    lastStatusChange: "2024-01-15",
  },
  {
    id: 4,
    gstCode: "GST-18",
    gstPercentage: 18,
    cgst: 9,
    sgst: 9,
    igst: 18,
    status: "active",
    remarks: "18% GST for general products",
    createdBy: "Admin",
    createdDate: "2024-01-18",
    updatedBy: "Admin",
    updatedDate: "2024-01-18",
    lastStatusChange: "2024-01-18",
  },
  {
    id: 5,
    gstCode: "GST-28",
    gstPercentage: 28,
    cgst: 14,
    sgst: 14,
    igst: 28,
    status: "active",
    remarks: "28% GST for luxury goods",
    createdBy: "Admin",
    createdDate: "2024-02-01",
    updatedBy: "Admin",
    updatedDate: "2024-02-01",
    lastStatusChange: "2024-02-01",
  },
];

const STORAGE_KEY = "ds_gst_masters";

export function loadGSTMasters(): GSTMaster[] {
  if (typeof window === "undefined") return SEED_GST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_GST;
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

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
