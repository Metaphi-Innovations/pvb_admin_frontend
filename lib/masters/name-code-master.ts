import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "./common";

export interface NameCodeMasterRecord extends BaseMasterRecord {
  name: string;
  code: string;
  description: string;
}

export interface NameCodeForm {
  name: string;
  code: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_NAME_CODE_FORM: NameCodeForm = {
  name: "",
  code: "",
  description: "",
  status: "active",
};

export function nameCodeToForm(r: NameCodeMasterRecord): NameCodeForm {
  return { name: r.name, code: r.code, description: r.description, status: r.status };
}

export function formToNameCode(
  form: NameCodeForm,
  id: number,
  nameKey: keyof NameCodeMasterRecord,
  codeKey: keyof NameCodeMasterRecord,
  existing?: NameCodeMasterRecord,
): NameCodeMasterRecord {
  const now = masterToday();
  return {
    id,
    name: form.name.trim(),
    code: form.code.trim(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    [nameKey]: form.name.trim(),
    [codeKey]: form.code.trim(),
  } as NameCodeMasterRecord;
}

export function validateNameCodeForm(
  form: NameCodeForm,
  nameLabel: string,
  codeLabel: string,
): string | null {
  if (!form.name.trim()) return `${nameLabel} is required.`;
  if (!form.code.trim()) return `${codeLabel} is required.`;
  return null;
}

export function makeNameCodeSeed(
  items: { id: number; name: string; code: string; description: string }[],
): NameCodeMasterRecord[] {
  return items.map((i) => ({
    ...i,
    status: "active" as const,
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  }));
}
