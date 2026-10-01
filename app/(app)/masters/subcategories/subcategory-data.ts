"use client";

import { loadCategories, type Category } from "../categories/category-data";

export type SubCategoryStatus = "active" | "inactive";

export interface SubCategory {
  id: number;
  subCategoryCode: string;
  subCategoryName: string;
  categoryName: string;
  description: string;
  status: SubCategoryStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

const STORAGE_KEY = "pvb_subcategories_v1";

const seedCategories = (): Category[] => loadCategories();

const SEED: SubCategory[] = [
  {
    id: 1,
    subCategoryCode: "SUB-001",
    subCategoryName: "Hybrid Seeds",
    categoryName: "Seeds",
    description: "High-yield hybrid crop varieties",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-03",
    updatedBy: "Admin",
    updatedDate: "2026-06-03",
  },
  {
    id: 2,
    subCategoryCode: "SUB-002",
    subCategoryName: "Water Soluble Fertilizers",
    categoryName: "Fertilizers",
    description: "Fast-acting soluble fertilizer blends",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-03",
    updatedBy: "Admin",
    updatedDate: "2026-06-03",
  },
  {
    id: 3,
    subCategoryCode: "SUB-003",
    subCategoryName: "Fungicides",
    categoryName: "Pesticides",
    description: "Disease control fungicide products",
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

function normalize(items: Partial<SubCategory>[]): SubCategory[] {
  return items.map((item, idx) => ({
    id: item.id ?? idx + 1,
    subCategoryCode: item.subCategoryCode ?? `SUB-${String(idx + 1).padStart(3, "0")}`,
    subCategoryName: item.subCategoryName ?? "",
    categoryName: item.categoryName ?? "",
    description: item.description ?? "",
    status: item.status === "inactive" ? "inactive" : "active",
    createdBy: item.createdBy ?? "Admin",
    createdDate: item.createdDate ?? todayStr(),
    updatedBy: item.updatedBy ?? "Admin",
    updatedDate: item.updatedDate ?? todayStr(),
  }));
}

export function loadSubCategories(): SubCategory[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Partial<SubCategory>[];
    return normalize(parsed);
  } catch {
    return SEED;
  }
}

export function saveSubCategories(items: SubCategory[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function nextSubCategoryId(items: SubCategory[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export function generateSubCategoryCode(items: SubCategory[]) {
  return `SUB-${String(items.length + 1).padStart(3, "0")}`;
}

export function getCategoryOptions() {
  return seedCategories().map((category) => ({
    label: category.categoryName,
    value: category.categoryName,
  }));
}

