// ── Customer Master — types, seed, storage, validation, master linkages ─────

import { loadGSTMasters, type GSTMaster } from "../gst/gst-data";
import { loadTDSMasters, type TDSMaster } from "../tds/tds-data";
import {
  loadGeoNodes,
  getChildren,
  type GeoNode,
} from "../geography/geo-data";
import { loadEmployees, type Employee } from "../../user-management/employee/employee-data";

export type CustomerStatus = "active" | "inactive" | "draft" | "blocked";

export interface StatusChange {
  date: string;
  from: string;
  to: string;
  by: string;
  reason: string;
}

export interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  customerType: string;
  status: CustomerStatus;
  blockReason: string;

  countryCode: string;
  mobile: string;
  email: string;

  gstApplicable: boolean;
  gstin: string;
  gstMasterId: number | null;
  tdsApplicable: boolean;
  tdsMasterId: number | null;
  tan: string;
  cibRegn: string;
  fcoRegn: string;
  fssai: string;

  address: string;
  stateId: number | null;
  stateName: string;
  districtId: number | null;
  districtName: string;
  territoryId: number | null;
  territoryName: string;
  pincode: string;

  salesManId: number | null;
  salesManName: string;

  creditLimit: number;
  interestRate: number;
  paymentTerms: string;

  bankName: string;
  bankBranchAddress: string;
  bankAccountNo: string;
  ifscCode: string;

  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  lastStatusChange: string;
  statusHistory: StatusChange[];
}

export const CUSTOMER_TYPE_OPTIONS = [
  { value: "distributor", label: "Distributor" },
  { value: "cbbo", label: "CBBO (Cluster Based Business Organisation)" },
  { value: "fpo", label: "FPO (Farmer Producer Organisation)" },
  { value: "retailer", label: "Retailer" },
  { value: "wholesaler", label: "Wholesaler" },
];

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  distributor: "Distributor",
  cbbo: "CBBO",
  fpo: "FPO",
  retailer: "Retailer",
  wholesaler: "Wholesaler",
};

export const COUNTRY_CODES = [
  { code: "+91", label: "+91 India" },
  { code: "+1", label: "+1 USA / Canada" },
  { code: "+44", label: "+44 UK" },
  { code: "+971", label: "+971 UAE" },
  { code: "+65", label: "+65 Singapore" },
  { code: "+60", label: "+60 Malaysia" },
  { code: "+61", label: "+61 Australia" },
];

export const PAYMENT_TERMS_OPTIONS = [
  { value: "advance", label: "Advance (Full)" },
  { value: "net-7", label: "Net 7 Days" },
  { value: "net-15", label: "Net 15 Days" },
  { value: "net-30", label: "Net 30 Days" },
  { value: "net-45", label: "Net 45 Days" },
  { value: "net-60", label: "Net 60 Days" },
  { value: "net-90", label: "Net 90 Days" },
];

const STORAGE_KEY = "ds_customers";

const SEED_CUSTOMERS: Customer[] = [
  {
    id: 1,
    customerCode: "CUST-0001",
    customerName: "Agro Solutions Pvt Ltd",
    customerType: "distributor",
    status: "active",
    blockReason: "",
    countryCode: "+91",
    mobile: "9876543210",
    email: "ramesh@agrosolutions.com",
    gstApplicable: true,
    gstin: "27AABCU9603R1ZX",
    gstMasterId: 4,
    tdsApplicable: true,
    tdsMasterId: 1,
    tan: "PNEA12345A",
    cibRegn: "CIB/MH/2020/001",
    fcoRegn: "FCO/MH/2019/045",
    fssai: "11522980000001",
    address: "123 Market Road, Shivaji Nagar, Pune",
    stateId: 3,
    stateName: "Maharashtra",
    districtId: 8,
    districtName: "Pune Region",
    territoryId: null,
    territoryName: "Pune North",
    pincode: "411004",
    salesManId: 1,
    salesManName: "Rajesh Kumar",
    creditLimit: 500000,
    interestRate: 12,
    paymentTerms: "net-30",
    bankName: "HDFC Bank",
    bankBranchAddress: "FC Road, Pune",
    bankAccountNo: "50100234567890",
    ifscCode: "HDFC0001234",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-03-15",
    lastStatusChange: "2024-01-10",
    statusHistory: [{ date: "2024-01-10", from: "-", to: "active", by: "Admin", reason: "New customer onboarded" }],
  },
  {
    id: 2,
    customerCode: "CUST-0002",
    customerName: "Kisan FPO Cooperative",
    customerType: "fpo",
    status: "active",
    blockReason: "",
    countryCode: "+91",
    mobile: "9812345678",
    email: "suresh@kisanfpo.org",
    gstApplicable: true,
    gstin: "24BCDEF1234G2ZY",
    gstMasterId: 2,
    tdsApplicable: false,
    tdsMasterId: null,
    tan: "",
    cibRegn: "",
    fcoRegn: "FCO/MH/2021/012",
    fssai: "",
    address: "FPO Office, Near APMC, Mahadeo Nagar, Nashik",
    stateId: 3,
    stateName: "Maharashtra",
    districtId: 8,
    districtName: "Pune Region",
    territoryId: null,
    territoryName: "Nashik",
    pincode: "422001",
    salesManId: 2,
    salesManName: "Priya Singh",
    creditLimit: 250000,
    interestRate: 10,
    paymentTerms: "net-45",
    bankName: "SBI",
    bankBranchAddress: "Nashik Main",
    bankAccountNo: "30012345678",
    ifscCode: "SBIN0001234",
    createdBy: "Admin",
    createdDate: "2024-01-15",
    updatedBy: "Field Agent",
    updatedDate: "2024-02-20",
    lastStatusChange: "2024-01-15",
    statusHistory: [{ date: "2024-01-15", from: "-", to: "active", by: "Admin", reason: "FPO registration approved" }],
  },
  {
    id: 3,
    customerCode: "CUST-0003",
    customerName: "Green Earth CBBO Society",
    customerType: "cbbo",
    status: "inactive",
    blockReason: "",
    countryCode: "+91",
    mobile: "9898765432",
    email: "priya@greencbbo.com",
    gstApplicable: true,
    gstin: "29XYZAB5678H3ZW",
    gstMasterId: 3,
    tdsApplicable: true,
    tdsMasterId: 3,
    tan: "",
    cibRegn: "",
    fcoRegn: "",
    fssai: "",
    address: "Village Panchayat, Block C, Nagpur",
    stateId: 3,
    stateName: "Maharashtra",
    districtId: 7,
    districtName: "Mumbai Region",
    territoryId: null,
    territoryName: "Vidarbha East",
    pincode: "440001",
    salesManId: null,
    salesManName: "",
    creditLimit: 150000,
    interestRate: 14,
    paymentTerms: "net-15",
    bankName: "",
    bankBranchAddress: "",
    bankAccountNo: "",
    ifscCode: "",
    createdBy: "Admin",
    createdDate: "2024-02-01",
    updatedBy: "Admin",
    updatedDate: "2024-04-01",
    lastStatusChange: "2024-04-01",
    statusHistory: [
      { date: "2024-02-01", from: "-", to: "active", by: "Admin", reason: "Initial onboarding" },
      { date: "2024-04-01", from: "active", to: "inactive", by: "Admin", reason: "Off-season" },
    ],
  },
  {
    id: 4,
    customerCode: "CUST-0004",
    customerName: "Maharashtra Agri Distributors",
    customerType: "distributor",
    status: "blocked",
    blockReason: "Outstanding dues exceed ₹5L — payment overdue 90+ days",
    countryCode: "+91",
    mobile: "9765432109",
    email: "mohan@mahagri.com",
    gstApplicable: true,
    gstin: "27MNOPQ9876R4ZV",
    gstMasterId: 4,
    tdsApplicable: true,
    tdsMasterId: 1,
    tan: "PNEM98765B",
    cibRegn: "",
    fcoRegn: "",
    fssai: "",
    address: "Plot 45, Industrial Estate, Aurangabad",
    stateId: 3,
    stateName: "Maharashtra",
    districtId: 8,
    districtName: "Pune Region",
    territoryId: null,
    territoryName: "Marathwada",
    pincode: "431003",
    salesManId: 1,
    salesManName: "Rajesh Kumar",
    creditLimit: 0,
    interestRate: 0,
    paymentTerms: "advance",
    bankName: "ICICI Bank",
    bankBranchAddress: "CIDCO, Aurangabad",
    bankAccountNo: "012345678901",
    ifscCode: "ICIC0000456",
    createdBy: "Admin",
    createdDate: "2024-03-01",
    updatedBy: "Admin",
    updatedDate: "2024-05-10",
    lastStatusChange: "2024-05-10",
    statusHistory: [
      { date: "2024-03-01", from: "-", to: "active", by: "Admin", reason: "New distributor" },
      { date: "2024-05-10", from: "active", to: "blocked", by: "Admin", reason: "Outstanding dues exceed ₹5L — payment overdue 90+ days" },
    ],
  },
  {
    id: 5,
    customerCode: "CUST-0005",
    customerName: "Vidarbha Farmers Producer Org",
    customerType: "fpo",
    status: "draft",
    blockReason: "",
    countryCode: "+91",
    mobile: "9654321098",
    email: "anil@vidarbhafpo.in",
    gstApplicable: false,
    gstin: "",
    gstMasterId: null,
    tdsApplicable: false,
    tdsMasterId: null,
    tan: "",
    cibRegn: "",
    fcoRegn: "",
    fssai: "",
    address: "Near Gram Panchayat Office, Taluka Amravati",
    stateId: 3,
    stateName: "Maharashtra",
    districtId: 8,
    districtName: "Pune Region",
    territoryId: null,
    territoryName: "Amravati",
    pincode: "444601",
    salesManId: 2,
    salesManName: "Priya Singh",
    creditLimit: 200000,
    interestRate: 11,
    paymentTerms: "net-30",
    bankName: "",
    bankBranchAddress: "",
    bankAccountNo: "",
    ifscCode: "",
    createdBy: "Field Agent",
    createdDate: "2024-03-15",
    updatedBy: "Field Agent",
    updatedDate: "2024-03-15",
    lastStatusChange: "2024-03-15",
    statusHistory: [{ date: "2024-03-15", from: "-", to: "draft", by: "Field Agent", reason: "Draft saved" }],
  },
];

function migrateCustomer(raw: Record<string, unknown>): Customer {
  const c = raw as Partial<Customer> & {
    phones?: { countryCode: string; number: string }[];
    emails?: { email: string }[];
    contactPerson?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    territory?: string;
    tdsPercent?: number;
    pan?: string;
  };

  const phones = c.phones ?? [];
  const emails = c.emails ?? [];

  return {
    id: c.id ?? 0,
    customerCode: c.customerCode ?? "",
    customerName: c.customerName ?? "",
    customerType: c.customerType ?? "distributor",
    status: (c.status as CustomerStatus) ?? "inactive",
    blockReason: c.blockReason ?? "",
    countryCode: c.countryCode ?? phones[0]?.countryCode ?? "+91",
    mobile: c.mobile ?? phones[0]?.number ?? "",
    email: c.email ?? emails[0]?.email ?? "",
    gstApplicable: c.gstApplicable ?? !!c.gstin,
    gstin: c.gstin ?? "",
    gstMasterId: c.gstMasterId ?? null,
    tdsApplicable: c.tdsApplicable ?? (Number(c.tdsPercent) > 0),
    tdsMasterId: c.tdsMasterId ?? null,
    tan: c.tan ?? "",
    cibRegn: c.cibRegn ?? "",
    fcoRegn: c.fcoRegn ?? "",
    fssai: c.fssai ?? "",
    address: c.address ?? [c.addressLine1, c.addressLine2, c.city].filter(Boolean).join(", "),
    stateId: c.stateId ?? null,
    stateName: c.stateName ?? c.state ?? "",
    districtId: c.districtId ?? null,
    districtName: c.districtName ?? "",
    territoryId: c.territoryId ?? null,
    territoryName: c.territoryName ?? c.territory ?? "",
    pincode: c.pincode ?? "",
    salesManId: c.salesManId ?? null,
    salesManName: c.salesManName ?? "",
    creditLimit: c.creditLimit ?? 0,
    interestRate: c.interestRate ?? 0,
    paymentTerms: c.paymentTerms ?? "net-30",
    bankName: c.bankName ?? "",
    bankBranchAddress: c.bankBranchAddress ?? "",
    bankAccountNo: c.bankAccountNo ?? "",
    ifscCode: c.ifscCode ?? "",
    createdBy: c.createdBy ?? "Admin",
    createdDate: c.createdDate ?? "",
    updatedBy: c.updatedBy ?? "Admin",
    updatedDate: c.updatedDate ?? "",
    lastStatusChange: c.lastStatusChange ?? "",
    statusHistory: c.statusHistory ?? [],
  };
}

export function loadCustomers(): Customer[] {
  if (typeof window === "undefined") return SEED_CUSTOMERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_CUSTOMERS;
    const data = JSON.parse(raw) as Record<string, unknown>[];
    return data.map(migrateCustomer);
  } catch {
    return SEED_CUSTOMERS;
  }
}

export function saveCustomers(list: Customer[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextCustomerId(list: Customer[]): number {
  return Math.max(0, ...list.map((c) => c.id)) + 1;
}

export function generateCustomerCode(list: Customer[]): string {
  const maxNum = list.reduce((max, c) => {
    const m = c.customerCode.match(/CUST-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `CUST-${String(maxNum + 1).padStart(4, "0")}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function validateGSTIN(v: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.trim());
}

export function validateMobile(v: string): boolean {
  return /^[6-9][0-9]{9}$/.test(v.trim());
}

export function validateEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function validatePincode(v: string): boolean {
  return /^[1-9][0-9]{5}$/.test(v.trim());
}

export function validateIFSC(v: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase());
}

/** Only active customers can be used in new transactions */
export function isCustomerTransactable(c: Customer): boolean {
  return c.status === "active";
}

/** For SO / invoice customer dropdowns */
export function getCustomersForTransactionDropdown(): Customer[] {
  return loadCustomers().filter(isCustomerTransactable);
}

export function getActiveGSTMasters(): GSTMaster[] {
  return loadGSTMasters().filter((g) => g.status === "active");
}

export function getActiveTDSMasters(): TDSMaster[] {
  return loadTDSMasters().filter((t) => t.status === "active");
}

export function getActiveGeoStates(nodes?: GeoNode[]): GeoNode[] {
  const list = nodes ?? loadGeoNodes();
  return list.filter((n) => n.level === "State" && n.status === "active");
}

/** District maps to Region level in Geography Master */
export function getDistrictsForState(stateId: number, nodes?: GeoNode[]): GeoNode[] {
  const list = nodes ?? loadGeoNodes();
  return list.filter((n) => n.level === "Region" && n.parentId === stateId && n.status === "active");
}

export function getTerritoriesUnderDistrict(districtId: number, nodes?: GeoNode[]): GeoNode[] {
  const list = nodes ?? loadGeoNodes();
  const result: GeoNode[] = [];
  function walk(parentId: number) {
    for (const child of getChildren(parentId, list)) {
      if (child.status !== "active") continue;
      if (child.level === "Territory") result.push(child);
      else if (child.level !== "City") walk(child.id);
    }
  }
  walk(districtId);
  return result;
}

export function getPincodesForTerritory(territoryId: number, nodes?: GeoNode[]): string[] {
  const list = nodes ?? loadGeoNodes();
  const codes = new Set<string>();
  function walk(parentId: number) {
    for (const child of getChildren(parentId, list)) {
      if (child.pincode) codes.add(child.pincode);
      walk(child.id);
    }
  }
  walk(territoryId);
  return Array.from(codes).sort();
}

export function getActiveSalesEmployees(): Employee[] {
  return loadEmployees().filter((e) => e.status === "active");
}

export function formatMobile(countryCode: string, mobile: string): string {
  if (!mobile) return "—";
  return `${countryCode} ${mobile}`;
}

export function formatCreditLimit(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
