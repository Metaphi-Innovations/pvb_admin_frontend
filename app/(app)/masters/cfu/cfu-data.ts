import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const CFU_STORAGE_KEY = "ds_master_cfu_v2";

export interface CfuRecord extends BaseMasterRecord {
  cfuName: string;
  description: string;
}

export interface CfuForm {
  cfuName: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_CFU_FORM: CfuForm = {
  cfuName: "",
  description: "",
  status: "active",
};

export const CFU_SEED: CfuRecord[] = [
  {
    id: 1,
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
    cfuName: "5×10⁷ cells/ml",
    description: "Lower concentration variant",
    status: "inactive",
    createdBy: "Admin User",
    updatedBy: "Admin User",
    createdAt: "2024-03-15",
    updatedAt: "2024-06-01",
  },
];

export function cfuToForm(r: CfuRecord): CfuForm {
  return {
    cfuName: r.cfuName,
    description: r.description,
    status: r.status,
  };
}

export function formToCfu(
  form: CfuForm,
  id: number,
  existing?: CfuRecord,
): CfuRecord {
  const now = masterToday();
  return {
    id,
    cfuName: form.cfuName.trim(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: "Admin User",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function findCfuDuplicate(
  name: string,
  records: CfuRecord[],
  excludeId?: number,
): CfuRecord | undefined {
  const normalized = name.trim().toLowerCase();
  return records.find(
    (r) => r.id !== excludeId && r.cfuName.trim().toLowerCase() === normalized,
  );
}

export function validateCfuForm(
  form: CfuForm,
  records: CfuRecord[],
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.cfuName.trim()) {
    errors.cfuName = "CFU name is required.";
  } else if (findCfuDuplicate(form.cfuName, records, excludeId)) {
    errors.cfuName = "CFU name must be unique.";
  }
  return errors;
}
