"use client";

export type CategoryStatus = "active" | "inactive";

export interface Category {
  id: number;
  categoryCode: string;
  categoryName: string;
  description: string;
  status: CategoryStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

const STORAGE_KEY = "pvb_categories_v1";

const SEED: Category[] = [
  {
    id: 1,
    categoryCode: "CAT-001",
    categoryName: "Fertilizers",
    description: "Chemical and organic fertilizers",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-03",
    updatedBy: "Admin",
    updatedDate: "2026-06-03",
  },
  {
    id: 2,
    categoryCode: "CAT-002",
    categoryName: "Pesticides",
    description: "Insecticides, fungicides and herbicides",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-03",
    updatedBy: "Admin",
    updatedDate: "2026-06-03",
  },
  {
    id: 3,
    categoryCode: "CAT-003",
    categoryName: "Seeds",
    description: "Crop seeds and planting material",
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-06-03",
    updatedBy: "Admin",
    updatedDate: "2026-06-03",
  },
];

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(items: Partial<Category>[]): Category[] {
  return items.map((item, idx) => ({
    id: item.id ?? idx + 1,
    categoryCode: item.categoryCode ?? `CAT-${String(idx + 1).padStart(3, "0")}`,
    categoryName: item.categoryName ?? "",
    description: item.description ?? "",
    status: item.status === "inactive" ? "inactive" : "active",
    createdBy: item.createdBy ?? "Admin",
    createdDate: item.createdDate ?? todayStr(),
    updatedBy: item.updatedBy ?? "Admin",
    updatedDate: item.updatedDate ?? todayStr(),
  }));
}

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Partial<Category>[];
    return normalize(parsed);
  } catch {
    return SEED;
  }
}

export function saveCategories(items: Category[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function nextCategoryId(items: Category[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export function generateCategoryCode(items: Category[]) {
  return `CAT-${String(items.length + 1).padStart(3, "0")}`;
}

