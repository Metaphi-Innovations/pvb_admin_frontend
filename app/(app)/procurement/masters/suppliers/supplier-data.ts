/**
 * Procurement PO supplier dropdown — backed by Supplier Master.
 * @see app/(app)/masters/vendors/vendor-data.ts
 */
import {
  loadVendors,
  getActiveVendors,
  VENDOR_TYPE_LABELS,
  type Vendor,
} from "@/app/(app)/masters/vendors/vendor-data";
import { nextId, todayStr } from "@/lib/procurement/utils";

export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: number;
  supplierName: string;
  supplierCode: string;
  supplierType: string;
  gstNumber: string;
  panNumber: string;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  status: SupplierStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export const SUPPLIER_TYPE_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "trader", label: "Trader" },
  { value: "service", label: "Service Provider" },
  { value: "contractor", label: "Contractor" },
  { value: "other", label: "Other" },
];

export const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  ...VENDOR_TYPE_LABELS,
  service: "Service Provider",
};

function vendorToSupplier(v: Vendor): Supplier {
  const addr = v.billingAddress;
  const primary = v.contacts[0];
  return {
    id: v.id,
    supplierName: v.vendorName,
    supplierCode: v.vendorCode || String(v.id),
    supplierType: v.vendorType || "other",
    gstNumber: v.gstNumber,
    panNumber: v.panNumber,
    contactPerson: v.contactPerson || primary?.name || "",
    phone: "",
    mobile: v.mobile || primary?.mobile || "",
    email: v.email || primary?.email || "",
    address: [addr.line1, addr.line2].filter(Boolean).join(", "),
    city: addr.city,
    state: addr.state,
    country: addr.country,
    pincode: addr.pincode,
    status: v.status,
    createdBy: v.createdBy,
    createdDate: v.createdDate,
    updatedBy: v.updatedBy,
    updatedDate: v.updatedDate,
  };
}

export function loadSuppliers(): Supplier[] {
  return loadVendors().map(vendorToSupplier);
}

export function saveSuppliers(_list: Supplier[]): void {
  // Vendors are persisted via Supplier Master only
}

export function getSupplierById(id: number): Supplier | undefined {
  return loadSuppliers().find((s) => s.id === id);
}

export function getActiveSuppliers(): Supplier[] {
  return getActiveVendors().map(vendorToSupplier);
}

export function generateSupplierCode(list: Supplier[]): string {
  const n = nextId(list.map((s) => ({ id: s.id })));
  return `VEN-${String(n).padStart(5, "0")}`;
}

export { todayStr, nextId };
