import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

export interface FinancialYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  lockDate: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
}

export type VoucherTypeCode =
  | "journal"
  | "payment"
  | "receipt"
  | "contra"
  | "sales"
  | "purchase"
  | "debit_note"
  | "credit_note";

export interface VoucherTypeMaster {
  id: number;
  code: VoucherTypeCode;
  name: string;
  prefix: string;
  numberingType: "auto" | "manual";
  startingNumber: number;
  status: "active" | "inactive";
  isSystem: boolean;
}

const FY_KEY = "ds_accounts_fy";
const VT_KEY = "ds_accounts_voucher_types";

const FY_SEED: FinancialYear[] = [
  {
    id: 1,
    name: "FY 2025-26",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    lockDate: "2026-03-15",
    status: "active",
    createdBy: "System",
    updatedBy: "Admin",
  },
  {
    id: 2,
    name: "FY 2024-25",
    startDate: "2024-04-01",
    endDate: "2025-03-31",
    lockDate: "2025-03-31",
    status: "inactive",
    createdBy: "System",
    updatedBy: "Admin",
  },
];

const VT_SEED: VoucherTypeMaster[] = [
  { id: 1, code: "journal", name: "Journal", prefix: "JRN", numberingType: "auto", startingNumber: 1, status: "active", isSystem: true },
  { id: 2, code: "payment", name: "Payment", prefix: "PAY", numberingType: "auto", startingNumber: 1, status: "active", isSystem: true },
  { id: 3, code: "receipt", name: "Receipt", prefix: "REC", numberingType: "auto", startingNumber: 1, status: "active", isSystem: true },
  { id: 4, code: "contra", name: "Contra", prefix: "CTR", numberingType: "auto", startingNumber: 1, status: "active", isSystem: true },
  { id: 5, code: "sales", name: "Sales", prefix: "SAL", numberingType: "auto", startingNumber: 1, status: "active", isSystem: true },
  { id: 6, code: "purchase", name: "Purchase", prefix: "PUR", numberingType: "auto", startingNumber: 1, status: "active", isSystem: true },
  { id: 7, code: "debit_note", name: "Debit Note", prefix: "DBN", numberingType: "auto", startingNumber: 1, status: "active", isSystem: true },
  { id: 8, code: "credit_note", name: "Credit Note", prefix: "CRN", numberingType: "auto", startingNumber: 1, status: "active", isSystem: true },
];

function getOrSeed<T>(key: string, seed: T[] | T): T[] | T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[] | T;
  } catch {
    return seed;
  }
}

function save<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadFinancialYears(): FinancialYear[] {
  return getOrSeed(FY_KEY, FY_SEED) as FinancialYear[];
}

export function saveFinancialYears(list: FinancialYear[]) {
  save(FY_KEY, list);
}

export function setActiveFinancialYear(id: number) {
  const list = loadFinancialYears().map((fy) => ({
    ...fy,
    status: (fy.id === id ? "active" : "inactive") as FinancialYear["status"],
    updatedBy: ACCOUNTS_CURRENT_USER,
  }));
  saveFinancialYears(list);
}

export function loadVoucherTypes(): VoucherTypeMaster[] {
  const stored = getOrSeed(VT_KEY, VT_SEED) as VoucherTypeMaster[];
  return VT_SEED.map((sys) => {
    const ex = stored.find((s) => s.code === sys.code);
    return ex ? { ...sys, ...ex, isSystem: true, name: sys.name, code: sys.code } : sys;
  });
}

export function saveVoucherTypes(list: VoucherTypeMaster[]) {
  save(VT_KEY, list);
}

export function nextMasterId<T extends { id: number }>(list: T[]) {
  return list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;
}

export const VOUCHER_TYPE_LABELS: Record<VoucherTypeCode, string> = {
  journal: "Journal",
  payment: "Payment",
  receipt: "Receipt",
  contra: "Contra",
  sales: "Sales",
  purchase: "Purchase",
  debit_note: "Debit Note",
  credit_note: "Credit Note",
};
