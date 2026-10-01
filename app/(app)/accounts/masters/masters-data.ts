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

function formatFyLabel(fyStartYear: number): string {
  const endShort = String((fyStartYear + 1) % 100).padStart(2, "0");
  return `FY ${fyStartYear}-${endShort}`;
}

function buildFinancialYearSeed(ref = new Date()): FinancialYear[] {
  const month = ref.getMonth();
  const year = ref.getFullYear();
  const currentFyStartYear = month >= 3 ? year : year - 1;
  const prevFyStartYear = currentFyStartYear - 1;

  return [
    {
      id: 1,
      name: formatFyLabel(currentFyStartYear),
      startDate: `${currentFyStartYear}-04-01`,
      endDate: `${currentFyStartYear + 1}-03-31`,
      lockDate: `${currentFyStartYear + 1}-03-15`,
      status: "active",
      createdBy: "System",
      updatedBy: "Admin",
    },
    {
      id: 2,
      name: formatFyLabel(prevFyStartYear),
      startDate: `${prevFyStartYear}-04-01`,
      endDate: `${currentFyStartYear}-03-31`,
      lockDate: `${currentFyStartYear}-03-31`,
      status: "inactive",
      createdBy: "System",
      updatedBy: "Admin",
    },
  ];
}

const FY_SEED: FinancialYear[] = buildFinancialYearSeed();

/** Ensure the active FY contains today's date (fixes stale localStorage FY records). */
export function ensureFinancialYearsCurrent(ref = new Date()): void {
  if (typeof window === "undefined") return;

  const today = ref.toISOString().slice(0, 10);
  const currentSeed = buildFinancialYearSeed(ref);
  const currentFyTemplate = currentSeed[0];
  let stored = getOrSeed(FY_KEY, currentSeed) as FinancialYear[];

  const activeContainsToday = stored.some(
    (fy) => fy.status === "active" && today >= fy.startDate && today <= fy.endDate,
  );

  if (activeContainsToday) return;

  const existingCurrent = stored.find((fy) => fy.startDate === currentFyTemplate.startDate);
  if (existingCurrent) {
    stored = stored.map((fy) => ({
      ...fy,
      status: (fy.id === existingCurrent.id ? "active" : "inactive") as FinancialYear["status"],
      updatedBy: ACCOUNTS_CURRENT_USER,
    }));
  } else {
    const nextId = stored.length > 0 ? Math.max(...stored.map((fy) => fy.id)) + 1 : 1;
    stored = [
      { ...currentFyTemplate, id: nextId, status: "active" as const },
      ...stored.map((fy) => ({
        ...fy,
        status: "inactive" as const,
        updatedBy: ACCOUNTS_CURRENT_USER,
      })),
    ];
  }

  save(FY_KEY, stored);
}

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
  ensureFinancialYearsCurrent();
  return getOrSeed(FY_KEY, buildFinancialYearSeed()) as FinancialYear[];
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
