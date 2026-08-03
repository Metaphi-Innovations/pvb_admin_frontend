export interface SampleReturnProduct {
  product: string;
  sku: string;
  packedQty: number;
  dispatchQty: number;
  returnQty: number;
  unitRate: number;
  batchNo?: string;
  lineAmount: number;
  remarks?: string;
  quantityType?: string;
  returnTotalPieces?: number;
  returnCaseQty?: number;
  returnLooseQty?: number;
}

export interface SampleReturnRecord {
  id: string;
  returnNumber: string;
  dispatchNumber: string;
  salesOrderNumber: string;
  customer: string;
  returnDate: string;
  warehouse: string;
  products: SampleReturnProduct[];
  totalAmount: number;
  remarks?: string;
  status: "pending" | "approved" | "processed";
}

export const KEY_SAMPLE_RETURNS = "ds_sample_returns";

export function getSampleReturnRecords(): SampleReturnRecord[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(KEY_SAMPLE_RETURNS);
  if (stored && stored.includes("sr-3")) {
    localStorage.removeItem(KEY_SAMPLE_RETURNS);
  }

  const storedUpdated = localStorage.getItem(KEY_SAMPLE_RETURNS);
  if (!storedUpdated) {
    // Seed data if none exists
    const seed: SampleReturnRecord[] = [
      {
        id: "sr-1",
        returnNumber: "SR-2024-001",
        dispatchNumber: "DSP-2024-001",
        salesOrderNumber: "SM-2024-001",
        customer: "Green Valley Agro",
        returnDate: "2024-01-22",
        warehouse: "Central Warehouse",
        products: [
          {
            product: "Urea 50kg",
            sku: "SKU-UR-50",
            packedQty: 300,
            dispatchQty: 300,
            returnQty: 50,
            unitRate: 1500,
            batchNo: "B-UR-01",
            lineAmount: 75000,
          }
        ],
        totalAmount: 75000,
        remarks: "Wrong product delivered",
        status: "processed"
      },
      {
        id: "sr-2",
        returnNumber: "SR-2024-002",
        dispatchNumber: "DSP-2024-003",
        salesOrderNumber: "SM-2024-003",
        customer: "Kisan Fertilizers Ltd",
        returnDate: "2024-02-10",
        warehouse: "Central Warehouse",
        products: [
          {
            product: "NPK 10:26:26",
            sku: "SKU-NPK-26",
            packedQty: 200,
            dispatchQty: 200,
            returnQty: 20,
            unitRate: 1800,
            batchNo: "B-NPK-01",
            lineAmount: 36000,
          }
        ],
        totalAmount: 36000,
        remarks: "Damaged during transit",
        status: "approved"
      }
    ];
    saveSampleReturnRecords(seed);
    return seed;
  }
  return JSON.parse(storedUpdated);
}

export function saveSampleReturnRecords(records: SampleReturnRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_SAMPLE_RETURNS, JSON.stringify(records));
}

export function getSampleReturnById(id: string): SampleReturnRecord | null {
  return getSampleReturnRecords().find((r) => r.id === id) ?? null;
}

export function formatReturnAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getReturnTotalAmount(record: SampleReturnRecord): number {
  if (typeof record.totalAmount === "number") return record.totalAmount;
  return record.products.reduce(
    (sum, p) => sum + (p.lineAmount ?? p.returnQty * (p.unitRate ?? 0)),
    0,
  );
}

