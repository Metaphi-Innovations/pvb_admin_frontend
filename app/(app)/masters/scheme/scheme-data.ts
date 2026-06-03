import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export type SchemeType = "discount" | "quantity_offer" | "cashback" | "other";

export const SCHEME_TYPE_OPTIONS: { value: SchemeType; label: string }[] = [
  { value: "discount", label: "Discount" },
  { value: "quantity_offer", label: "Quantity Offer" },
  { value: "cashback", label: "Cashback" },
  { value: "other", label: "Other" },
];

export const SCHEME_STORAGE_KEY = "ds_master_scheme_v1";

export interface SchemeRecord extends BaseMasterRecord {
  schemeName: string;
  schemeCode: string;
  schemeType: SchemeType;
  startDate: string;
  endDate: string;
  description: string;
}

export interface SchemeForm {
  schemeName: string;
  schemeCode: string;
  schemeType: SchemeType;
  startDate: string;
  endDate: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_SCHEME_FORM: SchemeForm = {
  schemeName: "",
  schemeCode: "",
  schemeType: "discount",
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
    schemeType: "discount",
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
    schemeName: "Buy 10 Get 1",
    schemeCode: "SCH-002",
    schemeType: "quantity_offer",
    startDate: "2025-04-01",
    endDate: "2025-12-31",
    description: "Volume offer for distributors",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2025-04-01",
    updatedAt: "2025-04-01",
  },
];

export function schemeTypeLabel(t: SchemeType): string {
  return SCHEME_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function schemeToForm(r: SchemeRecord): SchemeForm {
  return {
    schemeName: r.schemeName,
    schemeCode: r.schemeCode,
    schemeType: r.schemeType,
    startDate: r.startDate,
    endDate: r.endDate,
    description: r.description,
    status: r.status,
  };
}

export function formToScheme(form: SchemeForm, id: number, existing?: SchemeRecord): SchemeRecord {
  const now = masterToday();
  return {
    id,
    schemeName: form.schemeName.trim(),
    schemeCode: form.schemeCode.trim(),
    schemeType: form.schemeType,
    startDate: form.startDate,
    endDate: form.endDate,
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
  if (!form.startDate) return "Start date is required.";
  if (!form.endDate) return "End date is required.";
  if (form.startDate > form.endDate) return "End date must be after start date.";
  return null;
}
