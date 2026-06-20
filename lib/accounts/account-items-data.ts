import type { MasterStatus } from "@/lib/masters/common";

export type ValuationMethod = "weighted_average" | "fifo" | "manual";

export interface AccountItem {
  id: number;
  itemName: string;
  sku: string;
  category: string;
  hsnCode: string;
  gstRate: string;
  unit: string;
  openingQty: number;
  openingRate: number;
  openingValue: number;
  valuationMethod: ValuationMethod;
  defaultSalesLedger: string;
  defaultPurchaseLedger: string;
  status: MasterStatus;
}

const STORAGE_KEY = "ds_accounts_items_v1";

const SEED: AccountItem[] = [
  {
    id: 1,
    itemName: "Urea 50kg",
    sku: "FER-UR-001",
    category: "Fertilizers",
    hsnCode: "31021000",
    gstRate: "5%",
    unit: "BAG",
    openingQty: 500,
    openingRate: 280,
    openingValue: 140000,
    valuationMethod: "weighted_average",
    defaultSalesLedger: "Sales — Fertilizers",
    defaultPurchaseLedger: "Purchase — Fertilizers",
    status: "active",
  },
  {
    id: 2,
    itemName: "NPK Fertilizer",
    sku: "FER-NPK-002",
    category: "Fertilizers",
    hsnCode: "31052000",
    gstRate: "5%",
    unit: "BAG",
    openingQty: 320,
    openingRate: 420,
    openingValue: 134400,
    valuationMethod: "fifo",
    defaultSalesLedger: "Sales — Fertilizers",
    defaultPurchaseLedger: "Purchase — Fertilizers",
    status: "active",
  },
  {
    id: 3,
    itemName: "Pesticide 1L",
    sku: "PEST-001L",
    category: "Pesticides",
    hsnCode: "38089340",
    gstRate: "18%",
    unit: "LTR",
    openingQty: 200,
    openingRate: 185,
    openingValue: 37000,
    valuationMethod: "manual",
    defaultSalesLedger: "Sales — Seeds",
    defaultPurchaseLedger: "Purchase — Seeds",
    status: "active",
  },
];

export function loadAccountItems(): AccountItem[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as AccountItem[];
  } catch {
    return SEED;
  }
}

export function saveAccountItems(list: AccountItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getAccountItemById(id: number): AccountItem | undefined {
  return loadAccountItems().find((i) => i.id === id);
}

export function findAccountItemBySku(sku: string): AccountItem | undefined {
  return loadAccountItems().find((i) => i.sku === sku);
}

export function nextAccountItemId(list: AccountItem[]): number {
  return list.length ? Math.max(...list.map((i) => i.id)) + 1 : 1;
}

export const VALUATION_METHOD_OPTIONS: { value: ValuationMethod; label: string }[] = [
  { value: "weighted_average", label: "Weighted Average" },
  { value: "fifo", label: "FIFO" },
  { value: "manual", label: "Manual" },
];
