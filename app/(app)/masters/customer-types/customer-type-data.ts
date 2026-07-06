"use client";

import {
  generateTypedMasterCode,
  isMasterCodeEmpty,
  normalizeInitialCode,
  validateInitialCode,
} from "@/lib/masters/code-generation";

export interface CustomerTypeDocument {
  id: string;
  documentTypeId?: string;
  documentName: string;
}

export interface CustomerTypeRecord {
  id: number;
  /** Backend UUID for API routes */
  customerTypeId?: string;
  customerTypeCode: string;
  /** Prefix for customer codes, e.g. DIS, RET */
  initialCode: string;
  customerType: string;
  description: string;
  documentTypes: CustomerTypeDocument[];
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export const CUSTOMER_TYPE_SEED: CustomerTypeRecord[] = [
  {
    id: 1,
    customerTypeCode: "FAR-001",
    initialCode: "FAR",
    customerType: "Farmer",
    description: "Standard farm customer",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-10",
    updatedBy: "Admin",
    updatedDate: "2026-01-10",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-005", documentName: "Aadhaar Card" },
      { id: "DOC-002", documentTypeId: "DT-010", documentName: "Bank Account Details with Cancelled Cheque" },
    ],
  },
  {
    id: 2,
    customerTypeCode: "DIS-001",
    initialCode: "DIS",
    customerType: "Distributor",
    description: "Wholesale distributor partner",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-12",
    updatedBy: "Admin",
    updatedDate: "2026-01-12",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-001", documentName: "Letter of Interest" },
      { id: "DOC-002", documentTypeId: "DT-011", documentName: "Audited Financial Statements" },
      { id: "DOC-003", documentTypeId: "DT-003", documentName: "GST Registration Copy" },
      { id: "DOC-004", documentTypeId: "DT-004", documentName: "PAN Card" },
      { id: "DOC-005", documentTypeId: "DT-008", documentName: "Shop & Establishment Registration Certificate" },
    ],
  },
  {
    id: 3,
    customerTypeCode: "DLR-001",
    initialCode: "DLR",
    customerType: "Dealer",
    description: "Registered dealer merchant",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-14",
    updatedBy: "Admin",
    updatedDate: "2026-01-14",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-003", documentName: "GST Registration Copy" },
      { id: "DOC-002", documentTypeId: "DT-006", documentName: "Fertilizer License" },
      { id: "DOC-003", documentTypeId: "DT-008", documentName: "Shop & Establishment Registration Certificate" },
    ],
  },
  {
    id: 4,
    customerTypeCode: "RET-001",
    initialCode: "RET",
    customerType: "Retailer",
    description: "Direct retail store outlet",
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-01-16",
    updatedBy: "Admin",
    updatedDate: "2026-01-16",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-008", documentName: "Shop & Establishment Registration Certificate" },
    ],
  },
  {
    id: 5,
    customerTypeCode: "CF-001",
    initialCode: "CF",
    customerType: "C&F",
    description: "Carrying and Forwarding agent",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-18",
    updatedBy: "Admin",
    updatedDate: "2026-01-18",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-003", documentName: "GST Registration Copy" },
      { id: "DOC-002", documentTypeId: "DT-014", documentName: "Godown/Storage Facility Proof" },
      { id: "DOC-003", documentTypeId: "DT-015", documentName: "Delivery Authorization Letter" },
    ],
  },
  {
    id: 6,
    customerTypeCode: "CBBO-001",
    initialCode: "CBBO",
    customerType: "CBBO",
    description: "Cluster Based Business Organization",
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-01-20",
    updatedBy: "Admin",
    updatedDate: "2026-01-20",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-011", documentName: "Audited Financial Statements" },
    ],
  },
  {
    id: 7,
    customerTypeCode: "FPO-001",
    initialCode: "FPO",
    customerType: "FPO",
    description: "Farmer Producer Organization",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-22",
    updatedBy: "Admin",
    updatedDate: "2026-01-22",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-001", documentName: "Letter of Interest" },
      { id: "DOC-002", documentTypeId: "DT-002", documentName: "FPO Registration Certificate" },
      { id: "DOC-003", documentTypeId: "DT-011", documentName: "Audited Financial Statements" },
      { id: "DOC-004", documentTypeId: "DT-003", documentName: "GST Registration Copy" },
      { id: "DOC-005", documentTypeId: "DT-004", documentName: "PAN Card" },
      { id: "DOC-006", documentTypeId: "DT-005", documentName: "Aadhaar Card" },
      { id: "DOC-007", documentTypeId: "DT-006", documentName: "Fertilizer License" },
      { id: "DOC-008", documentTypeId: "DT-008", documentName: "Shop & Establishment Registration Certificate" },
      { id: "DOC-009", documentTypeId: "DT-009", documentName: "Board Resolution" },
      { id: "DOC-010", documentTypeId: "DT-010", documentName: "Bank Account Details with Cancelled Cheque" },
      { id: "DOC-011", documentTypeId: "DT-012", documentName: "Post-Dated Cheques" },
      { id: "DOC-012", documentTypeId: "DT-013", documentName: "Personal Guarantee Agreement" },
      { id: "DOC-013", documentTypeId: "DT-014", documentName: "Godown/Storage Facility Proof" },
      { id: "DOC-014", documentTypeId: "DT-015", documentName: "Delivery Authorization Letter" },
      { id: "DOC-015", documentTypeId: "DT-016", documentName: "Latest GST Return Copy" },
    ],
  },
];

const STORAGE_KEY = "ds_customer_types";

export function loadCustomerTypes(): CustomerTypeRecord[] {
  if (typeof window === "undefined") return CUSTOMER_TYPE_SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return CUSTOMER_TYPE_SEED;
    const parsed = JSON.parse(raw) as CustomerTypeRecord[];
    // Check if the loaded data has the updated structure
    const firstRecord = parsed[0];
    const firstDoc = firstRecord?.documentTypes?.[0];
    if (firstRecord && !("customerTypeCode" in firstRecord)) {
      localStorage.removeItem(STORAGE_KEY);
      return CUSTOMER_TYPE_SEED;
    }
    if (firstRecord && !("status" in firstRecord)) {
      const migrated = parsed.map((item, idx) => ({
        ...item,
        status: CUSTOMER_TYPE_SEED[idx]?.status ?? "active",
        createdBy: CUSTOMER_TYPE_SEED[idx]?.createdBy ?? "Admin",
        createdDate: CUSTOMER_TYPE_SEED[idx]?.createdDate ?? "2026-01-10",
        updatedBy: CUSTOMER_TYPE_SEED[idx]?.updatedBy ?? "Admin",
        updatedDate: CUSTOMER_TYPE_SEED[idx]?.updatedDate ?? "2026-01-10",
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (firstRecord && !("createdDate" in firstRecord)) {
      const migrated = parsed.map((item, idx) => ({
        ...item,
        createdBy: CUSTOMER_TYPE_SEED[idx]?.createdBy ?? "Admin",
        createdDate: CUSTOMER_TYPE_SEED[idx]?.createdDate ?? "2026-01-10",
        updatedBy: CUSTOMER_TYPE_SEED[idx]?.updatedBy ?? "Admin",
        updatedDate: CUSTOMER_TYPE_SEED[idx]?.updatedDate ?? "2026-01-10",
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (firstDoc && !("documentTypeId" in firstDoc)) {
      // Data is old format, clear storage to force reload seed data in new format
      localStorage.removeItem(STORAGE_KEY);
      return CUSTOMER_TYPE_SEED;
    }
    if (firstRecord && !("initialCode" in firstRecord)) {
      const defaultCodes: Record<string, string> = {
        farmer: "FAR",
        distributor: "DIS",
        dealer: "DLR",
        retailer: "RET",
        "c&f": "CF",
        cf: "CF",
        cbbo: "CBBO",
        fpo: "FPO",
      };
      const migrated = parsed.map((item, idx) => {
        const seed = CUSTOMER_TYPE_SEED[idx];
        const key = normalizeCustomerTypeKey(item.customerType);
        return {
          ...item,
          initialCode:
            seed?.initialCode ??
            defaultCodes[key] ??
            normalizeInitialCode(item.customerType.slice(0, 5)),
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (parsed.some((item) => /^CTY-/i.test(item.customerTypeCode ?? ""))) {
      const migrated = migrateLegacyCustomerTypeCodes(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  } catch {
    return CUSTOMER_TYPE_SEED;
  }
}

export function saveCustomerTypes(list: CustomerTypeRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextCustomerTypeId(list: CustomerTypeRecord[]): number {
  return list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
}

export function generateCustomerTypeCode(
  initialCode: string,
  records: CustomerTypeRecord[],
  excludeId?: number,
): string {
  const prefix = normalizeInitialCode(initialCode);
  if (!prefix) return "";
  const codes = records.map((r) => r.customerTypeCode);
  const exclude = excludeId
    ? records.find((r) => r.id === excludeId)?.customerTypeCode
    : undefined;
  return generateTypedMasterCode(prefix, codes, exclude);
}

/** Keep existing code on edit unless initial code prefix changes. */
export function resolveCustomerTypeCode(
  initialCode: string,
  records: CustomerTypeRecord[],
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

  return generateCustomerTypeCode(initialCode, records, options.recordId);
}

export function validateCustomerTypeCodeUnique(
  code: string,
  records: CustomerTypeRecord[],
  excludeId?: number,
): string | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return "Customer type code is required.";
  const duplicate = records.find(
    (r) =>
      r.id !== excludeId &&
      r.customerTypeCode.trim().toUpperCase() === normalized,
  );
  if (duplicate) return "Customer type code already exists.";
  return null;
}

function migrateLegacyCustomerTypeCodes(
  records: CustomerTypeRecord[],
): CustomerTypeRecord[] {
  const prefixCounts = new Map<string, number>();
  return records.map((item) => {
    if (!/^CTY-/i.test(item.customerTypeCode ?? "")) return item;
    const prefix = normalizeInitialCode(item.initialCode);
    if (!prefix) return item;
    const next = (prefixCounts.get(prefix) ?? 0) + 1;
    prefixCounts.set(prefix, next);
    return {
      ...item,
      customerTypeCode: `${prefix}-${String(next).padStart(3, "0")}`,
    };
  });
}

/** Normalize customer type slug/name for matching (e.g. "c&f" → "cf"). */
export function normalizeCustomerTypeKey(value: string): string {
  return value.toLowerCase().replace(/&/g, "").replace(/\s+/g, "");
}

export function getInitialCodeForCustomerType(typeKey: string): string | null {
  const norm = normalizeCustomerTypeKey(typeKey);
  const match = loadCustomerTypes().find(
    (t) => normalizeCustomerTypeKey(t.customerType) === norm,
  );
  return match?.initialCode ?? null;
}

export function validateCustomerTypeInitialCode(
  value: string,
  records: CustomerTypeRecord[],
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
