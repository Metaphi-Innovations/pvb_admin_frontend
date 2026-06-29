import {
  formatPartyPaymentTerms,
  formValuesToStructured,
  paymentTermsToLegacy,
  resolveStructuredPaymentTerms,
  structuredToFormValues,
  validatePaymentTermsForm,
  type PaymentType,
} from "@/lib/masters/payment-terms";

export { formatPartyPaymentTerms as formatPaymentTerms };

import {
  VENDOR_TYPE_EXPENSES,
  VENDOR_TYPE_GOODS,
  getInitialCodeForVendorType,
  isExpenseVendorType,
  isGoodsVendorType,
} from "../vendor-type/vendor-type-data";
import {
  generateTypedMasterCode,
  isMasterCodeEmpty,
} from "@/lib/masters/code-generation";
import {
  deriveGstCategory,
  deriveGstRegistered,
  deriveGstRegistrationType,
  buildGstCategory,
  fetchGstRegistrationDetails,
  gstApplicableFromCategory,
  isGstCategoryRegistered,
  validateMSMENumber,
  MSME_NUMBER_ERROR,
  validateTAN,
  GST_REGISTRATION_TYPE_DEFAULT,
  GST_CATEGORY_UNREGISTERED,
  type GstRegistrationDetails,
} from "@/lib/masters/gst-compliance";

export type VendorStatus = "active" | "inactive";
export type CreditPeriodUnit = "days" | "months";

export { VENDOR_TYPE_GOODS, VENDOR_TYPE_EXPENSES, isGoodsVendorType, isExpenseVendorType };

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "transport-vendor", label: "Transport Supplier" },
  { value: "consultant", label: "Consultant" },
  { value: "legal-advisor", label: "Legal Advisor" },
  { value: "marketing-agency", label: "Marketing Agency" },
  { value: "contractor", label: "Contractor" },
  { value: "auditor", label: "Auditor" },
];

export function formatExpenseCategory(value: string): string {
  if (!value) return "—";
  return EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function applyVendorPaymentTerms<
  T extends {
    paymentType?: PaymentType;
    creditDays?: number;
    advancePercentage?: number;
    paymentTerms?: string;
  },
>(record: T): T & {
  paymentType: PaymentType;
  creditDays: number;
  advancePercentage: number;
  paymentTerms: string;
} {
  const structured = resolveStructuredPaymentTerms(record);
  return {
    ...record,
    paymentType: structured.paymentType,
    creditDays: structured.creditDays,
    advancePercentage: structured.advancePercentage,
    paymentTerms: paymentTermsToLegacy(structured),
  };
}

export interface VendorAddress {
  line1: string;
  line2: string;
  city: string;
  town?: string;
  district?: string;
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
  /** Supplier-specific purchase price — overrides Pricing Master CP */
  price?: number;
  status: "Active" | "Inactive";
}

export interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
  vendorType: string;
  contactPerson: string;
  /** @deprecated Legacy string — synced from structured fields for downstream modules */
  paymentTerms: string;
  paymentType?: PaymentType;
  creditDays?: number;
  advancePercentage?: number;
  companyName: string;
  mobileCountryCode: string;
  mobile: string;
  email: string;
  gstApplicable: boolean;
  gstNumber: string;
  gstCategory?: string;
  legalCompanyName: string;
  billingAddress: VendorAddress;
  tdsApplicable: boolean;
  tdsMasterId: number | null;
  panNumber: string;
  tanNumber?: string;
  msmeRegistered?: boolean;
  msmeNumber?: string;
  tags: string;
  creditPeriodValue: string;
  creditPeriodUnit: CreditPeriodUnit;
  contacts: VendorContact[];
  accountHolderName: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode?: string;
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
  return {
    line1: "",
    line2: "",
    city: "",
    town: "",
    district: "",
    state: "",
    country: "India",
    pincode: "",
  };
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

/** Generate per-type vendor code (e.g. CG-001). */
export function generateVendorCodeForType(
  vendorType: string,
  vendors: Vendor[],
  excludeCode?: string,
): string {
  const initialCode = getInitialCodeForVendorType(vendorType);
  if (!initialCode) {
    return `VND-${String(vendors.length + 1).padStart(3, "0")}`;
  }
  return generateTypedMasterCode(
    initialCode,
    vendors.map((v) => v.vendorCode),
    excludeCode,
  );
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
  const details = fetchGstRegistrationDetails(gstin);
  if (!details) return null;
  return {
    legalCompanyName: details.legalBusinessName,
    billingAddress: {
      line1: details.registeredAddress,
      line2: "",
      city: details.district,
      state: details.state,
      country: "India",
      pincode: details.pincode,
    },
  };
}

export type { GstRegistrationDetails };

const STORAGE_KEY = "ds_vendor_masters_v7";

const SEED_RAW = [
  {
    id: 1,
    vendorCode: "CG-001",
    vendorName: "Agro Chem Distributors",
    vendorType: VENDOR_TYPE_GOODS,
    contactPerson: "Ramesh Patil",
    paymentTerms: "net-30",
    companyName: "Agro Chem Distributors Pvt Ltd",
    mobileCountryCode: "+91",
    mobile: "9876501234",
    email: "ramesh@agrochem.in",
    gstApplicable: true,
    gstNumber: "27AABCA1234F1Z2",
    gstCategory: "regular",
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
    tdsMasterId: 1,
    panNumber: "AABCA1234F",
    tanNumber: "PNEA12345A",
    msmeRegistered: false,
    msmeNumber: "",
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
    remarks: "",
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-05",
    updatedBy: "Admin",
    updatedDate: "2024-01-05",
    vendorProducts: [
      {
        id: "vp-1",
        productId: "prod-1",
        productName: "Organic Neem Fertilizer",
        sku: "FERT-NEEM-1KG",
        price: 250,
        status: "Active",
      },
      {
        id: "vp-2",
        productId: "prod-2",
        productName: "Urea Premium Blend",
        sku: "FERT-UREA-50KG",
        price: 950,
        status: "Active",
      },
    ],
    documents: [
      {
        uid: "doc-gst",
        documentName: "GST Certificate",
        fileName: "gst_certificate_chem.pdf",
        uploadedAt: "2024-01-05",
        size: "1.2 MB",
        uploaded: true,
        fileUrl: "/mock-documents/gst_cert.pdf",
      },
      {
        uid: "doc-pan",
        documentName: "PAN Copy",
        fileName: "pan_card_agro.pdf",
        uploadedAt: "2024-01-05",
        size: "450 KB",
        uploaded: true,
        fileUrl: "/mock-documents/pan_card.pdf",
      },
    ],
  },
  {
    id: 2,
    vendorCode: "CG-002",
    vendorName: "Seed Corp India",
    vendorType: VENDOR_TYPE_GOODS,
    contactPerson: "Priya Nair",
    paymentTerms: "net-45",
    companyName: "Seed Corp India Pvt Ltd",
    mobileCountryCode: "+91",
    mobile: "9988776655",
    email: "priya@seedcorp.in",
    gstApplicable: true,
    gstNumber: "29AABCS5678G1Z9",
    gstCategory: "regular",
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
    tdsMasterId: null,
    panNumber: "AABCS5678G",
    tanNumber: "",
    msmeRegistered: true,
    msmeNumber: "UDYAM-KA-12-0012345",
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
    documents: [],
    remarks: "",
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-08",
    updatedBy: "Admin",
    updatedDate: "2024-02-10",
  },
  {
    id: 3,
    vendorCode: "CE-001",
    vendorName: "Swift Logistics Services",
    vendorType: VENDOR_TYPE_EXPENSES,
    contactPerson: "Amit Sharma",
    paymentTerms: "net-15",
    companyName: "Swift Logistics Services",
    mobileCountryCode: "+91",
    mobile: "9123456780",
    email: "amit@swiftlogistics.in",
    gstApplicable: false,
    gstNumber: "",
    gstCategory: "unregistered",
    legalCompanyName: "",
    billingAddress: emptyAddress(),
    tdsApplicable: false,
    tdsMasterId: null,
    panNumber: "AABCS1234L",
    tanNumber: "",
    msmeRegistered: false,
    msmeNumber: "",
    tags: "transport",
    creditPeriodValue: "15",
    creditPeriodUnit: "days",
    contacts: [
      {
        uid: "c1",
        name: "Amit Sharma",
        designation: "Operations Head",
        countryCode: "+91",
        mobile: "9123456780",
        email: "amit@swiftlogistics.in",
      },
    ],
    accountHolderName: "Swift Logistics Services",
    bankName: "Axis Bank",
    branch: "Andheri",
    accountNumber: "912345678901",
    ifscCode: "UTIB0000123",
    documents: [],
    remarks: "",
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-02-15",
    updatedBy: "Admin",
    updatedDate: "2024-02-15",
  },
];

const SEED: Vendor[] = SEED_RAW.map((v) => applyVendorPaymentTerms(v) as Vendor);

function migrateLegacy(raw: Record<string, unknown>): Vendor {
  const billing = (raw.billingAddress as VendorAddress) ?? emptyAddress();
  const legacyContact = String(raw.contactPerson ?? "");
  const contacts = Array.isArray(raw.contacts)
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
      : [emptyContact("c1")];
  const primaryContact =
    String(raw.contactPerson ?? "").trim() ||
    contacts[0]?.name?.trim() ||
    "";
  const vendorType =
    String(raw.vendorType ?? "").trim() ||
    (Array.isArray(raw.vendorProducts) && (raw.vendorProducts as unknown[]).length > 0
      ? VENDOR_TYPE_GOODS
      : VENDOR_TYPE_GOODS);
  return {
    id: Number(raw.id),
    vendorCode: String(raw.vendorCode ?? ""),
    vendorName: String(raw.vendorName ?? ""),
    vendorType,
    contactPerson: primaryContact,
    ...applyVendorPaymentTerms({
      paymentType: raw.paymentType as PaymentType | undefined,
      creditDays:
        raw.creditDays !== undefined ? Number(raw.creditDays) : undefined,
      advancePercentage:
        raw.advancePercentage !== undefined
          ? Number(raw.advancePercentage)
          : undefined,
      paymentTerms: String(raw.paymentTerms ?? "net-30"),
    }),
    companyName: String(raw.companyName ?? raw.vendorName ?? ""),
    mobileCountryCode: String(raw.mobileCountryCode ?? "+91"),
    mobile: String(raw.mobile ?? ""),
    email: String(raw.email ?? ""),
    gstApplicable: Boolean(raw.gstApplicable ?? raw.gstNumber),
    gstNumber: String(raw.gstNumber ?? ""),
    gstCategory: deriveGstCategory(
      Boolean(raw.gstApplicable ?? raw.gstNumber),
      String(raw.gstNumber ?? ""),
      raw.gstCategory as string | undefined,
    ),
    legalCompanyName: String(raw.legalCompanyName ?? raw.companyName ?? raw.vendorName ?? ""),
    billingAddress: billing,
    tdsApplicable: Boolean(raw.tdsApplicable ?? false),
    tdsMasterId:
      raw.tdsMasterId !== undefined && raw.tdsMasterId !== null
        ? Number(raw.tdsMasterId)
        : null,
    panNumber: String(raw.panNumber ?? ""),
    tanNumber: String(raw.tanNumber ?? ""),
    msmeRegistered: Boolean(raw.msmeRegistered ?? false),
    msmeNumber: String(raw.msmeNumber ?? ""),
    tags: String(raw.tags ?? ""),
    creditPeriodValue: String(raw.creditPeriodValue ?? raw.creditDays ?? "30"),
    creditPeriodUnit: (raw.creditPeriodUnit as CreditPeriodUnit) ?? "days",
    contacts,
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
  const raw = v as Record<string, unknown>;
  let vendor: Vendor;
  if (raw.vendorType && "contactPerson" in raw) {
    vendor = { ...(v as Vendor), vendorCode: String((v as Vendor).vendorCode ?? raw.vendorCode ?? "") };
  } else {
    vendor = migrateLegacy(raw);
  }
  return applyVendorPaymentTerms(vendor);
}

function migrateMissingVendorCodes(vendors: Vendor[]): { list: Vendor[]; changed: boolean } {
  const codes = vendors.map((v) => v.vendorCode).filter((c) => !isMasterCodeEmpty(c));
  let changed = false;
  const list = vendors.map((v) => {
    if (!isMasterCodeEmpty(v.vendorCode)) return v;
    const prefix = getInitialCodeForVendorType(v.vendorType);
    if (!prefix) return v;
    const code = generateTypedMasterCode(prefix, codes);
    codes.push(code);
    changed = true;
    return { ...v, vendorCode: code };
  });
  return { list, changed };
}

export function loadVendors(): Vendor[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyKeys = ["ds_vendor_masters_v5", "ds_vendor_masters_v4", "ds_vendor_masters"];
      for (const key of legacyKeys) {
        const legacyRaw = localStorage.getItem(key);
        if (legacyRaw) {
          const { list, changed } = migrateMissingVendorCodes(
            (JSON.parse(legacyRaw) as Record<string, unknown>[]).map(normalize),
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          return list;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    let list = (JSON.parse(raw) as Record<string, unknown>[]).map(normalize);
    const { list: migrated, changed } = migrateMissingVendorCodes(list);
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return list;
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

export interface VendorFormValues {
  vendorName: string;
  vendorType: string;
  contactPerson: string;
  paymentType: PaymentType | "";
  creditDays: string;
  advancePercentage: string;
  companyName: string;
  mobileCountryCode: string;
  mobile: string;
  email: string;
  gstApplicable: boolean;
  gstRegistered: boolean;
  gstRegistrationType: string;
  gstNumber: string;
  gstCategory: string;
  legalCompanyName: string;
  billingAddress: VendorAddress;
  tdsApplicable: boolean;
  tdsMasterId: string;
  panNumber: string;
  tanNumber: string;
  msmeRegistered: boolean;
  msmeNumber: string;
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
  vendorType: "",
  contactPerson: "",
  paymentType: "credit",
  creditDays: "30",
  advancePercentage: "",
  companyName: "",
  mobileCountryCode: "+91",
  mobile: "",
  email: "",
  gstApplicable: false,
  gstRegistered: false,
  gstRegistrationType: GST_REGISTRATION_TYPE_DEFAULT,
  gstNumber: "",
  gstCategory: GST_CATEGORY_UNREGISTERED,
  legalCompanyName: "",
  billingAddress: emptyAddress(),
  tdsApplicable: false,
  tdsMasterId: "",
  panNumber: "",
  tanNumber: "",
  msmeRegistered: false,
  msmeNumber: "",
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
  const gstCategory = v.gstCategory || deriveGstCategory(v.gstApplicable, v.gstNumber);
  const gstRegistered = deriveGstRegistered(v.gstApplicable, v.gstNumber, gstCategory);
  return {
    vendorName: v.vendorName,
    vendorType: v.vendorType,
    contactPerson: v.contactPerson,
    ...structuredToFormValues(
      resolveStructuredPaymentTerms({
        paymentType: v.paymentType,
        creditDays: v.creditDays,
        advancePercentage: v.advancePercentage,
        paymentTerms: v.paymentTerms,
      }),
    ),
    companyName: v.companyName,
    mobileCountryCode: v.mobileCountryCode,
    mobile: v.mobile,
    email: v.email,
    gstApplicable: gstApplicableFromCategory(gstCategory),
    gstRegistered,
    gstRegistrationType: deriveGstRegistrationType(gstCategory),
    gstNumber: v.gstNumber,
    gstCategory,
    legalCompanyName: v.legalCompanyName,
    billingAddress: { ...v.billingAddress },
    tdsApplicable: v.tdsApplicable,
    tdsMasterId: v.tdsMasterId != null ? String(v.tdsMasterId) : "",
    panNumber: v.panNumber,
    tanNumber: v.tanNumber ?? "",
    msmeRegistered: v.msmeRegistered ?? false,
    msmeNumber: v.msmeNumber ?? "",
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
    swiftCode: v.swiftCode ?? "",
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
  const gstCategory = buildGstCategory(form.gstRegistered, form.gstRegistrationType);
  const gstApplicable = form.gstRegistered;
  const gstRegistered = form.gstRegistered;
  return {
    ...meta,
    vendorCode: meta.vendorCode,
    vendorName: form.vendorName.trim(),
    vendorType: form.vendorType,
    contactPerson: form.contactPerson.trim(),
    ...((): {
      paymentType: PaymentType;
      creditDays: number;
      advancePercentage: number;
      paymentTerms: string;
    } => {
      const structured = formValuesToStructured({
        paymentType: form.paymentType,
        creditDays: form.creditDays,
        advancePercentage: form.advancePercentage,
      })!;
      return {
        paymentType: structured.paymentType,
        creditDays: structured.creditDays,
        advancePercentage: structured.advancePercentage,
        paymentTerms: paymentTermsToLegacy(structured),
      };
    })(),
    companyName: form.companyName.trim() || form.vendorName.trim(),
    mobileCountryCode: form.mobileCountryCode,
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    gstApplicable,
    gstNumber: gstRegistered ? form.gstNumber.trim().toUpperCase() : "",
    gstCategory,
    legalCompanyName: form.legalCompanyName.trim(),
    billingAddress: form.billingAddress,
    tdsApplicable: form.tdsApplicable,
    tdsMasterId:
      form.tdsApplicable && form.tdsMasterId
        ? Number(form.tdsMasterId)
        : null,
    panNumber: form.panNumber.trim().toUpperCase(),
    tanNumber: form.tanNumber.trim().toUpperCase(),
    msmeRegistered: form.msmeRegistered,
    msmeNumber: form.msmeRegistered ? form.msmeNumber.trim() : "",
    tags: form.tags.trim(),
    creditPeriodValue: form.creditPeriodValue,
    creditPeriodUnit: form.creditPeriodUnit,
    contacts: form.contacts.filter((c) => c.name.trim() || c.mobile.trim()),
    accountHolderName: form.accountHolderName.trim(),
    bankName: form.bankName.trim(),
    branch: form.branch.trim(),
    accountNumber: form.accountNumber.trim(),
    ifscCode: form.ifscCode.trim().toUpperCase(),
    swiftCode: form.swiftCode.trim().toUpperCase(),
    documents: form.documents,
    remarks: form.remarks.trim(),
    vendorProducts: form.vendorProducts || [],
  };
}

export function validateVendorForm(form: VendorFormValues): string | null {
  if (!form.vendorName.trim()) return "Supplier name is required.";
  if (!form.vendorType.trim()) return "Supplier type is required.";

  if (form.gstRegistered) {
    if (!form.gstNumber.trim()) return "GSTIN is required when GST registered.";
    if (!validateVendorGSTIN(form.gstNumber)) return "Enter a valid 15-character GSTIN.";
  }

  if (form.tanNumber.trim() && !validateTAN(form.tanNumber)) {
    return "Enter a valid TAN number.";
  }

  if (form.msmeRegistered) {
    if (!form.msmeNumber.trim() || !validateMSMENumber(form.msmeNumber)) {
      return MSME_NUMBER_ERROR;
    }
  }

  if (form.tdsApplicable && !form.tdsMasterId) {
    return "Select TDS section from master.";
  }

  if (!form.panNumber.trim()) return "PAN number is required.";
  if (!validateVendorPAN(form.panNumber)) {
    return "Enter a valid PAN number.";
  }

  const paymentErrors = validatePaymentTermsForm({
    paymentType: form.paymentType,
    creditDays: form.creditDays,
    advancePercentage: form.advancePercentage,
  });
  const paymentError = Object.values(paymentErrors)[0];
  if (paymentError) return paymentError;

  if (!form.billingAddress.line1.trim()) {
    return "Address Line 1 is required.";
  }
  if (!form.billingAddress.pincode.trim()) {
    return "Pincode is required.";
  }

  if (form.mobile.trim() && !validateVendorMobile(form.mobile)) {
    return "Enter a valid 10-digit mobile number.";
  }
  if (form.email.trim() && !validateVendorEmail(form.email)) {
    return "Enter a valid email address.";
  }
  if (
    form.billingAddress.pincode.trim() &&
    !validateVendorPincode(form.billingAddress.pincode)
  ) {
    return "Enter a valid 6-digit pincode.";
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
