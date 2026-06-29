export interface SalesReturnProduct {
  product: string;
  sku: string;
  packedQty: number;
  dispatchQty: number;
  returnQty: number;
  unitRate: number;
  batchNo?: string;
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
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getReturnTotalAmount(record: SalesReturnRecord): number {
  if (typeof record.totalAmount === "number") return record.totalAmount;
  return record.products.reduce(
    (sum, p) => sum + (p.lineAmount ?? p.returnQty * (p.unitRate ?? 0)),
    0,
  );
}
