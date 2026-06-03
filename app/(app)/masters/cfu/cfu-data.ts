import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const CFU_STORAGE_KEY = "ds_master_cfu_v1";

export interface CfuRecord extends BaseMasterRecord {
  cfuName: string;
  cfuCode: string;
  description: string;
}

export interface CfuForm {
  cfuName: string;
  cfuCode: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_CFU_FORM: CfuForm = {
  cfuName: "",
  cfuCode: "",
  description: "",
  status: "active",
};

export const CFU_SEED: CfuRecord[] = [
  { id: 1, cfuName: "1x10^8 cells/ml", cfuCode: "CFU-001", description: "Standard microbial count", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-10", updatedAt: "2024-01-10" },
  { id: 2, cfuName: "1x10^9 cells/g", cfuCode: "CFU-002", description: "High density CFU", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-02-01", updatedAt: "2024-02-01" },
];

export function cfuToForm(r: CfuRecord): CfuForm {
  return { cfuName: r.cfuName, cfuCode: r.cfuCode, description: r.description, status: r.status };
}

export function formToCfu(form: CfuForm, id: number, existing?: CfuRecord): CfuRecord {
  const now = masterToday();
  return {
    id,
    cfuName: form.cfuName.trim(),
    cfuCode: form.cfuCode.trim(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function validateCfuForm(form: CfuForm): string | null {
  if (!form.cfuName.trim()) return "CFU name is required.";
  if (!form.cfuCode.trim()) return "CFU code is required.";
  return null;
}
