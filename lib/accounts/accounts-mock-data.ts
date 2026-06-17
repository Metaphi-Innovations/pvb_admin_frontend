/** UI-only mock data for Accounts screens (localStorage supplements where available). */

export interface FundTransferRecord {
  id: number;
  date: string;
  reference: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  status: "draft" | "posted" | "cancelled";
  branch: string;
}

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

const FT_KEY = "ds_accounts_mock_fund_transfers";
const RA_KEY = "ds_accounts_mock_receipt_alloc";
const PR_KEY = "ds_accounts_mock_payment_runs";
const IA_KEY = "ds_accounts_mock_inv_adj";
const COL_KEY = "ds_accounts_mock_collections";

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

export const FUND_TRANSFER_SEED: FundTransferRecord[] = [
  { id: 1, date: "2026-06-01", reference: "FT-0001", fromAccount: "HDFC Bank", toAccount: "ICICI Bank", amount: 250000, status: "posted", branch: "Head Office" },
  { id: 2, date: "2026-06-05", reference: "FT-0002", fromAccount: "Cash-in-Hand", toAccount: "HDFC Bank", amount: 50000, status: "posted", branch: "Mumbai" },
];

export const RECEIPT_ALLOCATION_SEED: ReceiptAllocationRecord[] = [
  { id: 1, receiptNo: "REC-0012", date: "2026-06-03", customer: "Agro Solutions Pvt Ltd", receiptAmount: 150000, allocated: 120000, unallocated: 30000, status: "posted" },
  { id: 2, receiptNo: "REC-0013", date: "2026-06-06", customer: "Green Farm Retail", receiptAmount: 85000, allocated: 0, unallocated: 85000, status: "draft" },
];

export const PAYMENT_RUN_SEED: PaymentRunRecord[] = [
  { id: 1, runNo: "PRUN-0001", date: "2026-06-07", payeeCount: 5, totalAmount: 420000, status: "approved", branch: "Head Office" },
  { id: 2, runNo: "PRUN-0002", date: "2026-06-10", payeeCount: 3, totalAmount: 185000, status: "draft", branch: "Pune" },
];

export const INVENTORY_ADJ_SEED: InventoryAdjustmentRecord[] = [
  { id: 1, adjustmentNo: "ADJ-0001", date: "2026-06-02", warehouse: "Mumbai Central", type: "Decrease", amount: 12500, status: "posted" },
  { id: 2, adjustmentNo: "ADJ-0002", date: "2026-06-08", warehouse: "Pune Depot", type: "Increase", amount: 8400, status: "approved" },
];

export const COLLECTION_SEED: CollectionRecord[] = [
  { id: 1, customer: "Agro Solutions Pvt Ltd", invoiceNo: "INV-0001", dueDate: "2026-06-15", outstanding: 73000, collected: 120000, lastCollection: "2026-06-03", status: "partial" },
  { id: 2, customer: "Green Farm Retail", invoiceNo: "INV-0002", dueDate: "2026-06-20", outstanding: 177000, collected: 0, lastCollection: "—", status: "open" },
];

export const SALES_REGISTER_SEED: RegisterRow[] = [
  { id: 1, docNo: "INV-0001", date: "2026-05-28", party: "Agro Solutions Pvt Ltd", taxable: 85000, tax: 15300, total: 100300, status: "sent" },
  { id: 2, docNo: "INV-0002", date: "2026-06-02", party: "Green Farm Retail", taxable: 150000, tax: 27000, total: 177000, status: "sent" },
];

export const PURCHASE_REGISTER_SEED: RegisterRow[] = [
  { id: 1, docNo: "PINV-0001", date: "2026-06-01", party: "Agro Chem Distributors", taxable: 100000, tax: 18000, total: 118000, status: "approved" },
];

export const GST_SUMMARY_SEED: GstSummaryRow[] = [
  { period: "Apr 2026", outputGst: 42300, inputGst: 28600, netPayable: 13700 },
  { period: "May 2026", outputGst: 55800, inputGst: 31200, netPayable: 24600 },
  { period: "Jun 2026", outputGst: 27100, inputGst: 19400, netPayable: 7700 },
];

export const BRANCH_REPORT_SEED: BranchReportRow[] = [
  { branch: "Head Office", revenue: 1250000, expenses: 890000, receivables: 320000, payables: 185000 },
  { branch: "Mumbai", revenue: 980000, expenses: 720000, receivables: 210000, payables: 142000 },
  { branch: "Pune", revenue: 640000, expenses: 510000, receivables: 98000, payables: 76000 },
];

export function loadFundTransfers() {
  return seed(FT_KEY, FUND_TRANSFER_SEED);
}
export function loadReceiptAllocations() {
  return seed(RA_KEY, RECEIPT_ALLOCATION_SEED);
}
export function loadPaymentRuns() {
  return seed(PR_KEY, PAYMENT_RUN_SEED);
}
export function loadInventoryAdjustments() {
  return seed(IA_KEY, INVENTORY_ADJ_SEED);
}
export function loadCollectionRecords() {
  return seed(COL_KEY, COLLECTION_SEED);
}
