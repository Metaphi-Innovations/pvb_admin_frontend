"use client";

import {
  MASTER_CURRENT_USER,
  masterToday,
  type MasterStatus,
} from "@/lib/masters/common";

export interface HSNMaster {
  id: number;
  /** Backend UUID for API routes */
  hsnUuid?: string;
  gstId?: string;
  hsnCode: string;
  hsnDescription: string;
  gstRate: string;
  productCategory?: string;
  effectiveDate?: string;
  status: MasterStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export interface HSNForm {
  hsnCode: string;
  hsnDescription: string;
  gstId: string;
  /** @deprecated client-only legacy fields */
  gstRate?: string;
  productCategory?: string;
  effectiveDate?: string;
  status?: MasterStatus;
}

export const DEFAULT_HSN_FORM: HSNForm = {
  hsnCode: "",
  hsnDescription: "",
  gstId: "",
};

export function formatHsnDisplayCode(srNo: number): string {
  return `HSN-${String(srNo).padStart(4, "0")}`;
}

export function sanitizeHsnCodeInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function validateHsnApiForm(form: HSNForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const code = sanitizeHsnCodeInput(form.hsnCode ?? "");

  if (!code) {
    errors.hsnCode = "HSN code is required.";
  } else if (!/^\d{4,8}$/.test(code)) {
    errors.hsnCode = "HSN code must be 4 to 8 digits.";
  }

  if (!form.hsnDescription.trim()) {
    errors.hsnDescription = "HSN description is required.";
  }
  if (!form.gstId) {
    errors.gstId = "GST rate is required.";
  }
  return errors;
}

const STORAGE_KEY = "ds_hsn_masters_v2";

const LEGACY_CODE_MAP: Record<string, string> = {
  "HSN-0001": "12099990",
  "HSN-0002": "31010000",
  "HSN-0003": "38089199",
};

export const HSN_SEED: HSNMaster[] = [
  {
    id: 1,
    hsnCode: "31021010",
    hsnDescription: "Urea — nitrogenous fertilizer",
    gstRate: "5%",
    productCategory: "Fertilizer",
    effectiveDate: "2026-01-01",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2026-01-10",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2026-01-10",
  },
  {
    id: 2,
    hsnCode: "31052000",
    hsnDescription: "NPK — mineral or chemical fertilizers",
    gstRate: "12%",
    productCategory: "Fertilizer",
    effectiveDate: "2026-01-01",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2026-01-12",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2026-01-12",
  },
  {
    id: 3,
    hsnCode: "38089340",
    hsnDescription: "Pesticides — herbicides, fungicides, insecticides",
    gstRate: "18%",
    productCategory: "Pesticide",
    effectiveDate: "2026-01-01",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2026-01-15",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2026-01-15",
  },
  {
    id: 4,
    hsnCode: "12099990",
    hsnDescription: "Vegetable seeds for planting/sowing",
    gstRate: "0%",
    productCategory: "Seeds",
    effectiveDate: "2026-01-01",
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2026-01-10",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2026-01-10",
  },
];

const LEGACY_STORAGE_KEY = "ds_hsn_masters";

function normalizeHsnCode(raw: string): string {
  const trimmed = raw.trim();
  if (LEGACY_CODE_MAP[trimmed]) return LEGACY_CODE_MAP[trimmed];
  return trimmed.replace(/\D/g, "").slice(0, 8);
}

function migrateRecord(raw: Record<string, unknown>): HSNMaster {
  const p = raw as Partial<HSNMaster>;
  const hsnCode = normalizeHsnCode(String(p.hsnCode ?? ""));
  return {
    id: Number(p.id ?? 0),
    hsnCode,
    hsnDescription: String(p.hsnDescription ?? ""),
    gstRate: String(p.gstRate ?? "18%"),
    productCategory: String(p.productCategory ?? ""),
    effectiveDate: String(p.effectiveDate ?? ""),
    status: (p.status as MasterStatus) ?? "active",
    createdBy: String(p.createdBy ?? MASTER_CURRENT_USER),
    createdDate: String(p.createdDate ?? masterToday()),
    updatedBy: String(p.updatedBy ?? MASTER_CURRENT_USER),
    updatedDate: String(p.updatedDate ?? masterToday()),
  };
}

export function loadHSNMasters(): HSNMaster[] {
  if (typeof window === "undefined") return HSN_SEED;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const migrated = (JSON.parse(legacy) as Record<string, unknown>[]).map(migrateRecord);
        saveHSNMasters(migrated);
        return migrated;
      }
      return HSN_SEED;
    }
    return (JSON.parse(raw) as Record<string, unknown>[]).map(migrateRecord);
  } catch {
    return HSN_SEED;
  }
}

export function saveHSNMasters(data: HSNMaster[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function nextHSNId(list: HSNMaster[]): number {
  return list.length ? Math.max(...list.map((h) => h.id)) + 1 : 1;
}

export function todayStr(): string {
  return masterToday();
}

export function hsnToForm(record: HSNMaster): HSNForm {
  return {
    hsnCode: record.hsnCode,
    hsnDescription: record.hsnDescription,
    gstId: record.gstId ?? "",
    gstRate: record.gstRate,
    productCategory: record.productCategory ?? "",
    effectiveDate: record.effectiveDate ?? "",
    status: record.status,
  };
}

export function formToHsn(
  form: HSNForm,
  id: number,
  existing?: HSNMaster,
): HSNMaster {
  const now = masterToday();
  return {
    id,
    hsnCode: (form.hsnCode ?? "").trim(),
    hsnDescription: form.hsnDescription.trim(),
    gstRate: form.gstRate ?? "",
    productCategory: (form.productCategory ?? "").trim(),
    effectiveDate: (form.effectiveDate ?? "").trim(),
    status: form.status ?? "active",
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    createdDate: existing?.createdDate ?? now,
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: now,
  };
}

export function findHsnDuplicate(
  hsnCode: string,
  records: HSNMaster[],
  excludeId?: number,
): HSNMaster | undefined {
  const normalized = hsnCode.trim();
  return records.find((r) => r.id !== excludeId && r.hsnCode === normalized);
}

export function validateHsnForm(
  form: HSNForm,
  records: HSNMaster[],
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const code = sanitizeHsnCodeInput(form.hsnCode ?? "");

  if (!code) {
    errors.hsnCode = "HSN code is required.";
  } else if (!/^\d{4,8}$/.test(code)) {
    errors.hsnCode = "HSN code must be 4 to 8 digits.";
  } else if (findHsnDuplicate(code, records, excludeId)) {
    errors.hsnCode = "This HSN code already exists.";
  }

  if (!form.hsnDescription.trim()) {
    errors.hsnDescription = "HSN description is required.";
  }

  if (!form.gstRate) {
    errors.gstRate = "GST rate is required.";
  }

  return errors;
}
