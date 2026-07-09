import type { BrandListRecord } from "@/services/brand-list.service";

export type BrandStatus = "active" | "inactive";

export interface BrandRecord {
  id: number;
  brandUuid: string;
  brandName: string;
  brandType: string;
  remark: string;
  status: BrandStatus;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface BrandForm {
  brandName: string;
  brandType: string;
  remark: string;
}

export const DEFAULT_BRAND_TYPES = [
  "Pesticide",
  "Fertilizer",
  "Bio Solution",
  "In-house Bio Solution",
  "Seed",
  "Herbicide",
  "Fungicide",
];

export const DEFAULT_BRAND_FORM: BrandForm = {
  brandName: "",
  brandType: "",
  remark: "",
};

export function toBrandRecord(item: BrandListRecord): BrandRecord {
  return {
    id: item.id,
    brandUuid: item.brandUuid,
    brandName: item.brandName,
    brandType: item.brandType,
    remark: item.remark,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdAt: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedAt: item.updatedAt,
  };
}

export function brandToForm(record: BrandRecord): BrandForm {
  return {
    brandName: record.brandName,
    brandType: record.brandType,
    remark: record.remark,
  };
}

export function validateBrandApiForm(form: BrandForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.brandName.trim()) errors.brandName = "Brand name is required";
  if (!form.brandType.trim()) errors.brandType = "Brand type is required";
  return errors;
}
