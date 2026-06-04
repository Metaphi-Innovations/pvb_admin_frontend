/** Product catalog for procurement line items (sync with Product Master later). */

export interface ProcurementProduct {
  id: number;
  code: string;
  name: string;
  categoryName: string;
  uom: string;
  description: string;
  estimatedUnitPrice: number;
}

const SEED: ProcurementProduct[] = [
  { id: 1, code: "PRD-001", name: "NPK 19:19:19", categoryName: "NPK Fertilizers", uom: "KG", description: "Balanced NPK fertilizer", estimatedUnitPrice: 1050 },
  { id: 2, code: "PRD-002", name: "DAP Fertilizer", categoryName: "NPK Fertilizers", uom: "KG", description: "Di-ammonium phosphate", estimatedUnitPrice: 1250 },
  { id: 3, code: "PRD-003", name: "Urea 46%", categoryName: "NPK Fertilizers", uom: "KG", description: "Nitrogen fertilizer", estimatedUnitPrice: 820 },
  { id: 4, code: "PRD-004", name: "Chlorpyrifos 20 EC", categoryName: "Insecticides", uom: "LTR", description: "Broad spectrum insecticide", estimatedUnitPrice: 320 },
  { id: 5, code: "PRD-005", name: "Glyphosate 41% SL", categoryName: "Herbicides", uom: "LTR", description: "Non-selective herbicide", estimatedUnitPrice: 390 },
  { id: 6, code: "PRD-006", name: "Hybrid Tomato Seeds", categoryName: "Hybrid Seeds", uom: "PKT", description: "High yield tomato hybrid", estimatedUnitPrice: 95 },
  { id: 7, code: "PRD-008", name: "Vermicompost", categoryName: "Organic Fertilizers", uom: "KG", description: "Organic compost", estimatedUnitPrice: 14 },
  { id: 8, code: "PRD-009", name: "Zinc Sulphate 21%", categoryName: "Micronutrients", uom: "KG", description: "Zinc micronutrient", estimatedUnitPrice: 72 },
  { id: 9, code: "PRD-010", name: "Manual Sprayer 16L", categoryName: "Equipment", uom: "PCS", description: "Knapsack sprayer", estimatedUnitPrice: 480 },
  { id: 10, code: "PRD-012", name: "Mancozeb 75 WP", categoryName: "Pesticides", uom: "KG", description: "Fungicide WP", estimatedUnitPrice: 235 },
];

const STORAGE_KEY = "ds_procurement_products";

export function loadProcurementProducts(): ProcurementProduct[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as ProcurementProduct[];
  } catch {
    return SEED;
  }
}

export function getProductById(id: number): ProcurementProduct | undefined {
  return loadProcurementProducts().find((p) => p.id === id);
}

export function saveProcurementProducts(list: ProcurementProduct[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addProcurementProduct(
  payload: Omit<ProcurementProduct, "id">,
): ProcurementProduct {
  const list = loadProcurementProducts();
  const id = list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1;
  const next: ProcurementProduct = { id, ...payload };
  saveProcurementProducts([...list, next]);
  return next;
}
