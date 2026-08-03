"use client";

export type CategoryStatus = "active" | "inactive";

export interface Category {
  id: number;
  categoryId: string;
  categoryName: string;
  description: string;
  status: CategoryStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

const STORAGE_KEY = "pvb_categories_v2";

const SEED: Category[] = [
  {
    id: 1,
    categoryId: "",
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
    categoryId: "",
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
    categoryId: "",
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
    categoryId: item.categoryId ?? "",
    categoryName: item.categoryName ?? "",
    description: item.description ?? "",
    status: item.status === "inactive" ? "inactive" : "active",
    createdBy: item.createdBy ?? "Admin",
    createdDate: item.createdDate ?? todayStr(),
    updatedBy: item.updatedBy ?? "Admin",
    updatedDate: item.updatedDate ?? todayStr(),
  }));
}

function readStored(): Partial<Category>[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<Category>[];
    const legacy = localStorage.getItem("pvb_categories_v1");
    if (legacy) return JSON.parse(legacy) as Partial<Category>[];
    return null;
  } catch {
    return null;
  }
}

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return SEED;
  const parsed = readStored();
  if (!parsed) return SEED;
  return normalize(parsed);
}

export function saveCategories(items: Category[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function nextCategoryId(items: Category[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}
