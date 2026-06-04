import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const UNIT_STORAGE_KEY = "ds_master_unit_v1";

export interface UnitRecord extends BaseMasterRecord {
  unitName: string;
  unitCode: string;
  symbol: string;
  description: string;
}

export interface UnitForm {
  unitName: string;
  unitCode: string;
  symbol: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_UNIT_FORM: UnitForm = {
  unitName: "",
  unitCode: "",
  symbol: "",
  description: "",
  status: "active",
};

export const UNIT_SEED: UnitRecord[] = [
  { id: 1, unitName: "Kilogram", unitCode: "UNIT-001", symbol: "KG", description: "Weight unit", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-10", updatedAt: "2024-01-10" },
  { id: 2, unitName: "Litre", unitCode: "UNIT-002", symbol: "L", description: "Volume unit", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-10", updatedAt: "2024-01-10" },
  { id: 3, unitName: "Packet", unitCode: "UNIT-003", symbol: "PKT", description: "Pack unit", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-12", updatedAt: "2024-01-12" },
  { id: 4, unitName: "Bottle", unitCode: "UNIT-004", symbol: "BTL", description: "Bottle unit", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-12", updatedAt: "2024-01-12" },
];

export function unitToForm(r: UnitRecord): UnitForm {
  return {
    unitName: r.unitName,
    unitCode: r.unitCode,
    symbol: r.symbol,
    description: r.description,
    status: r.status,
  };
}

export function formToUnit(form: UnitForm, id: number, existing?: UnitRecord): UnitRecord {
  const now = masterToday();
  return {
    id,
    unitName: form.unitName.trim(),
    unitCode: form.unitCode.trim(),
    symbol: form.symbol.trim().toUpperCase(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function validateUnitForm(form: UnitForm): string | null {
  if (!form.unitName.trim()) return "Unit name is required.";
  if (!form.unitCode.trim()) return "Unit code is required.";
  if (!form.symbol.trim()) return "Symbol is required.";
  return null;
}
