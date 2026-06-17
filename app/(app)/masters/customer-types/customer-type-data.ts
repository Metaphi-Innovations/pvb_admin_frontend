"use client";

export interface CustomerTypeDocument {
  id: string;
  documentTypeId: string;
  documentName: string;
}

export interface CustomerTypeRecord {
  id: number;
  customerTypeCode: string;
  customerType: string;
  description: string;
  documentTypes: CustomerTypeDocument[];
  status: "active" | "inactive";
}

export const CUSTOMER_TYPE_SEED: CustomerTypeRecord[] = [
  {
    id: 1,
    customerTypeCode: "CTY-001",
    customerType: "Farmer",
    description: "Standard farm customer",
    status: "active",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-005", documentName: "Aadhaar Card" },
      { id: "DOC-002", documentTypeId: "DT-010", documentName: "Bank Account Details with Cancelled Cheque" },
    ],
  },
  {
    id: 2,
    customerTypeCode: "CTY-002",
    customerType: "Distributor",
    description: "Wholesale distributor partner",
    status: "active",
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
    customerTypeCode: "CTY-003",
    customerType: "Dealer",
    description: "Registered dealer merchant",
    status: "active",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-003", documentName: "GST Registration Copy" },
      { id: "DOC-002", documentTypeId: "DT-006", documentName: "Fertilizer License" },
      { id: "DOC-003", documentTypeId: "DT-008", documentName: "Shop & Establishment Registration Certificate" },
    ],
  },
  {
    id: 4,
    customerTypeCode: "CTY-004",
    customerType: "Retailer",
    description: "Direct retail store outlet",
    status: "inactive",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-008", documentName: "Shop & Establishment Registration Certificate" },
    ],
  },
  {
    id: 5,
    customerTypeCode: "CTY-005",
    customerType: "C&F",
    description: "Carrying and Forwarding agent",
    status: "active",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-003", documentName: "GST Registration Copy" },
      { id: "DOC-002", documentTypeId: "DT-014", documentName: "Godown/Storage Facility Proof" },
      { id: "DOC-003", documentTypeId: "DT-015", documentName: "Delivery Authorization Letter" },
    ],
  },
  {
    id: 6,
    customerTypeCode: "CTY-006",
    customerType: "CBBO",
    description: "Cluster Based Business Organization",
    status: "inactive",
    documentTypes: [
      { id: "DOC-001", documentTypeId: "DT-011", documentName: "Audited Financial Statements" },
    ],
  },
  {
    id: 7,
    customerTypeCode: "CTY-007",
    customerType: "FPO",
    description: "Farmer Producer Organization",
    status: "active",
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
      const migrated = parsed.map((item, idx) => ({ ...item, status: CUSTOMER_TYPE_SEED[idx]?.status ?? "active" }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (firstDoc && !("documentTypeId" in firstDoc)) {
      // Data is old format, clear storage to force reload seed data in new format
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

export function generateCustomerTypeCode(list: CustomerTypeRecord[]): string {
  const max = list.reduce((acc, item) => {
    const match = item.customerTypeCode?.match(/CTY-(\d+)/i);
    const num = match ? Number(match[1]) : 0;
    return Math.max(acc, num);
  }, 0);
  return `CTY-${String(max + 1).padStart(3, "0")}`;
}
