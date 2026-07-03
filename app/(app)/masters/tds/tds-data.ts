"use client";

import {
  MASTER_CURRENT_USER,
  masterToday,
  type MasterStatus,
} from "@/lib/masters/common";

export interface TDSMaster {
  id: number;
  sectionCode: string;
  sectionName: string;
  /** Numeric rate (e.g. "1", "10", "0.1") or "As per slab" */
  tdsRate: string;
  description?: string;
  applicableTo: string[];
  thresholdAmount?: number;
  status: MasterStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  /** @deprecated migrated to sectionCode */
  tdsCode?: string;
  /** @deprecated migrated to description */
  remarks?: string;
  /** @deprecated removed — use inactive status */
  lastStatusChange?: string;
}

export interface TDSForm {
  sectionCode: string;
  sectionName: string;
  tdsRate: string;
  applicableTo: string[];
  thresholdAmount: string;
  status: MasterStatus;
}

export const TDS_APPLICABLE_TO_OPTIONS = [
  { value: "vendor", label: "Supplier" },
  { value: "customer", label: "Customer" },
  { value: "contractor", label: "Contractor" },
  { value: "professional", label: "Professional" },
  { value: "purchase", label: "Purchase" },
  { value: "interest", label: "Interest" },
  { value: "salary", label: "Salary" },
  { value: "employee", label: "Employee" },
  { value: "commission", label: "Commission" },
] as const;

export const DEFAULT_TDS_FORM: TDSForm = {
  sectionCode: "",
  sectionName: "",
  tdsRate: "",
  applicableTo: [],
  thresholdAmount: "",
  status: "active",
};

const STORAGE_KEY = "ds_tds_masters_v2";
const LEGACY_STORAGE_KEY = "ds_tds_masters";

export const TDS_SEED: TDSMaster[] = [
  {
    id: 1,
    sectionCode: "194C",
    sectionName: "Contractor Payment",
    tdsRate: "1",
    description: "Single contractor payment",
    applicableTo: ["contractor", "vendor"],
    thresholdAmount: 30000,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-01-10",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-01-10",
  },
  {
    id: 2,
    sectionCode: "194J",
    sectionName: "Professional Fees",
    tdsRate: "10",
    description: "Fees for professional or technical services",
    applicableTo: ["professional", "vendor"],
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-01-12",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-01-12",
  },
  {
    id: 3,
    sectionCode: "194Q",
    sectionName: "Purchase of Goods",
    tdsRate: "0.1",
    description: "Purchase of goods exceeding threshold",
    applicableTo: ["purchase", "vendor"],
    thresholdAmount: 5000000,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-01-15",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-01-15",
  },
  {
    id: 4,
    sectionCode: "194R",
    sectionName: "Perquisite/Benefit",
    tdsRate: "10",
    description: "Perquisite or benefit to a business or profession",
    applicableTo: ["vendor", "professional"],
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-01-18",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-01-18",
  },
  {
    id: 5,
    sectionCode: "194A",
    sectionName: "Interest (Banks)",
    tdsRate: "10",
    description: "Interest other than interest on securities",
    applicableTo: ["interest", "vendor"],
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-02-01",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-02-01",
  },
  {
    id: 6,
    sectionCode: "192",
    sectionName: "Salary",
    tdsRate: "As per slab",
    description: "TDS on salaries as per income tax slabs",
    applicableTo: ["salary", "employee"],
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-02-05",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-02-05",
  },
  {
    id: 7,
    sectionCode: "194H",
    sectionName: "Commission or Brokerage",
    tdsRate: "5",
    applicableTo: ["commission", "vendor"],
    thresholdAmount: 15000,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    createdDate: "2024-02-08",
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: "2024-02-08",
  },
];

function normalizeRate(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "number") return String(raw);
  const s = String(raw).trim();
  if (/slab/i.test(s)) return "As per slab";
  return s.replace(/%$/, "").trim();
}

function migrateRecord(raw: Record<string, unknown>): TDSMaster {
  const p = raw as Partial<TDSMaster> & { tdsRate?: number | string };
  const sectionCode = String(p.sectionCode ?? p.tdsCode ?? "").trim().toUpperCase();
  const sectionName = String(
    p.sectionName ?? p.remarks ?? p.description ?? "",
  ).trim();
  let status: MasterStatus = "active";
  if (p.status === "inactive") status = "inactive";
  else if (String(p.status) === "archived") status = "inactive";

  return {
    id: Number(p.id ?? 0),
    sectionCode,
    sectionName,
    tdsRate: normalizeRate(p.tdsRate),
    description: String(p.description ?? p.remarks ?? "").trim() || undefined,
    applicableTo: Array.isArray(p.applicableTo)
      ? (p.applicableTo as string[])
      : [],
    thresholdAmount:
      p.thresholdAmount !== undefined && p.thresholdAmount !== null
        ? Number(p.thresholdAmount)
        : undefined,
    status,
    createdBy: String(p.createdBy ?? MASTER_CURRENT_USER),
    createdDate: String(p.createdDate ?? masterToday()),
    updatedBy: String(p.updatedBy ?? MASTER_CURRENT_USER),
    updatedDate: String(p.updatedDate ?? masterToday()),
  };
}

export function loadTDSMasters(): TDSMaster[] {
  if (typeof window === "undefined") return TDS_SEED;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const migrated = (JSON.parse(legacy) as Record<string, unknown>[]).map(
          migrateRecord,
        );
        saveTDSMasters(migrated);
        return migrated;
      }
      return TDS_SEED;
    }
    return (JSON.parse(raw) as Record<string, unknown>[]).map(migrateRecord);
  } catch {
    return TDS_SEED;
  }
}

export function saveTDSMasters(data: TDSMaster[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function nextTDSId(list: TDSMaster[]): number {
  return list.length ? Math.max(...list.map((t) => t.id)) + 1 : 1;
}

export function todayStr(): string {
  return masterToday();
}

export function getTdsSectionCode(record: TDSMaster): string {
  return record.sectionCode || record.tdsCode || "";
}

export function formatTdsRateDisplay(rate: string): string {
  const trimmed = rate.trim();
  if (!trimmed) return "—";
  if (/slab/i.test(trimmed)) return "As per slab";
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return `${num}%`;
  return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
}

export function formatTdsSummary(record: TDSMaster): string {
  return `${formatTdsRateDisplay(record.tdsRate)} ${getTdsSectionCode(record)}`;
}

export function toTdsSelectOptions(records: TDSMaster[]) {
  return records.map((t) => ({
    value: String(t.id),
    label: `${formatTdsRateDisplay(t.tdsRate)} ${getTdsSectionCode(t)}`,
    sublabel: t.sectionName,
  }));
}

export function formatApplicableToLabels(values: string[]): string {
  if (!values.length) return "—";
  return values
    .map(
      (v) =>
        TDS_APPLICABLE_TO_OPTIONS.find((o) => o.value === v)?.label ?? v,
    )
    .join(", ");
}

export function sanitizeTdsRateInput(value: string): string {
  return value.replace(/%/g, "");
}

export function showTdsRatePercentSuffix(rate: string): boolean {
  const trimmed = rate.trim();
  if (!trimmed) return true;
  return !/slab/i.test(trimmed);
}

export function tdsToForm(record: TDSMaster): TDSForm {
  return {
    sectionCode: getTdsSectionCode(record),
    sectionName: record.sectionName,
    tdsRate: record.tdsRate,
    applicableTo: [...record.applicableTo],
    thresholdAmount:
      record.thresholdAmount != null ? String(record.thresholdAmount) : "",
    status: record.status,
  };
}

export function formToTds(
  form: TDSForm,
  id: number,
  existing?: TDSMaster,
): TDSMaster {
  const now = masterToday();
  const threshold = form.thresholdAmount.trim()
    ? Number(form.thresholdAmount)
    : undefined;
  return {
    id,
    sectionCode: form.sectionCode.trim().toUpperCase(),
    sectionName: form.sectionName.trim(),
    tdsRate: normalizeRate(form.tdsRate),
    description: existing?.description,
    applicableTo: form.applicableTo,
    thresholdAmount:
      threshold != null && !Number.isNaN(threshold) ? threshold : undefined,
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    createdDate: existing?.createdDate ?? now,
    updatedBy: MASTER_CURRENT_USER,
    updatedDate: now,
  };
}

export function findTdsDuplicate(
  sectionCode: string,
  records: TDSMaster[],
  excludeId?: number,
): TDSMaster | undefined {
  const normalized = sectionCode.trim().toUpperCase();
  return records.find(
    (r) =>
      r.id !== excludeId &&
      getTdsSectionCode(r).toUpperCase() === normalized,
  );
}

export function isValidTdsRate(rate: string): boolean {
  const trimmed = rate.trim();
  if (!trimmed) return false;
  if (/slab/i.test(trimmed)) return true;
  const num = parseFloat(trimmed.replace(/%$/, ""));
  return !isNaN(num) && num >= 0;
}

export function validateTdsForm(
  form: TDSForm,
  records: TDSMaster[],
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const code = form.sectionCode.trim().toUpperCase();

  if (!code) {
    errors.sectionCode = "TDS section code is required.";
  } else if (findTdsDuplicate(code, records, excludeId)) {
    errors.sectionCode = "This section code already exists.";
  }

  if (!form.sectionName.trim()) {
    errors.sectionName = "TDS section name is required.";
  }

  if (!isValidTdsRate(form.tdsRate)) {
    errors.tdsRate = "Enter a valid TDS rate or 'As per slab'.";
  }

  return errors;
}

export function getActiveTDSMasters(): TDSMaster[] {
  return loadTDSMasters().filter((t) => t.status === "active");
}
