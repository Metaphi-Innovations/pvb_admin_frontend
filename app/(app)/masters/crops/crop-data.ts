import type { CropListRecord } from "@/services/crop-list.service";

export type CropStatus = "active" | "inactive";

export interface CropRecord {
  id: number;
  cropUuid: string;
  cropName: string;
  fieldType: string;
  category: string;
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
  category: string;
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

export const CATEGORIES = [
  "Fibre",
  "Rabi Cereal",
  "Kharif Cereal",
  "Seed Spice",
  "Sugar",
  "Oil Seed",
  "Kharif Oil Seed",
  "Kharif Pulse",
  "Rabi Pulse",
  "Rabi Oil Seed",
  "Bulb Crop",
  "High Altitude Cereal",
  "Vegetable Pulse",
  "Tropical Fruit",
  "Industrial Oil Seed",
  "Commercial Plantation",
];

export const DEFAULT_CROP_FORM: CropForm = {
  cropName: "",
  fieldType: "",
  category: "",
  season: [],
};

export function toCropRecord(item: CropListRecord): CropRecord {
  return {
    id: item.id,
    cropUuid: item.cropUuid,
    cropName: item.cropName,
    fieldType: item.fieldType,
    category: item.category,
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
    category: record.category,
    season: record.season,
  };
}

export function validateCropApiForm(form: CropForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.cropName.trim()) errors.cropName = "Crop name is required";
  if (!form.fieldType) errors.fieldType = "Field type is required";
  if (!form.category) errors.category = "Category is required";
  if (!form.season || form.season.length === 0) {
    errors.season = "At least one season must be selected";
  }
  return errors;
}
