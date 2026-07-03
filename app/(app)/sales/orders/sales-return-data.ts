export type SalesReturnStatus = "pending_approval" | "approved" | "rejected";

export interface SalesReturnProduct {
  product: string;
  sku: string;
  packedQty: number;
  dispatchQty: number;
  returnQty: number;
  unitRate: number;
  batchNo?: string;
  batchExpiryDate?: string;
  packingNumber?: string;
  packingDate?: string;
  returnCaseQty?: number;
  returnLooseQty?: number;
  returnTotalPieces?: number;
  remarks?: string;
  lineAmount: number;
}

export interface SalesReturnRecord {
  id: string;
  returnNumber: string;
  dispatchNumber: string;
  salesOrderNumber: string;
  customer: string;
  returnDate: string;
  warehouse: string;
  products: SalesReturnProduct[];
  totalAmount: number;
  remarks?: string;
  status?: SalesReturnStatus;
  sourceInvoiceId?: number | null;
  sourceInvoiceNo?: string;
  creditNoteId?: number | null;
  creditNoteNo?: string;
}

export const SALES_RETURN_SEED_KEY = "ds_sales_returns_seed_v1";

export const KEY_SALES_RETURNS = "ds_sales_returns";
export const PIECES_PER_CASE = 10;

export function getSalesReturnRecords(): SalesReturnRecord[] {
  if (typeof window === "undefined") return buildSalesReturnSeed();
  const stored = localStorage.getItem(KEY_SALES_RETURNS);
  if (!stored) {
    const seed = buildSalesReturnSeed();
    localStorage.setItem(KEY_SALES_RETURNS, JSON.stringify(seed));
    localStorage.setItem(SALES_RETURN_SEED_KEY, SALES_RETURN_SEED_KEY);
    return seed;
  }
  return JSON.parse(stored);
}

export function saveSalesReturnRecords(records: SalesReturnRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_SALES_RETURNS, JSON.stringify(records));
}

export function getSalesReturnById(id: string): SalesReturnRecord | null {
  return getSalesReturnRecords().find((r) => r.id === id) ?? null;
}

export function formatReturnAmount(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getProductReturnPieces(product: SalesReturnProduct): number {
  return product.returnTotalPieces ?? product.returnQty ?? 0;
}

export function getProductReturnBreakdown(product: SalesReturnProduct): {
  caseQty: number;
  looseQty: number;
} {
  const pieces = getProductReturnPieces(product);
  const caseQty = product.returnCaseQty ?? Math.floor(pieces / PIECES_PER_CASE);
  const looseQty = product.returnLooseQty ?? (pieces % PIECES_PER_CASE);
  return { caseQty, looseQty };
}

export function formatCaseLooseQuantity(caseQty: number, looseQty: number): string {
  const parts: string[] = [];
  if (caseQty > 0 || looseQty === 0) {
    parts.push(`${caseQty} ${caseQty === 1 ? "Case" : "Cases"}`);
  }
  if (looseQty > 0) {
    parts.push(`${looseQty} Loose`);
  }
  return parts.join(" ");
}

export function formatProductReturnQuantity(product: SalesReturnProduct): string {
  const { caseQty, looseQty } = getProductReturnBreakdown(product);
  return formatCaseLooseQuantity(caseQty, looseQty);
}

export function getReturnTotalAmount(record: SalesReturnRecord): number {
  if (typeof record.totalAmount === "number") return record.totalAmount;
  return record.products.reduce((sum, product) => {
    const pieces = getProductReturnPieces(product);
    const lineAmount =
      typeof product.lineAmount === "number"
        ? product.lineAmount
        : (pieces / PIECES_PER_CASE) * (product.unitRate ?? 0);
    return sum + lineAmount;
  }, 0);
}

function buildSalesReturnSeed(): SalesReturnRecord[] {
  return [
    {
      id: "sret-seed-1",
      returnNumber: "SRET-2026-001",
      dispatchNumber: "DSP-2026-001",
      salesOrderNumber: "SO-2026-0001",
      customer: "ABC Agro Distributor",
      returnDate: new Date().toISOString().slice(0, 10),
      warehouse: "Main Warehouse",
      status: "approved",
      sourceInvoiceId: 1,
      sourceInvoiceNo: "INV-2026-0001",
      creditNoteId: 1,
      creditNoteNo: "CN-2026-0001",
      products: [
        {
          product: "Urea 50kg",
          sku: "UREA-50",
          packedQty: 100,
          dispatchQty: 100,
          returnQty: 5,
          unitRate: 1400,
          returnTotalPieces: 5,
          lineAmount: 7000,
          remarks: "Damaged bags",
        },
      ],
      totalAmount: 8260,
      remarks: "Damaged bags on transit",
    },
    {
      id: "sret-seed-2",
      returnNumber: "SRET-2026-002",
      dispatchNumber: "DSP-2026-002",
      salesOrderNumber: "SO-2026-0002",
      customer: "ABC Agro Distributor",
      returnDate: new Date().toISOString().slice(0, 10),
      warehouse: "Main Warehouse",
      status: "approved",
      sourceInvoiceId: 2,
      sourceInvoiceNo: "INV-2026-0002",
      creditNoteId: 2,
      creditNoteNo: "CN-2026-0002",
      products: [
        {
          product: "DAP 50kg",
          sku: "DAP-50",
          packedQty: 50,
          dispatchQty: 50,
          returnQty: 3,
          unitRate: 1850,
          returnTotalPieces: 3,
          lineAmount: 5550,
          remarks: "Excess stock return",
        },
      ],
      totalAmount: 6552,
      remarks: "Customer return — excess stock",
    },
  ];
}

export function approveSalesReturn(returnId: string): SalesReturnRecord | null {
  const records = getSalesReturnRecords();
  const idx = records.findIndex((r) => r.id === returnId);
  if (idx < 0) return null;
  const current = records[idx];
  if (current.status === "approved" && current.creditNoteId) return current;
  const updated: SalesReturnRecord = { ...current, status: "approved" };
  records[idx] = updated;
  saveSalesReturnRecords(records);
  return updated;
}
