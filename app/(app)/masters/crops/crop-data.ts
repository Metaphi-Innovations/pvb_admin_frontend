import type { CropListRecord } from "@/services/crop-list.service";

export type CropStatus = "active" | "inactive";

export interface CropRecord {
  id: number;
  cropUuid: string;
  cropName: string;
  fieldType: string;
  categoryId: string;
  categoryName: string;
  season: string[];
  description: string;
  status: CropStatus;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CropForm {
  cropName: string;
  fieldType: string;
  categoryId: string;
  season: string[];
}

export const FIELD_TYPES = [
  "Fruit",
  "Vegetable",
  "Exotic vegetables",
  "Oil seeds",
  "Cereal",
  "Cash crop",
  "Spice",
  "Plantation",
  "Floriculture",
];

export const SEASONS = [
  "Summer",
  "Year round",
  "Winter",
  "Autumn",
  "Spring",
  "Kharif",
  "Rabi",
];

export const DEFAULT_CROP_FORM: CropForm = {
  cropName: "",
  fieldType: "",
  categoryId: "",
  season: [],
};

export function toCropRecord(item: CropListRecord): CropRecord {
  return {
    id: item.id,
    cropUuid: item.cropUuid,
    cropName: item.cropName,
    fieldType: item.fieldType,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    season: item.season,
    description: item.description,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdAt: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedAt: item.updatedAt,
  };
}

export function cropToForm(record: CropRecord): CropForm {
  return {
    cropName: record.cropName,
    fieldType: record.fieldType,
    categoryId: record.categoryId,
    season: record.season,
  };
}

export function validateCropApiForm(form: CropForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.cropName.trim()) errors.cropName = "Crop name is required";
  if (!form.fieldType) errors.fieldType = "Field type is required";
  if (!form.categoryId) errors.categoryId = "Category is required";
  if (!form.season || form.season.length === 0) {
    errors.season = "At least one season must be selected";
  }
  return errors;
}
