"use client";

/**
 * TCS Master — section definitions (source of truth for COA TCS Payable children).
 * Chart of Accounts only projects active sections; it does not store them separately.
 */

import {
  MASTER_CURRENT_USER,
  masterToday,
  type MasterStatus,
} from "@/lib/masters/common";

export interface TCSMaster {
  id: number;
  sectionCode: string;
  sectionName: string;
  /** Numeric rate (e.g. "1", "0.1") or "As per slab" */
  tcsRate: string;
  description?: string;
  status: MasterStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

const STORAGE_KEY = "ds_tcs_masters_v1";

export const TCS_SEED: TCSMaster[] = [
  {
    id: 1,
    sectionCode: "206C(1H)",
    sectionName: "Sale of Goods",
    tcsRate: "0.1",
    description: "TCS on sale of goods exceeding threshold",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-01-10",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-01-10",
  },
  {
    id: 2,
    sectionCode: "206C(1F)",
    sectionName: "Motor Vehicle",
    tcsRate: "1",
    description: "TCS on sale of motor vehicle",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-01-12",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-01-12",
  },
  {
    id: 3,
    sectionCode: "206C",
    sectionName: "Scrap / Timber",
    tcsRate: "1",
    description: "TCS on scrap and timber",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-01-15",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-01-15",
  },
];

export function loadTCSMasters(): TCSMaster[] {
  if (typeof window === "undefined") return TCS_SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return TCS_SEED;
    const parsed = JSON.parse(raw) as TCSMaster[];
    return Array.isArray(parsed) ? parsed : TCS_SEED;
  } catch {
    return TCS_SEED;
  }
}

export function saveTCSMasters(data: TCSMaster[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("ds_tcs_master_changed"));
}

export function getTcsSectionCode(record: TCSMaster): string {
  return (record.sectionCode ?? "").trim();
}

export function getActiveTCSMasters(): TCSMaster[] {
  return loadTCSMasters().filter((t) => t.status === "active");
}
