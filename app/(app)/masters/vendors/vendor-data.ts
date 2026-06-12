export type VendorStatus = "active" | "inactive";
export type CreditPeriodUnit = "days" | "months";

export interface VendorAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface VendorContact {
  uid: string;
  name: string;
  designation: string;
  countryCode: string;
  mobile: string;
  email: string;
}

export interface VendorDocument {
  uid: string;
  documentTypeId?: string;
  documentName: string;
  file?: File;
  fileUrl?: string;
  uploaded?: boolean;
  fileName: string;
  uploadedAt: string;
  size: string;
}

export interface VendorProductMapping {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  mrp?: number;
  price?: number;
  status: "Active" | "Inactive";
}

export interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
  companyName: string;
  mobileCountryCode: string;
  mobile: string;
  email: string;
  gstApplicable: boolean;
  gstNumber: string;
  legalCompanyName: string;
  billingAddress: VendorAddress;
  tdsApplicable: boolean;
  tdsPercentage: string;
  tdsCustomPercent: string;
  tcsApplicable: boolean;
  panNumber: string;
  tags: string;
  creditPeriodValue: string;
  creditPeriodUnit: CreditPeriodUnit;
  contacts: VendorContact[];
  accountHolderName: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode: string;
  documents: VendorDocument[];
  remarks: string;
  status: VendorStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  vendorProducts?: VendorProductMapping[];
}

/** @deprecated Kept for procurement supplier bridge only */
export const VENDOR_TYPE_LABELS: Record<string, string> = {
  manufacturer: "Manufacturer",
  distributor: "Distributor",
  trader: "Trader",
  service: "Service Provider",
  contractor: "Contractor",
  other: "Other",
};

export const COUNTRY_CODES = [
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+971", label: "🇦🇪 +971" },
];

export const COUNTRIES = ["India", "United States", "United Kingdom", "UAE", "Singapore"];

export const TDS_PERCENT_OPTIONS = [
  { value: "1", label: "1%" },
  { value: "2", label: "2%" },
  { value: "5", label: "5%" },
  { value: "10", label: "10%" },
  { value: "custom", label: "Custom" },
];

export const DEFAULT_DOCUMENT_NAMES = [
  "GST Certificate",
  "PAN Copy",
  "Cancelled Cheque",
  "Agreement",
  "Other Documents",
];

const GST_STATE_MAP: Record<string, string> = {
  "27": "Maharashtra",
  "29": "Karnataka",
  "07": "Delhi",
  "33": "Tamil Nadu",
  "24": "Gujarat",
};

export function emptyAddress(): VendorAddress {
  return { line1: "", line2: "", city: "", state: "", country: "India", pincode: "" };
}

export function emptyContact(uid?: string): VendorContact {
  return {
    uid: uid ?? `c-${Date.now()}`,
    name: "",
    designation: "",
    countryCode: "+91",
    mobile: "",
    email: "",
  };
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nextId(list: Vendor[]): number {
  return list.length ? Math.max(...list.map((v) => v.id)) + 1 : 1;
}

export function formatCreditPeriod(v: Vendor): string {
  if (!v.creditPeriodValue) return "—";
  const unit = v.creditPeriodUnit === "months" ? "Months" : "Days";
  return `${v.creditPeriodValue} ${unit}`;
}

/** Mock GST lookup — replace with API when integrated */
export function validateVendorMobile(v: string): boolean {
  return /^[6-9][0-9]{9}$/.test(v.trim());
}

export function validateVendorEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function validateVendorGSTIN(v: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
    v.trim().toUpperCase(),
  );
}

export function validateVendorPAN(v: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase());
}

export function validateVendorIFSC(v: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase());
}

export function validateVendorPincode(v: string): boolean {
  return /^[1-9][0-9]{5}$/.test(v.trim());
}

export function fetchGstDetails(gstin: string): {
  legalCompanyName: string;
  billingAddress: Partial<VendorAddress>;
} | null {
  const g = gstin.trim().toUpperCase();
  if (g.length !== 15) return null;
  const stateCode = g.slice(0, 2);
  return {
    legalCompanyName: `Legal Entity — ${g.slice(2, 12)}`,
    billingAddress: {
      line1: "Auto-fetched registered address",
      city: stateCode === "29" ? "Bengaluru" : "Pune",
      state: GST_STATE_MAP[stateCode] ?? "Maharashtra",
      country: "India",
      pincode: "411001",
    },
  };
}

const STORAGE_KEY = "ds_vendor_masters_v3";

const SEED: Vendor[] = [
  {
    id: 1,
    vendorCode: "VEN-00001",
    vendorName: "Agro Chem Distributors",
    companyName: "Agro Chem Distributors Pvt Ltd",
    mobileCountryCode: "+91",
    mobile: "9876501234",
    email: "ramesh@agrochem.in",
    gstApplicable: true,
    gstNumber: "27AABCA1234F1Z2",
    legalCompanyName: "Agro Chem Distributors Pvt Ltd",
    billingAddress: {
      line1: "12 MIDC Road, Bhosari",
      line2: "",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      pincode: "411026",
    },
    tdsApplicable: true,
    tdsPercentage: "2",
    tdsCustomPercent: "",
    tcsApplicable: false,
    panNumber: "AABCA1234F",
    tags: "fertilizer, priority",
    creditPeriodValue: "30",
    creditPeriodUnit: "days",
    contacts: [
      {
        uid: "c1",
        name: "Ramesh Patil",
        designation: "Sales Manager",
        countryCode: "+91",
        mobile: "9876501234",
        email: "ramesh@agrochem.in",
      },
    ],
    accountHolderName: "Agro Chem Distributors",
    bankName: "HDFC Bank",
    branch: "Bhosari",
    accountNumber: "50100234567890",
    ifscCode: "HDFC0001234",
    swiftCode: "",
    documents: [],
    remarks: "",
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-05",
    updatedBy: "Admin",
    updatedDate: "2024-01-05",
  },
  {
    id: 2,
    vendorCode: "VEN-00002",
    vendorName: "Seed Corp India",
    companyName: "Seed Corp India Pvt Ltd",
    mobileCountryCode: "+91",
    mobile: "9988776655",
    email: "priya@seedcorp.in",
    gstApplicable: true,
    gstNumber: "29AABCS5678G1Z9",
    legalCompanyName: "Seed Corp India Pvt Ltd",
    billingAddress: {
      line1: "45 Industrial Area, Whitefield",
      line2: "Phase 2",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      pincode: "560066",
    },
    tdsApplicable: false,
    tdsPercentage: "1",
    tdsCustomPercent: "",
    tcsApplicable: true,
    panNumber: "AABCS5678G",
    tags: "seeds",
    creditPeriodValue: "2",
    creditPeriodUnit: "months",
    contacts: [
      {
        uid: "c1",
        name: "Priya Nair",
        designation: "Account Manager",
        countryCode: "+91",
        mobile: "9988776655",
        email: "priya@seedcorp.in",
      },
    ],
    accountHolderName: "Seed Corp India Pvt Ltd",
    bankName: "ICICI Bank",
    branch: "Whitefield",
    accountNumber: "601234567890",
    ifscCode: "ICIC0001234",
    swiftCode: "",
    documents: [],
    remarks: "",
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-08",
    updatedBy: "Admin",
    updatedDate: "2024-02-10",
  },
];

function migrateLegacy(raw: Record<string, unknown>): Vendor {
  const billing = (raw.billingAddress as VendorAddress) ?? emptyAddress();
  const legacyContact = String(raw.contactPerson ?? "");
  return {
    id: Number(raw.id),
    vendorCode: String(raw.vendorCode ?? ""),
    vendorName: String(raw.vendorName ?? ""),
    companyName: String(raw.companyName ?? raw.vendorName ?? ""),
    mobileCountryCode: String(raw.mobileCountryCode ?? "+91"),
    mobile: String(raw.mobile ?? ""),
    email: String(raw.email ?? ""),
    gstApplicable: Boolean(raw.gstApplicable ?? raw.gstNumber),
    gstNumber: String(raw.gstNumber ?? ""),
    legalCompanyName: String(raw.legalCompanyName ?? raw.companyName ?? raw.vendorName ?? ""),
    billingAddress: billing,
    tdsApplicable: Boolean(raw.tdsApplicable ?? false),
    tdsPercentage: String(raw.tdsPercentage ?? "2"),
    tdsCustomPercent: String(raw.tdsCustomPercent ?? ""),
    tcsApplicable: Boolean(raw.tcsApplicable ?? false),
    panNumber: String(raw.panNumber ?? ""),
    tags: String(raw.tags ?? ""),
    creditPeriodValue: String(raw.creditPeriodValue ?? raw.creditDays ?? "30"),
    creditPeriodUnit: (raw.creditPeriodUnit as CreditPeriodUnit) ?? "days",
    contacts: Array.isArray(raw.contacts)
      ? (raw.contacts as VendorContact[])
      : legacyContact || raw.mobile
        ? [
            {
              uid: "c1",
              name: legacyContact,
              designation: String(raw.designation ?? ""),
              countryCode: "+91",
              mobile: String(raw.mobile ?? ""),
              email: String(raw.email ?? ""),
            },
          ]
        : [emptyContact("c1")],
    accountHolderName: String(raw.accountHolderName ?? ""),
    bankName: String(raw.bankName ?? ""),
    branch: String(raw.branch ?? ""),
    accountNumber: String(raw.accountNumber ?? ""),
    ifscCode: String(raw.ifscCode ?? ""),
    swiftCode: String(raw.swiftCode ?? ""),
    documents: Array.isArray(raw.documents)
      ? (raw.documents as VendorDocument[])
      : Array.isArray(raw.attachments)
        ? (raw.attachments as { uid: string; name: string; docType: string; uploadedAt: string; size: string }[]).map(
            (a) => ({
              uid: a.uid,
              documentTypeId: undefined,
              documentName: a.docType,
              fileUrl: undefined,
              uploaded: true,
              fileName: a.name,
              uploadedAt: a.uploadedAt,
              size: a.size,
            }),
          )
        : [],
    remarks: String(raw.remarks ?? ""),
    status: (raw.status as VendorStatus) ?? "active",
    createdBy: String(raw.createdBy ?? "Admin"),
    createdDate: String(raw.createdDate ?? todayStr()),
    updatedBy: String(raw.updatedBy ?? "Admin"),
    updatedDate: String(raw.updatedDate ?? todayStr()),
    vendorProducts: Array.isArray(raw.vendorProducts)
      ? (raw.vendorProducts as VendorProductMapping[])
      : [],
  };
}

function normalize(v: Vendor | Record<string, unknown>): Vendor {
  if (v && typeof v === "object" && "contacts" in v && Array.isArray((v as Vendor).contacts)) {
    return v as Vendor;
  }
  return migrateLegacy(v as Record<string, unknown>);
}

export function loadVendors(): Vendor[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("ds_vendor_masters");
      if (legacy) {
        const migrated = (JSON.parse(legacy) as Record<string, unknown>[]).map(normalize);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return (JSON.parse(raw) as Record<string, unknown>[]).map(normalize);
  } catch {
    return SEED;
  }
}

export function saveVendors(list: Vendor[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getVendorById(id: number): Vendor | undefined {
  return loadVendors().find((v) => v.id === id);
}

export function getActiveVendors(): Vendor[] {
  return loadVendors().filter((v) => v.status === "active");
}

export function generateVendorCode(list: Vendor[]): string {
  return `VEN-${String(list.length + 1).padStart(5, "0")}`;
}

export interface VendorFormValues {
  vendorName: string;
  vendorCode: string;
  companyName: string;
  mobileCountryCode: string;
  mobile: string;
  email: string;
  gstApplicable: boolean;
  gstNumber: string;
  legalCompanyName: string;
  billingAddress: VendorAddress;
  tdsApplicable: boolean;
  tdsPercentage: string;
  tdsCustomPercent: string;
  tcsApplicable: boolean;
  panNumber: string;
  tags: string;
  creditPeriodValue: string;
  creditPeriodUnit: CreditPeriodUnit;
  contacts: VendorContact[];
  accountHolderName: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  swiftCode: string;
  documents: VendorDocument[];
  remarks: string;
  vendorProducts: VendorProductMapping[];
}

export const DEFAULT_VENDOR_FORM: VendorFormValues = {
  vendorName: "",
  vendorCode: "",
  companyName: "",
  mobileCountryCode: "+91",
  mobile: "",
  email: "",
  gstApplicable: false,
  gstNumber: "",
  legalCompanyName: "",
  billingAddress: emptyAddress(),
  tdsApplicable: false,
  tdsPercentage: "2",
  tdsCustomPercent: "",
  tcsApplicable: false,
  panNumber: "",
  tags: "",
  creditPeriodValue: "30",
  creditPeriodUnit: "days",
  contacts: [emptyContact("c-primary")],
  accountHolderName: "",
  bankName: "",
  branch: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  swiftCode: "",
  documents: [],
  remarks: "",
  vendorProducts: [],
};

export function vendorToForm(v: Vendor): VendorFormValues {
  return {
    vendorName: v.vendorName,
    vendorCode: v.vendorCode,
    companyName: v.companyName,
    mobileCountryCode: v.mobileCountryCode,
    mobile: v.mobile,
    email: v.email,
    gstApplicable: v.gstApplicable,
    gstNumber: v.gstNumber,
    legalCompanyName: v.legalCompanyName,
    billingAddress: { ...v.billingAddress },
    tdsApplicable: v.tdsApplicable,
    tdsPercentage: v.tdsPercentage,
    tdsCustomPercent: v.tdsCustomPercent,
    tcsApplicable: v.tcsApplicable,
    panNumber: v.panNumber,
    tags: v.tags,
    creditPeriodValue: v.creditPeriodValue,
    creditPeriodUnit: v.creditPeriodUnit,
    contacts: v.contacts.length ? v.contacts.map((c) => ({ ...c })) : [emptyContact()],
    accountHolderName: v.accountHolderName,
    bankName: v.bankName,
    branch: v.branch,
    accountNumber: v.accountNumber,
    confirmAccountNumber: v.accountNumber,
    ifscCode: v.ifscCode,
    swiftCode: v.swiftCode,
    documents: v.documents.length
      ? v.documents.map((d) => ({ ...d }))
      : [],
    remarks: v.remarks,
    vendorProducts: v.vendorProducts ? v.vendorProducts.map((p) => ({ ...p })) : [],
  };
}

export function formToVendor(
  form: VendorFormValues,
  meta: {
    id: number;
    vendorCode: string;
    status: VendorStatus;
    createdBy: string;
    createdDate: string;
    updatedBy: string;
    updatedDate: string;
  },
): Vendor {
  return {
    ...meta,
    vendorName: form.vendorName.trim(),
    companyName: form.companyName.trim() || form.vendorName.trim(),
    mobileCountryCode: form.mobileCountryCode,
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    gstApplicable: form.gstApplicable,
    gstNumber: form.gstApplicable ? form.gstNumber.trim().toUpperCase() : "",
    legalCompanyName: form.legalCompanyName.trim(),
    billingAddress: form.billingAddress,
    tdsApplicable: form.tdsApplicable,
    tdsPercentage: form.tdsApplicable ? form.tdsPercentage : "",
    tdsCustomPercent: form.tdsPercentage === "custom" ? form.tdsCustomPercent : "",
    tcsApplicable: form.tcsApplicable,
    panNumber: form.panNumber.trim().toUpperCase(),
    tags: form.tags.trim(),
    creditPeriodValue: form.creditPeriodValue,
    creditPeriodUnit: form.creditPeriodUnit,
    contacts: form.contacts.filter((c) => c.name.trim() || c.mobile.trim()),
    accountHolderName: form.accountHolderName.trim(),
    bankName: form.bankName.trim(),
    branch: form.branch.trim(),
    accountNumber: form.accountNumber.trim(),
    ifscCode: form.ifscCode.trim().toUpperCase(),
    swiftCode: form.swiftCode.trim(),
    documents: form.documents,
    remarks: form.remarks.trim(),
    vendorProducts: form.vendorProducts || [],
  };
}

export function validateVendorForm(form: VendorFormValues): string | null {
  if (!form.vendorName.trim()) return "Vendor name is required.";
  if (!form.mobile.trim()) return "Mobile number is required.";
  if (!validateVendorMobile(form.mobile)) {
    return "Enter a valid 10-digit mobile number.";
  }
  if (form.email.trim() && !validateVendorEmail(form.email)) {
    return "Enter a valid email address.";
  }
  if (form.gstApplicable && !validateVendorGSTIN(form.gstNumber)) {
    return "Enter a valid GSTIN.";
  }
  if (form.panNumber.trim() && !validateVendorPAN(form.panNumber)) {
    return "Enter a valid PAN number.";
  }
  if (
    form.billingAddress.pincode.trim() &&
    !validateVendorPincode(form.billingAddress.pincode)
  ) {
    return "Enter a valid 6-digit billing pincode.";
  }
  if (form.ifscCode.trim() && !validateVendorIFSC(form.ifscCode)) {
    return "Enter a valid IFSC code.";
  }
  if (form.accountNumber && form.accountNumber !== form.confirmAccountNumber) {
    return "Account number and confirmation do not match.";
  }

  for (let i = 0; i < form.contacts.length; i++) {
    const contact = form.contacts[i];
    if (contact.mobile.trim() && !validateVendorMobile(contact.mobile)) {
      return `Enter a valid 10-digit mobile number for contact row ${i + 1}.`;
    }
    if (contact.email.trim() && !validateVendorEmail(contact.email)) {
      return `Enter a valid email address for contact row ${i + 1}.`;
    }
  }

  // Validate product mappings
  const selectedProductIds = new Set<string>();
  for (let i = 0; i < (form.vendorProducts || []).length; i++) {
    const p = form.vendorProducts[i];
    if (!p.productId || !p.productName.trim()) {
      return `Product is required at row ${i + 1}.`;
    }
    if (selectedProductIds.has(p.productId)) {
      return `Duplicate product mapping: ${p.productName} is selected multiple times.`;
    }
    selectedProductIds.add(p.productId);
    if (p.price === undefined || p.price === null || isNaN(p.price) || p.price <= 0) {
      return `Price must be greater than 0 for product "${p.productName || p.productId}" at row ${i + 1}.`;
    }
  }

  return null;
}
