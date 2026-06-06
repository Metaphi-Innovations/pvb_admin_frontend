"use client";

export interface CustomerTypeDocument {
  id: string;
  documentName: string;
}

export interface CustomerTypeRecord {
  id: number;
  customerType: string;
  description: string;
  documentTypes: CustomerTypeDocument[];
}

export const CUSTOMER_TYPE_SEED: CustomerTypeRecord[] = [
  {
    id: 1,
    customerType: "Farmer",
    description: "Standard farm customer",
    documentTypes: [
      { id: "DOC-001", documentName: "Aadhaar Card Copy of Chairman/CEO" },
      { id: "DOC-002", documentName: "Bank Account Details with Cancelled Cheque" },
    ],
  },
  {
    id: 2,
    customerType: "Distributor",
    description: "Wholesale distributor partner",
    documentTypes: [
      { id: "DOC-001", documentName: "Letter of Interest to take Distributorship with 2 Security Cheques and details" },
      { id: "DOC-002", documentName: "Copy of Account Statement (Last 6 months) / IT Return of last year" },
      { id: "DOC-003", documentName: "GST Registration Copy" },
      { id: "DOC-004", documentName: "PAN Card of FPO & Chairman" },
      { id: "DOC-005", documentName: "Passport-size Photo of Authorized Person & Shop Photo" },
    ],
  },
  {
    id: 3,
    customerType: "Dealer",
    description: "Registered dealer merchant",
    documentTypes: [
      { id: "DOC-001", documentName: "GST Registration Copy" },
      { id: "DOC-002", documentName: "Fertilizer License (FCO 1985) & Pesticide License (Insecticides Act 1968)" },
      { id: "DOC-003", documentName: "Shop & Establishment Registration Certificate" },
    ],
  },
  {
    id: 4,
    customerType: "Retailer",
    description: "Direct retail store outlet",
    documentTypes: [
      { id: "DOC-001", documentName: "Shop & Establishment Registration Certificate" },
      { id: "DOC-002", documentName: "Passport-size Photo of Authorized Person & Shop Photo" },
    ],
  },
  {
    id: 5,
    customerType: "C&F",
    description: "Carrying and Forwarding agent",
    documentTypes: [
      { id: "DOC-001", documentName: "GST Registration Copy" },
      { id: "DOC-002", documentName: "Proof of Godown/Storage Facility (ownership/lease documents)" },
      { id: "DOC-003", documentName: "Delivery Authorization Letter (naming individuals authorized to sign delivery documents)" },
    ],
  },
  {
    id: 6,
    customerType: "CBBO",
    description: "Cluster Based Business Organization",
    documentTypes: [
      { id: "DOC-001", documentName: "MCA Portal Verification Document (Board of Directors verification)" },
      { id: "DOC-002", documentName: "Audited Financial Statements (Last 24 months)" },
    ],
  },
  {
    id: 7,
    customerType: "FPO",
    description: "Farmer Producer Organization",
    documentTypes: [
      { id: "DOC-001", documentName: "Letter of Interest to take Distributorship with 2 Security Cheques and details" },
      { id: "DOC-002", documentName: "FPO Registration Certificate (Certified Copy)" },
      { id: "DOC-003", documentName: "Copy of Account Statement (Last 6 months) / IT Return of last year" },
      { id: "DOC-004", documentName: "GST Registration Copy" },
      { id: "DOC-005", documentName: "PAN Card of FPO & Chairman" },
      { id: "DOC-006", documentName: "Aadhaar Card Copy of Chairman/CEO" },
      { id: "DOC-007", documentName: "Fertilizer License (FCO 1985) & Pesticide License (Insecticides Act 1968)" },
      { id: "DOC-008", documentName: "Shop & Establishment Registration Certificate" },
      { id: "DOC-009", documentName: "Board Resolution authorizing signing authority" },
      { id: "DOC-010", documentName: "Board Resolution for Personal Guarantee (if applicable)" },
      { id: "DOC-011", documentName: "Passport-size Photo of Authorized Person & Shop Photo" },
      { id: "DOC-012", documentName: "MCA Portal Verification Document (Board of Directors verification)" },
      { id: "DOC-013", documentName: "Bank Account Details with Cancelled Cheque" },
      { id: "DOC-014", documentName: "Audited Financial Statements (Last 24 months)" },
      { id: "DOC-015", documentName: "Post-Dated Cheques (PDCs) as per company policy" },
      { id: "DOC-016", documentName: "Personal Guarantee Agreement (signed by Chairman/Directors)" },
      { id: "DOC-017", documentName: "Tripartite Agreement with Lending Bank (if applicable)" },
      { id: "DOC-018", documentName: "Proof of Godown/Storage Facility (ownership/lease documents)" },
      { id: "DOC-019", documentName: "List of Member Farmers (minimum 100 samples with contact details)" },
      { id: "DOC-020", documentName: "Delivery Authorization Letter (naming individuals authorized to sign delivery documents)" },
      { id: "DOC-021", documentName: "Latest GST Return Copy" },
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
    const fpo = parsed.find((c) => c.customerType === "FPO");
    if (!fpo || !fpo.documentTypes || fpo.documentTypes.length < 21) {
      localStorage.removeItem(STORAGE_KEY);
      return CUSTOMER_TYPE_SEED;
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
