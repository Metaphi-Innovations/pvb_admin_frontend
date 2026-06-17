import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const FORMULATION_STORAGE_KEY = "ds_master_formulation_v1";

export interface FormulationRecord extends BaseMasterRecord {
  formulationName: string;
  formulationCode: string;
  description: string;
}

export interface FormulationForm {
  formulationName: string;
  formulationCode: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_FORMULATION_FORM: FormulationForm = {
  formulationName: "",
  formulationCode: "",
  description: "",
  status: "active",
};

export const FORMULATION_SEED: FormulationRecord[] = [
  { id: 1, formulationName: "Liquid", formulationCode: "FORM-001", description: "Liquid formulation", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-10", updatedAt: "2024-01-10" },
  { id: 2, formulationName: "Granular", formulationCode: "FORM-002", description: "Granular formulation", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-15", updatedAt: "2024-01-15" },
];

export function formulationToForm(r: FormulationRecord): FormulationForm {
  return { formulationName: r.formulationName, formulationCode: r.formulationCode, description: r.description, status: r.status };
}

export function formToFormulation(form: FormulationForm, id: number, existing?: FormulationRecord): FormulationRecord {
  const now = masterToday();
  return {
    id,
    formulationName: form.formulationName.trim(),
    formulationCode: form.formulationCode.trim(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function validateFormulationForm(form: FormulationForm): string | null {
  if (!form.formulationName.trim()) return "Formulation name is required.";
  if (!form.formulationCode.trim()) return "Formulation code is required.";
  return null;
}
