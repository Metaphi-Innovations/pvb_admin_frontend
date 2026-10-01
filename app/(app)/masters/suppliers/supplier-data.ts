"use client";

export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: number;
  supplierCode: string;
  supplierName: string;
  mobile: string;
  email: string;
  gstin: string;
  address: string;
  paymentTerms: string;
  status: SupplierStatus;
  cibRegn: string;
  cibRegnExpiry: string;
  fcoRegn: string;
  fcoRegnExpiry: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export const SUPPLIER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export const SUPPLIER_PAYMENT_TERMS_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "7-days", label: "7 Days" },
  { value: "15-days", label: "15 Days" },
  { value: "30-days", label: "30 Days" },
  { value: "45-days", label: "45 Days" },
  { value: "60-days", label: "60 Days" },
];

const STORAGE_KEY = "ds_suppliers";

const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    supplierCode: "SUP-0001",
    supplierName: "Green Crop Inputs Pvt Ltd",
    mobile: "9876543210",
    email: "sales@greencropinputs.com",
    gstin: "27AABCG1234D1ZX",
    address: "Plot 18, MIDC Industrial Area, Pune, Maharashtra",
    paymentTerms: "30-days",
    status: "active",
    cibRegn: "CIB/MH/2024/101",
    cibRegnExpiry: "2027-03-31",
    fcoRegn: "FCO/MH/2024/221",
    fcoRegnExpiry: "2026-12-31",
    createdBy: "Admin",
    createdDate: "2026-01-10",
    updatedBy: "Admin",
    updatedDate: "2026-03-14",
  },
  {
    id: 2,
    supplierCode: "SUP-0002",
    supplierName: "Agri Nova Chemicals",
    mobile: "9811122233",
    email: "contact@agrinova.co.in",
    gstin: "27AALCA5678F1ZQ",
    address: "Survey No. 42, Nashik Road, Nashik, Maharashtra",
    paymentTerms: "15-days",
    status: "active",
    cibRegn: "CIB/MH/2024/114",
    cibRegnExpiry: "2026-11-15",
    fcoRegn: "FCO/MH/2024/234",
    fcoRegnExpiry: "2027-01-20",
    createdBy: "Admin",
    createdDate: "2026-01-18",
    updatedBy: "Admin",
    updatedDate: "2026-03-20",
  },
  {
    id: 3,
    supplierCode: "SUP-0003",
    supplierName: "Harvest Fert Corp",
    mobile: "9898989898",
    email: "ops@harvestfert.com",
    gstin: "27AACCH4321K1ZT",
    address: "Warehouse 6, Ring Road, Aurangabad, Maharashtra",
    paymentTerms: "45-days",
    status: "inactive",
    cibRegn: "CIB/MH/2023/086",
    cibRegnExpiry: "2026-08-10",
    fcoRegn: "FCO/MH/2023/188",
    fcoRegnExpiry: "2026-10-05",
    createdBy: "Admin",
    createdDate: "2026-02-02",
    updatedBy: "Admin",
    updatedDate: "2026-04-01",
  },
  {
    id: 4,
    supplierCode: "SUP-0004",
    supplierName: "Rural Bio Solutions",
    mobile: "9765432109",
    email: "support@ruralbio.in",
    gstin: "27AADCR2468L1ZP",
    address: "Block B, Agri Market Yard, Kolhapur, Maharashtra",
    paymentTerms: "immediate",
    status: "active",
    cibRegn: "CIB/MH/2024/126",
    cibRegnExpiry: "2027-02-28",
    fcoRegn: "FCO/MH/2024/249",
    fcoRegnExpiry: "2026-09-30",
    createdBy: "Admin",
    createdDate: "2026-02-11",
    updatedBy: "Admin",
    updatedDate: "2026-04-18",
  },
];

function migrateSupplier(raw: Record<string, unknown>): Supplier {
  const s = raw as Partial<Supplier>;
  return {
    id: s.id ?? 0,
    supplierCode: s.supplierCode ?? "",
    supplierName: s.supplierName ?? "",
    mobile: s.mobile ?? "",
    email: s.email ?? "",
    gstin: s.gstin ?? "",
    address: s.address ?? "",
    paymentTerms: s.paymentTerms ?? "30-days",
    status: s.status ?? "active",
    cibRegn: s.cibRegn ?? "",
    cibRegnExpiry: s.cibRegnExpiry ?? "",
    fcoRegn: s.fcoRegn ?? "",
    fcoRegnExpiry: s.fcoRegnExpiry ?? "",
    createdBy: s.createdBy ?? "Admin",
    createdDate: s.createdDate ?? todayStr(),
    updatedBy: s.updatedBy ?? "Admin",
    updatedDate: s.updatedDate ?? todayStr(),
  };
}

export function loadSuppliers(): Supplier[] {
  if (typeof window === "undefined") return SEED_SUPPLIERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_SUPPLIERS;
    return (JSON.parse(raw) as Record<string, unknown>[]).map(migrateSupplier);
  } catch {
    return SEED_SUPPLIERS;
  }
}

export function saveSuppliers(list: Supplier[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextSupplierId(list: Supplier[]): number {
  return Math.max(0, ...list.map((s) => s.id)) + 1;
}

export function generateSupplierCode(list: Supplier[]): string {
  const maxNum = list.reduce((max, s) => {
    const match = s.supplierCode.match(/SUP-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `SUP-${String(maxNum + 1).padStart(4, "0")}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function validateSupplierMobile(v: string): boolean {
  return /^[6-9][0-9]{9}$/.test(v.trim());
}

export function validateSupplierEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function validateSupplierGSTIN(v: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.trim());
}

export function getPaymentTermLabel(value: string): string {
  return SUPPLIER_PAYMENT_TERMS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
