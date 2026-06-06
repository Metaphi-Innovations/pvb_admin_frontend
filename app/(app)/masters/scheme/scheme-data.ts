import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export type DiscountType = "Percentage" | "Flat";

export const SCHEME_STORAGE_KEY = "ds_master_scheme_v1";

export interface SchemeRecord extends BaseMasterRecord {
  schemeName: string;
  schemeCode: string;
  discountType: DiscountType;
  percentage?: number;
  flatDiscountAmount?: number;
  startDate?: string;
  endDate?: string;
  description: string;
}

export interface SchemeForm {
  schemeName: string;
  schemeCode: string;
  discountType: DiscountType;
  percentage: string;
  flatDiscountAmount: string;
  startDate: string;
  endDate: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_SCHEME_FORM: SchemeForm = {
  schemeName: "",
  schemeCode: "",
  discountType: "Percentage",
  percentage: "",
  flatDiscountAmount: "",
  startDate: "",
  endDate: "",
  description: "",
  status: "active",
};

export const SCHEME_SEED: SchemeRecord[] = [
  {
    id: 1,
    schemeName: "Monsoon Discount 2025",
    schemeCode: "SCH-001",
    discountType: "Percentage",
    percentage: 10,
    startDate: "2025-06-01",
    endDate: "2025-09-30",
    description: "Seasonal discount on select SKUs",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2025-05-01",
    updatedAt: "2025-05-01",
  },
  {
    id: 2,
    schemeName: "Festive Flat Offer",
    schemeCode: "SCH-002",
    discountType: "Flat",
    flatDiscountAmount: 500,
    startDate: "2025-04-01",
    endDate: "2025-12-31",
    description: "Flat offer for distributors",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2025-04-01",
    updatedAt: "2025-04-01",
  },
];

export function schemeToForm(r: SchemeRecord): SchemeForm {
  return {
    schemeName: r.schemeName,
    schemeCode: r.schemeCode,
    discountType: r.discountType,
    percentage: r.percentage !== undefined ? String(r.percentage) : "",
    flatDiscountAmount: r.flatDiscountAmount !== undefined ? String(r.flatDiscountAmount) : "",
    startDate: r.startDate ?? "",
    endDate: r.endDate ?? "",
    description: r.description,
    status: r.status,
  };
}

export function formToScheme(form: SchemeForm, id: number, existing?: SchemeRecord): SchemeRecord {
  const now = masterToday();
  const isPerc = form.discountType === "Percentage";
  return {
    id,
    schemeName: form.schemeName.trim(),
    schemeCode: form.schemeCode.trim(),
    discountType: form.discountType,
    percentage: isPerc && form.percentage ? parseFloat(form.percentage) : undefined,
    flatDiscountAmount: !isPerc && form.flatDiscountAmount ? parseFloat(form.flatDiscountAmount) : undefined,
    startDate: form.startDate ? form.startDate : undefined,
    endDate: form.endDate ? form.endDate : undefined,
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function validateSchemeForm(form: SchemeForm): string | null {
  if (!form.schemeName.trim()) return "Scheme name is required.";
  if (!form.schemeCode.trim()) return "Scheme code is required.";
  if (form.discountType === "Percentage") {
    if (!form.percentage || isNaN(parseFloat(form.percentage)) || parseFloat(form.percentage) <= 0) {
      return "Percentage is required and must be greater than 0.";
    }
  } else if (form.discountType === "Flat") {
    if (!form.flatDiscountAmount || isNaN(parseFloat(form.flatDiscountAmount)) || parseFloat(form.flatDiscountAmount) <= 0) {
      return "Flat Discount Amount is required and must be greater than 0.";
    }
  }
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    return "End date must be after start date.";
  }
  return null;
}
