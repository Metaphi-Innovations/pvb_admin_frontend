import { CURRENT_USER } from "@/lib/hr/config";

export type PolicyStatus = "active" | "inactive";

export interface PolicyBase {
  id: number;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export function policyToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadPolicyList<T>(storageKey: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

/**
 * Like loadPolicyList, but if storage already holds an empty array and seed has
 * rows, write the seed (demo-friendly recovery after EMPTY_SEED first visits).
 * Never overwrites non-empty user configurations.
 */
export function loadPolicyListFillEmpty<T>(storageKey: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      return structuredClone(seed);
    }
    const parsed = JSON.parse(raw) as T[];
    if (Array.isArray(parsed) && parsed.length === 0 && seed.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      return structuredClone(seed);
    }
    return parsed;
  } catch {
    return structuredClone(seed);
  }
}

export function savePolicyList<T>(storageKey: string, list: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(list));
}

export function nextPolicyId(list: { id: number }[]): number {
  return list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
}

export function stampNew<T extends PolicyBase>(partial: Omit<T, keyof PolicyBase> & Partial<PolicyBase>, id: number): T {
  const today = policyToday();
  return {
    ...partial,
    id,
    status: partial.status ?? "active",
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  } as T;
}

export function stampUpdate<T extends PolicyBase>(record: T): T {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}
