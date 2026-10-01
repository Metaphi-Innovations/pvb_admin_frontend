import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/** UI-only mock data for Accounts screens (localStorage supplements where available). */

export interface ReceiptAllocationRecord {
  id: number;
  receiptNo: string;
  date: string;
  customer: string;
  receiptAmount: number;
  allocated: number;
  unallocated: number;
  status: "draft" | "approved" | "posted";
}

export interface PaymentRunRecord {
  id: number;
  runNo: string;
  date: string;
  payeeCount: number;
  totalAmount: number;
  status: "draft" | "approved" | "paid" | "cancelled";
  branch: string;
}

export interface InventoryAdjustmentRecord {
  id: number;
  adjustmentNo: string;
  date: string;
  warehouse: string;
  type: "Increase" | "Decrease";
  amount: number;
  status: "draft" | "approved" | "posted";
}

export interface CollectionRecord {
  id: number;
  customer: string;
  invoiceNo: string;
  dueDate: string;
  outstanding: number;
  collected: number;
  lastCollection: string;
  status: "open" | "partial" | "closed";
}

export interface RegisterRow {
  id: number;
  docNo: string;
  date: string;
  party: string;
  taxable: number;
  tax: number;
  total: number;
  status: string;
}

export interface BranchReportRow {
  branch: string;
  revenue: number;
  expenses: number;
  receivables: number;
  payables: number;
}

export interface GstSummaryRow {
  period: string;
  outputGst: number;
  inputGst: number;
  netPayable: number;
}

const RA_KEY = "ds_accounts_mock_receipt_alloc";
const PR_KEY = "ds_accounts_mock_payment_runs";
const IA_KEY = "ds_accounts_mock_inv_adj";
const COL_KEY = "ds_accounts_mock_collections";
const MOCK_SEED_VERSION_KEY = "ds_accounts_mock_seed_version";
const MOCK_SEED_VERSION = 3;

function seed<T>(key: string, data: T[]): T[] {
  if (typeof window === "undefined") return data;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return data;
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

/** Re-seed mock collections when version bumps — preserves user-added rows. */
function ensureMockSeedVersion(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MOCK_SEED_VERSION_KEY) === String(MOCK_SEED_VERSION)) return;

  const seedIfMissing = <T extends { id: number }>(key: string, defaults: T[]) => {
    const existing = seed(key, defaults);
    const ids = new Set(existing.map((r) => r.id));
    const merged = [...defaults.filter((d) => !ids.has(d.id)), ...existing];
    save(key, merged);
  };

  seedIfMissing(RA_KEY, RECEIPT_ALLOCATION_SEED);
  seedIfMissing(PR_KEY, PAYMENT_RUN_SEED);
  seedIfMissing(IA_KEY, INVENTORY_ADJ_SEED);
  seedIfMissing(COL_KEY, COLLECTION_SEED);
  localStorage.setItem(MOCK_SEED_VERSION_KEY, String(MOCK_SEED_VERSION));
}


export const RECEIPT_ALLOCATION_SEED: ReceiptAllocationRecord[] = [
  { id: 1, receiptNo: "REC-0012", date: demoDateAt(0), customer: "ABC Agro Distributor", receiptAmount: 150000, allocated: 120000, unallocated: 30000, status: "posted" },
  { id: 2, receiptNo: "REC-0013", date: demoDateAt(1), customer: "Krishna Retail Store", receiptAmount: 85000, allocated: 0, unallocated: 85000, status: "draft" },
  { id: 3, receiptNo: "REC-0014", date: demoDateAt(2), customer: "Yavatmal Cotton FPO", receiptAmount: 65000, allocated: 65000, unallocated: 0, status: "posted" },
  { id: 4, receiptNo: "REC-0015", date: demoDateAt(3), customer: "Green Harvest Agro", receiptAmount: 200000, allocated: 150000, unallocated: 50000, status: "posted" },
  { id: 5, receiptNo: "REC-0016", date: demoDateAt(4), customer: "Shree Ganesh Seeds", receiptAmount: 45000, allocated: 25000, unallocated: 20000, status: "approved" },
];

export const PAYMENT_RUN_SEED: PaymentRunRecord[] = [
  { id: 1, runNo: "PRUN-0001", date: demoDateAt(5), payeeCount: 5, totalAmount: 420000, status: "approved", branch: "Head Office" },
  { id: 2, runNo: "PRUN-0002", date: demoDateAt(6), payeeCount: 3, totalAmount: 185000, status: "draft", branch: "Pune" },
  { id: 3, runNo: "PRUN-0003", date: demoDateAt(7), payeeCount: 8, totalAmount: 675000, status: "paid", branch: "Head Office" },
  { id: 4, runNo: "PRUN-0004", date: demoDateAt(8), payeeCount: 4, totalAmount: 298000, status: "approved", branch: "Mumbai" },
  { id: 5, runNo: "PRUN-0005", date: demoDateAt(9), payeeCount: 2, totalAmount: 95000, status: "cancelled", branch: "Nagpur" },
  { id: 6, runNo: "PRUN-0006", date: demoDateAt(10), payeeCount: 6, totalAmount: 512000, status: "draft", branch: "Pune" },
];

export const INVENTORY_ADJ_SEED: InventoryAdjustmentRecord[] = [
  { id: 1, adjustmentNo: "ADJ-0001", date: demoDateAt(11), warehouse: "Mumbai Central", type: "Decrease", amount: 12500, status: "posted" },
  { id: 2, adjustmentNo: "ADJ-0002", date: demoDateAt(12), warehouse: "Pune Depot", type: "Increase", amount: 8400, status: "approved" },
  { id: 3, adjustmentNo: "ADJ-0003", date: demoDateAt(13), warehouse: "Central Warehouse", type: "Decrease", amount: 22000, status: "posted" },
  { id: 4, adjustmentNo: "ADJ-0004", date: demoDateAt(14), warehouse: "Ahmedabad Warehouse", type: "Increase", amount: 15600, status: "draft" },
  { id: 5, adjustmentNo: "ADJ-0005", date: demoDateAt(15), warehouse: "Nagpur Depot", type: "Decrease", amount: 9800, status: "posted" },
];

export const COLLECTION_SEED: CollectionRecord[] = [
  { id: 1, customer: "ABC Agro Distributor", invoiceNo: "INV-2026-001", dueDate: demoAddDays(demoDateAt(26), 30), outstanding: 73000, collected: 120000, lastCollection: demoDateAt(31), status: "partial" },
  { id: 2, customer: "Krishna Retail Store", invoiceNo: "INV-2026-006", dueDate: demoAddDays(demoDateAt(27), 30), outstanding: 0, collected: 118000, lastCollection: demoDateAt(32), status: "closed" },
  { id: 3, customer: "Yavatmal Cotton FPO", invoiceNo: "INV-2026-007", dueDate: demoAddDays(demoDateAt(28), 30), outstanding: 145000, collected: 0, lastCollection: "—", status: "open" },
  { id: 4, customer: "Green Harvest Agro", invoiceNo: "INV-2026-004", dueDate: demoAddDays(demoDateAt(29), 30), outstanding: 20000, collected: 80000, lastCollection: demoDateAt(33), status: "partial" },
  { id: 5, customer: "Shree Ganesh Seeds", invoiceNo: "INV-2026-010", dueDate: demoAddDays(demoDateAt(30), 30), outstanding: 85000, collected: 0, lastCollection: "—", status: "open" },
];

export const SALES_REGISTER_SEED: RegisterRow[] = [
  { id: 1, docNo: "INV-2026-0001", date: demoDateAt(16), party: "Reliance Agri", taxable: 93000, tax: 4650, total: 97650, status: "sent" },
  { id: 2, docNo: "INV-2026-0002", date: demoDateAt(17), party: "Mahindra Farms", taxable: 145000, tax: 17400, total: 162400, status: "sent" },
  { id: 3, docNo: "INV-2026-0003", date: demoDateAt(18), party: "ABC Distributor", taxable: 12600, tax: 1512, total: 14112, status: "sent" },
  { id: 4, docNo: "STI-2026-0001", date: demoDateAt(19), party: "Ahmedabad Warehouse", taxable: 52000, tax: 2600, total: 54600, status: "sent" },
  { id: 5, docNo: "STI-2026-0002", date: demoDateAt(20), party: "Pune Warehouse", taxable: 78500, tax: 9420, total: 87920, status: "draft" },
];

export const PURCHASE_REGISTER_SEED: RegisterRow[] = [
  { id: 1, docNo: "PINV-2026-001", date: demoDateAt(21), party: "Rallis India Ltd", taxable: 100000, tax: 18000, total: 118000, status: "approved" },
  { id: 2, docNo: "PINV-2026-002", date: demoDateAt(22), party: "Coromandel International", taxable: 185000, tax: 33300, total: 218300, status: "approved" },
  { id: 3, docNo: "PINV-2026-003", date: demoDateAt(23), party: "UPL Limited", taxable: 75000, tax: 13500, total: 88500, status: "posted" },
  { id: 4, docNo: "PINV-2026-004", date: demoDateAt(24), party: "IFFCO", taxable: 220000, tax: 39600, total: 259600, status: "approved" },
  { id: 5, docNo: "PINV-2026-005", date: demoDateAt(25), party: "Chambal Fertilisers", taxable: 95000, tax: 17100, total: 112100, status: "draft" },
];

export const GST_SUMMARY_SEED: GstSummaryRow[] = [
  { period: "Apr 2026", outputGst: 42300, inputGst: 28600, netPayable: 13700 },
  { period: "May 2026", outputGst: 55800, inputGst: 31200, netPayable: 24600 },
  { period: "Jun 2026", outputGst: 27100, inputGst: 19400, netPayable: 7700 },
  { period: "Q1 FY26", outputGst: 125200, inputGst: 79200, netPayable: 46000 },
  { period: "Q2 FY26", outputGst: 98400, inputGst: 65800, netPayable: 32600 },
];

export const BRANCH_REPORT_SEED: BranchReportRow[] = [
  { branch: "Head Office", revenue: 1250000, expenses: 890000, receivables: 320000, payables: 185000 },
  { branch: "Mumbai", revenue: 980000, expenses: 720000, receivables: 210000, payables: 142000 },
  { branch: "Pune", revenue: 640000, expenses: 510000, receivables: 98000, payables: 76000 },
  { branch: "Nagpur", revenue: 420000, expenses: 310000, receivables: 65000, payables: 48000 },
  { branch: "Ahmedabad", revenue: 380000, expenses: 285000, receivables: 52000, payables: 39000 },
];


export function loadReceiptAllocations() {
  ensureMockSeedVersion();
  return seed(RA_KEY, RECEIPT_ALLOCATION_SEED);
}
export function loadPaymentRuns() {
  ensureMockSeedVersion();
  return seed(PR_KEY, PAYMENT_RUN_SEED);
}
export function savePaymentRuns(records: PaymentRunRecord[]): void {
  save(PR_KEY, records);
  ensureMockSeedVersion();
}
export function loadInventoryAdjustments() {
  ensureMockSeedVersion();
  return seed(IA_KEY, INVENTORY_ADJ_SEED);
}
export function loadCollectionRecords() {
  ensureMockSeedVersion();
  return seed(COL_KEY, COLLECTION_SEED);
}
