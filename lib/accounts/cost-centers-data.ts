import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { nextId } from "@/app/(app)/accounts/data";

export interface CostCenter {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
}

const STORAGE_KEY = "ds_accounts_cost_centers_v1";

const SEED: CostCenter[] = [
  { id: 1, code: "CC-HO", name: "Head Office", parentId: null, status: "active", createdBy: "System", updatedBy: "System" },
  { id: 2, code: "CC-SALES", name: "Sales Division", parentId: 1, status: "active", createdBy: "System", updatedBy: "System" },
  { id: 3, code: "CC-OPS", name: "Operations", parentId: 1, status: "active", createdBy: "System", updatedBy: "System" },
];

export function loadCostCenters(): CostCenter[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as CostCenter[];
  } catch {
    return SEED;
  }
}

export function saveCostCenters(list: CostCenter[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addCostCenter(input: { code: string; name: string; parentId?: number | null }): CostCenter {
  const list = loadCostCenters();
  const row: CostCenter = {
    id: nextId(list),
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    parentId: input.parentId ?? null,
    status: "active",
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  list.push(row);
  saveCostCenters(list);
  return row;
}
