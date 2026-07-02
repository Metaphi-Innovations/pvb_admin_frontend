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
}

export const KEY_SALES_RETURNS = "ds_sales_returns";
export const PIECES_PER_CASE = 10;

export function getSalesReturnRecords(): SalesReturnRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(KEY_SALES_RETURNS);
  if (!stored) return [];
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
