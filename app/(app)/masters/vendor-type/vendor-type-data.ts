"use client";

import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";
import { loadMasterRecords, saveMasterRecords } from "@/lib/masters/common";
import {
  generateTypedMasterCode,
  normalizeInitialCode,
  validateInitialCode,
} from "@/lib/masters/code-generation";

export const VENDOR_TYPE_STORAGE_KEY = "ds_master_vendor_type_v2";

export const VENDOR_TYPE_GOODS = "Creditor for Goods";
export const VENDOR_TYPE_EXPENSES = "Creditor for Expenses";

export interface VendorTypeRecord extends BaseMasterRecord {
  vendorTypeCode: string;
  vendorTypeName: string;
  /** Prefix for vendor codes, e.g. CG, CE */
  initialCode: string;
  description: string;
}

export interface VendorTypeFormValues {
  vendorTypeCode: string;
  vendorTypeName: string;
  initialCode: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_VENDOR_TYPE_FORM: VendorTypeFormValues = {
  vendorTypeCode: "",
  vendorTypeName: "",
  initialCode: "",
  description: "",
  status: "active",
};

export const VENDOR_TYPE_SEED: VendorTypeRecord[] = [
  {
    id: 1,
    vendorTypeCode: "CG-001",
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
    vendorTypeCode: "CE-001",
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

export function vendorTypeToFormValues(r: VendorTypeRecord): VendorTypeFormValues {
  return {
    vendorTypeCode: r.vendorTypeCode,
    vendorTypeName: r.vendorTypeName,
    initialCode: r.initialCode,
    description: r.description,
    status: r.status,
  };
}

export function nextVendorTypeId(list: VendorTypeRecord[]): number {
  return list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
}

export function generateVendorTypeCode(
  initialCode: string,
  records: VendorTypeRecord[],
  excludeId?: number,
): string {
  const prefix = normalizeInitialCode(initialCode);
  if (!prefix) return "";
  const codes = records.map((r) => r.vendorTypeCode);
  const exclude = excludeId
    ? records.find((r) => r.id === excludeId)?.vendorTypeCode
    : undefined;
  return generateTypedMasterCode(prefix, codes, exclude);
}

export function resolveVendorTypeCode(
  initialCode: string,
  records: VendorTypeRecord[],
  options: {
    recordId?: number;
    existingCode?: string;
    originalInitialCode?: string;
  } = {},
): string {
  const normalized = normalizeInitialCode(initialCode);
  if (!normalized) return "";

  const original = normalizeInitialCode(options.originalInitialCode ?? "");
  if (
    options.recordId &&
    options.existingCode &&
    original &&
    original === normalized
  ) {
    return options.existingCode;
  }

  return generateVendorTypeCode(initialCode, records, options.recordId);
}

export function validateVendorTypeCodeUnique(
  code: string,
  records: VendorTypeRecord[],
  excludeId?: number,
): string | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return "Supplier type code is required.";
  const duplicate = records.find(
    (r) =>
      r.id !== excludeId &&
      r.vendorTypeCode.trim().toUpperCase() === normalized,
  );
  if (duplicate) return "Supplier type code already exists.";
  return null;
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

export function validateVendorTypeForm(
  form: VendorTypeFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.vendorTypeName.trim()) {
    errors.vendorTypeName = "Supplier type name is required";
  }
  const code = normalizeInitialCode(form.initialCode);
  if (!code) {
    errors.initialCode = "Initial code is required";
  } else if (!/^[A-Z]{2,5}$/.test(code)) {
    errors.initialCode = "Use uppercase letters only (2–5 characters)";
  }
  if (code && !form.vendorTypeCode.trim()) {
    errors.vendorTypeCode = "Supplier type code could not be generated";
  }
  return errors;
}

function migrateInitialCodes(records: VendorTypeRecord[]): VendorTypeRecord[] {
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

function migrateVendorTypeCodes(records: VendorTypeRecord[]): VendorTypeRecord[] {
  const prefixCounts = new Map<string, number>();
  return records.map((item) => {
    if (item.vendorTypeCode?.trim()) return item;
    const prefix = normalizeInitialCode(item.initialCode);
    if (!prefix) return item;
    const next = (prefixCounts.get(prefix) ?? 0) + 1;
    prefixCounts.set(prefix, next);
    return {
      ...item,
      vendorTypeCode: `${prefix}-${String(next).padStart(3, "0")}`,
    };
  });
}

export function loadVendorTypes(): VendorTypeRecord[] {
  const loaded = loadMasterRecords<VendorTypeRecord>(
    VENDOR_TYPE_STORAGE_KEY,
    VENDOR_TYPE_SEED,
  );
  let migrated = loaded;
  let changed = false;
  if (migrated.some((r) => !r.initialCode)) {
    migrated = migrateInitialCodes(migrated);
    changed = true;
  }
  if (migrated.some((r) => !r.vendorTypeCode?.trim())) {
    migrated = migrateVendorTypeCodes(migrated);
    changed = true;
  }
  if (changed) {
    saveMasterRecords(VENDOR_TYPE_STORAGE_KEY, migrated);
  }
  return migrated;
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

/** @deprecated Use vendorTypeToFormValues */
export const vendorTypeToForm = vendorTypeToFormValues;

/** @deprecated Use validateVendorTypeForm with separate save logic */
export type VendorTypeForm = VendorTypeFormValues;
