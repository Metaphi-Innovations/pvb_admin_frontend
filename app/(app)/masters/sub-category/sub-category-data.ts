import { loadCategories } from "../category/category-data";
import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const SUB_CATEGORY_STORAGE_KEY = "ds_master_sub_category_v1";

export interface SubCategoryRecord extends BaseMasterRecord {
  categoryId: number;
  categoryName: string;
  subCategoryName: string;
  subCategoryCode: string;
  description: string;
}

export interface SubCategoryForm {
  categoryId: number | null;
  subCategoryName: string;
  subCategoryCode: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_SUB_CATEGORY_FORM: SubCategoryForm = {
  categoryId: null,
  subCategoryName: "",
  subCategoryCode: "",
  description: "",
  status: "active",
};

export const SUB_CATEGORY_SEED: SubCategoryRecord[] = [
  {
    id: 1,
    categoryId: 1,
    categoryName: "Fertilizers",
    subCategoryName: "NPK Fertilizers",
    subCategoryCode: "SCAT-001",
    description: "NPK blends",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
  },
  {
    id: 2,
    categoryId: 2,
    categoryName: "Pesticides",
    subCategoryName: "Herbicides",
    subCategoryCode: "SCAT-002",
    description: "Weed control",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-02-01",
    updatedAt: "2024-02-01",
  },
];

export function loadSubCategories(): SubCategoryRecord[] {
  if (typeof window === "undefined") return SUB_CATEGORY_SEED;
  try {
    const raw = localStorage.getItem(SUB_CATEGORY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SUB_CATEGORY_STORAGE_KEY, JSON.stringify(SUB_CATEGORY_SEED));
      return SUB_CATEGORY_SEED;
    }
    return JSON.parse(raw) as SubCategoryRecord[];
  } catch {
    return SUB_CATEGORY_SEED;
  }
}

export function getActiveCategoriesForSelect() {
  return loadCategories().filter((c) => c.status === "active");
}

export function subCategoryToForm(r: SubCategoryRecord): SubCategoryForm {
  return {
    categoryId: r.categoryId,
    subCategoryName: r.subCategoryName,
    subCategoryCode: r.subCategoryCode,
    description: r.description,
    status: r.status,
  };
}

export function formToSubCategory(
  form: SubCategoryForm,
  id: number,
  existing?: SubCategoryRecord,
): SubCategoryRecord {
  const cat = form.categoryId ? loadCategories().find((c) => c.id === form.categoryId) : undefined;
  const now = masterToday();
  return {
    id,
    categoryId: form.categoryId!,
    categoryName: cat?.categoryName ?? "",
    subCategoryName: form.subCategoryName.trim(),
    subCategoryCode: form.subCategoryCode.trim(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function validateSubCategoryForm(form: SubCategoryForm): string | null {
  if (!form.categoryId) return "Category is required.";
  if (!form.subCategoryName.trim()) return "Sub category name is required.";
  if (!form.subCategoryCode.trim()) return "Sub category code is required.";
  return null;
}
