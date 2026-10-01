// GST Master Data & Helpers

export type GstTaxType =
  | "CGST_SGST"
  | "IGST"
  | "Exempt"
  | "Nil Rated"
  | "Zero Rated";

export interface GSTMaster {
  id: number;
  gstId: string;
  gstCode?: string;
  gstName?: string;
  gstPercentage: number;
  taxType?: GstTaxType;
  cgstPct?: number;
  sgstPct?: number;
  igstPct?: number;
  cessPct?: number;
  inputCgstLedgerId?: number | null;
  inputSgstLedgerId?: number | null;
  inputIgstLedgerId?: number | null;
  outputCgstLedgerId?: number | null;
  outputSgstLedgerId?: number | null;
  outputIgstLedgerId?: number | null;
  remarks?: string;
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

function inferTaxType(pct: number): GstTaxType {
  if (pct === 0) return "Zero Rated";
  return "CGST_SGST";
}

function splitGstRate(pct: number): { cgstPct: number; sgstPct: number; igstPct: number } {
  const half = Math.round((pct / 2) * 100) / 100;
  return { cgstPct: half, sgstPct: pct - half, igstPct: pct };
}

function normalizeGst(g: Partial<GSTMaster>): GSTMaster {
  const pct = Number(g.gstPercentage) || 0;
  const taxType = g.taxType ?? inferTaxType(pct);
  const split = splitGstRate(pct);
  return {
    id: Number(g.id),
    gstId: g.gstId ?? `GST-${String(g.id).padStart(4, "0")}`,
    gstCode: g.gstCode || g.gstId || `GST-${String(g.id).padStart(4, "0")}`,
    gstName: g.gstName ?? (pct === 0 ? "Nil / Zero Rated" : `GST @ ${pct}%`),
    gstPercentage: pct,
    taxType,
    cgstPct: g.cgstPct ?? split.cgstPct,
    sgstPct: g.sgstPct ?? split.sgstPct,
    igstPct: g.igstPct ?? split.igstPct,
    cessPct: g.cessPct ?? 0,
    inputCgstLedgerId: g.inputCgstLedgerId ?? null,
    inputSgstLedgerId: g.inputSgstLedgerId ?? null,
    inputIgstLedgerId: g.inputIgstLedgerId ?? null,
    outputCgstLedgerId: g.outputCgstLedgerId ?? null,
    outputSgstLedgerId: g.outputSgstLedgerId ?? null,
    outputIgstLedgerId: g.outputIgstLedgerId ?? null,
    remarks: g.remarks,
    status: g.status ?? "active",
    createdBy: g.createdBy ?? "Admin",
    createdDate: g.createdDate ?? "2026-01-10",
    updatedBy: g.updatedBy ?? "Admin",
    updatedDate: g.updatedDate ?? "2026-01-10",
  };
}

const SEED_GST: GSTMaster[] = [
  normalizeGst({
    id: 1,
    gstId: "GST-0001",
    gstPercentage: 0,
    gstName: "Zero Rated",
    taxType: "Zero Rated",
    remarks: "Zero rate basic GST",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-10",
    updatedBy: "Admin",
    updatedDate: "2026-01-10",
  }),
  normalizeGst({
    id: 2,
    gstId: "GST-0002",
    gstPercentage: 5,
    gstName: "GST 5%",
    remarks: "Essential goods / Urea rate",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-12",
    updatedBy: "Admin",
    updatedDate: "2026-01-12",
  }),
  normalizeGst({
    id: 3,
    gstId: "GST-0003",
    gstPercentage: 12,
    gstName: "GST 12%",
    remarks: "NPK / fertilizer blends",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-14",
    updatedBy: "Admin",
    updatedDate: "2026-01-14",
  }),
  normalizeGst({
    id: 4,
    gstId: "GST-0004",
    gstPercentage: 18,
    gstName: "GST 18%",
    remarks: "Standard rate — pesticides & services",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-15",
    updatedBy: "Admin",
    updatedDate: "2026-01-15",
  }),
  normalizeGst({
    id: 5,
    gstId: "GST-0005",
    gstPercentage: 0,
    gstName: "Nil Rated",
    taxType: "Nil Rated",
    remarks: "Nil-rated supply under GST (0%)",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-16",
    updatedBy: "Admin",
    updatedDate: "2026-01-16",
  }),
  normalizeGst({
    id: 6,
    gstId: "GST-0006",
    gstPercentage: 0,
    gstName: "Exempt",
    taxType: "Exempt",
    remarks: "Exempt from GST",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-16",
    updatedBy: "Admin",
    updatedDate: "2026-01-16",
  }),
];

const STORAGE_KEY = "ds_gst_masters";

export function loadGSTMasters(): GSTMaster[] {
  if (typeof window === "undefined") return SEED_GST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_GST;
    const list = JSON.parse(raw) as Partial<GSTMaster>[];
    return list.map((g) => normalizeGst(g));
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
  return Math.max(0, ...list.map((g) => g.id)) + 1;
}

export function generateGSTCode(id: number): string {
  return `GST-${String(id).padStart(4, "0")}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export { normalizeGst };
