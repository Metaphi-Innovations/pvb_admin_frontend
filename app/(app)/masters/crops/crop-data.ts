"use client";

import { loadCategories } from "../categories/category-data";

export type CropStatus = "active" | "inactive";

export interface Crop {
  id: number;
  cropName: string;
  fieldType: string;
  categoryName: string;
  season: string[];
  status: CropStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export const STORAGE_KEY = "pvb_crops_v1";

export const FIELD_TYPES = [
  "Fruit",
  "Vegetable",
  "Exotic vegetables",
  "Oil seeds",
  "Cereal",
  "Cash crop",
  "Spice",
  "Plantation",
  "Floriculture"
];

export const SEASONS = [
  "Summer",
  "Year round",
  "Winter",
  "Autumn",
  "Spring",
  "Kharif",
  "Rabi"
];

const SEED: Crop[] = [
  {
    id: 1,
    cropName: "Mango",
    fieldType: "Fruit",
    categoryName: "Seeds",
    season: ["Summer"],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-19",
    updatedBy: "Admin",
    updatedDate: "2026-06-19",
  },
  {
    id: 2,
    cropName: "Tomato",
    fieldType: "Vegetable",
    categoryName: "Seeds",
    season: ["Year round"],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-19",
    updatedBy: "Admin",
    updatedDate: "2026-06-19",
  },
];

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(items: Partial<Crop>[]): Crop[] {
  return items.map((item, idx) => ({
    id: item.id ?? idx + 1,
    cropName: item.cropName ?? "",
    fieldType: item.fieldType ?? "Vegetable",
    categoryName: item.categoryName ?? "",
    season: Array.isArray(item.season) ? item.season : [],
    status: item.status === "inactive" ? "inactive" : "active",
    createdBy: item.createdBy ?? "Admin",
    createdDate: item.createdDate ?? todayStr(),
    updatedBy: item.updatedBy ?? "Admin",
    updatedDate: item.updatedDate ?? todayStr(),
  }));
}

export function loadCrops(): Crop[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Partial<Crop>[];
    return normalize(parsed);
  } catch {
    return SEED;
  }
}

export function saveCrops(items: Crop[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function nextCropId(items: Crop[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export function getCategoryOptions() {
  return loadCategories()
    .filter((c) => c.status === "active")
    .map((c) => ({
      label: c.categoryName,
      value: c.categoryName,
    }));
}
