import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const CATEGORY_STORAGE_KEY = "ds_master_category_v2";

export interface CategoryRecord extends BaseMasterRecord {
  categoryName: string;
  categoryCode: string;
  description: string;
}

export interface CategoryForm {
  categoryName: string;
  categoryCode: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_CATEGORY_FORM: CategoryForm = {
  categoryName: "",
  categoryCode: "",
  description: "",
  status: "active",
};

export const CATEGORY_SEED: CategoryRecord[] = [
  {
    id: 1,
    categoryName: "Fertilizers",
    categoryCode: "CAT-001",
    description: "Chemical and organic fertilizers",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
  {
    id: 2,
    categoryName: "Pesticides",
    categoryCode: "CAT-002",
    description: "Crop protection products",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-01-12",
    updatedAt: "2024-01-12",
  },
  {
    id: 3,
    categoryName: "Seeds",
    categoryCode: "CAT-003",
    description: "Seeds and planting material",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-02-01",
    updatedAt: "2024-02-01",
  },
];

export function loadCategories(): CategoryRecord[] {
  if (typeof window === "undefined") return CATEGORY_SEED;
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(CATEGORY_SEED));
      return CATEGORY_SEED;
    }
    return JSON.parse(raw) as CategoryRecord[];
  } catch {
    return CATEGORY_SEED;
  }
}

export function categoryToForm(r: CategoryRecord): CategoryForm {
  return {
    categoryName: r.categoryName,
    categoryCode: r.categoryCode,
    description: r.description,
    status: r.status,
  };
}

export function formToCategory(form: CategoryForm, id: number, existing?: CategoryRecord): CategoryRecord {
  const now = masterToday();
  return {
    id,
    categoryName: form.categoryName.trim(),
    categoryCode: form.categoryCode.trim(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function validateCategoryForm(form: CategoryForm): string | null {
  if (!form.categoryName.trim()) return "Category name is required.";
  if (!form.categoryCode.trim()) return "Category code is required.";
  return null;
}
