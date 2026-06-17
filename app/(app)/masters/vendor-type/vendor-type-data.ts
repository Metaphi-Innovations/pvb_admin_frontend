import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";
import { loadMasterRecords, saveMasterRecords } from "@/lib/masters/common";
import {
  generateTypedMasterCode,
  isMasterCodeEmpty,
  normalizeInitialCode,
  validateInitialCode,
} from "@/lib/masters/code-generation";

export const VENDOR_TYPE_STORAGE_KEY = "ds_master_vendor_type_v2";

export const VENDOR_TYPE_GOODS = "Creditor for Goods";
export const VENDOR_TYPE_EXPENSES = "Creditor for Expenses";

export interface VendorTypeRecord extends BaseMasterRecord {
  vendorTypeName: string;
  /** Prefix for vendor codes, e.g. CG, CE */
  initialCode: string;
  description: string;
}

export interface VendorTypeForm {
  vendorTypeName: string;
  initialCode: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_VENDOR_TYPE_FORM: VendorTypeForm = {
  vendorTypeName: "",
  initialCode: "",
  description: "",
  status: "active",
};

export const VENDOR_TYPE_SEED: VendorTypeRecord[] = [
  {
    id: 1,
    vendorTypeName: VENDOR_TYPE_GOODS,
    initialCode: "CG",
    description: "Suppliers of physical goods and inventory items",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
  {
    id: 2,
    vendorTypeName: VENDOR_TYPE_EXPENSES,
    initialCode: "CE",
    description: "Service providers and expense-based vendors",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
];

const LEGACY_INITIAL_CODES: Record<string, string> = {
  [VENDOR_TYPE_GOODS.toLowerCase()]: "CG",
  [VENDOR_TYPE_EXPENSES.toLowerCase()]: "CE",
};

export function vendorTypeToForm(r: VendorTypeRecord): VendorTypeForm {
  return {
    vendorTypeName: r.vendorTypeName,
    initialCode: r.initialCode,
    description: r.description,
    status: r.status,
  };
}

export function formToVendorType(
  form: VendorTypeForm,
  id: number,
  existing?: VendorTypeRecord,
): VendorTypeRecord {
  const now = masterToday();
  return {
    id,
    vendorTypeName: form.vendorTypeName.trim(),
    initialCode: normalizeInitialCode(form.initialCode),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function findVendorTypeDuplicate(
  name: string,
  records: VendorTypeRecord[],
  excludeId?: number,
): VendorTypeRecord | undefined {
  const normalized = name.trim().toLowerCase();
  return records.find(
    (r) =>
      r.id !== excludeId &&
      r.vendorTypeName.trim().toLowerCase() === normalized,
  );
}

export function validateVendorTypeForm(
  form: VendorTypeForm,
  records: VendorTypeRecord[],
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.vendorTypeName.trim()) {
    errors.vendorTypeName = "Vendor type name is required.";
  } else if (findVendorTypeDuplicate(form.vendorTypeName, records, excludeId)) {
    errors.vendorTypeName = "Vendor type name must be unique.";
  }
  const initialErr = validateVendorTypeInitialCode(
    form.initialCode,
    records,
    excludeId,
  );
  if (initialErr) errors.initialCode = initialErr;
  return errors;
}

export function validateVendorTypeInitialCode(
  value: string,
  records: VendorTypeRecord[],
  excludeId?: number,
): string | null {
  const existing = records
    .filter((r) => r.id !== excludeId)
    .map((r) => r.initialCode);
  const exclude = excludeId
    ? records.find((r) => r.id === excludeId)?.initialCode
    : undefined;
  return validateInitialCode(value, existing, exclude);
}

function migrateVendorTypes(records: VendorTypeRecord[]): VendorTypeRecord[] {
  return records.map((r, idx) => {
    if (r.initialCode) return r;
    const seed = VENDOR_TYPE_SEED[idx];
    return {
      ...r,
      initialCode:
        seed?.initialCode ??
        LEGACY_INITIAL_CODES[r.vendorTypeName.trim().toLowerCase()] ??
        normalizeInitialCode(r.vendorTypeName.slice(0, 5)),
    };
  });
}

export function loadVendorTypes(): VendorTypeRecord[] {
  const loaded = loadMasterRecords<VendorTypeRecord>(
    VENDOR_TYPE_STORAGE_KEY,
    VENDOR_TYPE_SEED,
  );
  const needsMigration = loaded.some((r) => !r.initialCode);
  if (needsMigration) {
    const migrated = migrateVendorTypes(loaded);
    saveMasterRecords(VENDOR_TYPE_STORAGE_KEY, migrated);
    return migrated;
  }
  return loaded;
}

export function saveVendorTypes(records: VendorTypeRecord[]): void {
  saveMasterRecords(VENDOR_TYPE_STORAGE_KEY, records);
}

export function getInitialCodeForVendorType(vendorTypeName: string): string | null {
  const norm = vendorTypeName.trim().toLowerCase();
  const match = loadVendorTypes().find(
    (t) => t.vendorTypeName.trim().toLowerCase() === norm,
  );
  return match?.initialCode ?? null;
}

export function loadActiveVendorTypeOptions(): {
  value: string;
  label: string;
}[] {
  return loadVendorTypes()
    .filter((v) => v.status === "active")
    .map((v) => ({ value: v.vendorTypeName, label: v.vendorTypeName }));
}

export function isGoodsVendorType(type: string): boolean {
  return type === VENDOR_TYPE_GOODS;
}

export function isExpenseVendorType(type: string): boolean {
  return type === VENDOR_TYPE_EXPENSES;
}
