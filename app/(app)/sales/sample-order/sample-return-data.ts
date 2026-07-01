export interface SampleReturnProduct {
  product: string;
  sku: string;
  returnQty: number;
  batchNo?: string;
}

export interface SampleReturnRecord {
  id: string;
  returnNumber: string;
  sampleOrderNumber: string;
  customer: string;
  returnDate: string;
  warehouse: string;
  products: SampleReturnProduct[];
}

export const KEY_SAMPLE_RETURNS = "ds_sample_returns";

const DEFAULT_SAMPLE_RETURNS: SampleReturnRecord[] = [
  {
    id: "samp-ret-1",
    returnNumber: "SAMP-RET-001",
    sampleOrderNumber: "SAMP-ORD-901",
    customer: "Kisan Demonstration Farms",
    returnDate: "2026-06-28",
    warehouse: "Central Warehouse",
    products: [
      {
        product: "Hybrid Maize Seed",
        sku: "SED-MZ-003",
        returnQty: 25,
        batchNo: "B-SAMP-MZ",
      },
    ],
  },
  {
    id: "samp-ret-2",
    returnNumber: "SAMP-RET-002",
    sampleOrderNumber: "SAMP-ORD-902",
    customer: "Agro Biotech Lab",
    returnDate: "2026-06-29",
    warehouse: "Central Warehouse",
    products: [
      {
        product: "NPK 10:26:26",
        sku: "FER-NPK-002",
        returnQty: 12,
        batchNo: "B-SAMP-NPK",
      },
    ],
  },
];

export function getSampleReturnRecords(): SampleReturnRecord[] {
  if (typeof window === "undefined") return DEFAULT_SAMPLE_RETURNS;
  const stored = localStorage.getItem(KEY_SAMPLE_RETURNS);
  if (!stored) {
    localStorage.setItem(KEY_SAMPLE_RETURNS, JSON.stringify(DEFAULT_SAMPLE_RETURNS));
    return DEFAULT_SAMPLE_RETURNS;
  }
  return JSON.parse(stored);
}

export function saveSampleReturnRecords(records: SampleReturnRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_SAMPLE_RETURNS, JSON.stringify(records));
}

export function getSampleReturnById(id: string): SampleReturnRecord | null {
  return getSampleReturnRecords().find((r) => r.id === id) ?? null;
}
