import type { CfuListRecord } from "@/services/cfu-list.service";

export type CfuStatus = "active" | "inactive";

export interface CfuRecord {
  id: number;
  cfuUuid: string;
  cfuName: string;
  description: string;
  status: CfuStatus;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CfuForm {
  cfuName: string;
  description: string;
}

export const DEFAULT_CFU_FORM: CfuForm = {
  cfuName: "",
  description: "",
};

export function toCfuRecord(item: CfuListRecord): CfuRecord {
  return {
    id: item.id,
    cfuUuid: item.cfuUuid,
    cfuName: item.cfuName,
    description: item.description,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdAt: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedAt: item.updatedAt,
  };
}

export function cfuToForm(record: CfuRecord): CfuForm {
  return {
    cfuName: record.cfuName,
    description: record.description,
  };
}

export function validateCfuApiForm(form: CfuForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.cfuName.trim()) errors.cfuName = "CFU name is required.";
  return errors;
}

/** @deprecated Used by products module until CFU dropdown API is wired there */
export const CFU_STORAGE_KEY = "ds_master_cfu_v2";

/** @deprecated Local seed fallback for products dropdown */
export const CFU_SEED: CfuRecord[] = [
  {
    id: 1,
    cfuUuid: "",
    cfuName: "1×10⁸ cells/ml",
    description: "Standard microbial count for liquid formulations",
    status: "active",
    createdBy: "Admin User",
    updatedBy: "Admin User",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
  {
    id: 2,
    cfuUuid: "",
    cfuName: "1×10⁹ cells/g",
    description: "High density CFU for solid formulations",
    status: "active",
    createdBy: "Admin User",
    updatedBy: "Admin User",
    createdAt: "2024-02-01",
    updatedAt: "2024-02-01",
  },
  {
    id: 3,
    cfuUuid: "",
    cfuName: "5×10⁷ cells/ml",
    description: "Lower concentration variant",
    status: "inactive",
    createdBy: "Admin User",
    updatedBy: "Admin User",
    createdAt: "2024-03-15",
    updatedAt: "2024-06-01",
  },
];
