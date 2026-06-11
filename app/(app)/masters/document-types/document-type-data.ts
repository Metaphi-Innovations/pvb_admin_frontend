// Document Type Master Data & Storage Helpers

export interface DocumentTypeMaster {
  id: string; // e.g. "DT-001"
  documentTypeCode: string;
  title: string;
  description: string;
  status: "Active" | "Inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export const SEED_DOCUMENT_TYPES: DocumentTypeMaster[] = [
  { id: "DT-001", documentTypeCode: "DTC-001", title: "Letter of Interest", description: "Letter expressing interest in distributorship or dealership", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-002", documentTypeCode: "DTC-002", title: "FPO Registration Certificate", description: "Certified registration certificate of the Farmer Producer Organization", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-003", documentTypeCode: "DTC-003", title: "GST Registration Copy", description: "Copy of GST certificate containing registration details", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-004", documentTypeCode: "DTC-004", title: "PAN Card", description: "Copy of Permanent Account Number card", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-005", documentTypeCode: "DTC-005", title: "Aadhaar Card", description: "Copy of Aadhaar card for identification check", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-006", documentTypeCode: "DTC-006", title: "Fertilizer License", description: "Valid license issued for fertilizer distribution or selling", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-007", documentTypeCode: "DTC-007", title: "Pesticide License", description: "Valid license issued under the Insecticides Act for pesticide trade", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-008", documentTypeCode: "DTC-008", title: "Shop & Establishment Registration Certificate", description: "Certificate issued for the shop or commercial establishment", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-009", documentTypeCode: "DTC-009", title: "Board Resolution", description: "Resolution passed by the board of directors authorizing operations", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-010", documentTypeCode: "DTC-010", title: "Bank Account Details with Cancelled Cheque", description: "Details of bank account along with a cancelled cheque", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-011", documentTypeCode: "DTC-011", title: "Audited Financial Statements", description: "Financial statements audited by a certified accountant for past periods", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-012", documentTypeCode: "DTC-012", title: "Post-Dated Cheques", description: "Security post-dated cheques as per company policy", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-013", documentTypeCode: "DTC-013", title: "Personal Guarantee Agreement", description: "Agreement of personal guarantee signed by the directors/partners", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-014", documentTypeCode: "DTC-014", title: "Godown/Storage Facility Proof", description: "Ownership or lease agreement proof for the storage facility", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-015", documentTypeCode: "DTC-015", title: "Delivery Authorization Letter", description: "Letter naming individuals authorized to sign delivery receipts", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" },
  { id: "DT-016", documentTypeCode: "DTC-016", title: "Latest GST Return Copy", description: "Copy of the most recent GST return filed by the business", status: "Active", createdBy: "Admin", createdDate: "2026-06-08", updatedBy: "Admin", updatedDate: "2026-06-08" }
];

const STORAGE_KEY = "ds_document_types";

export function loadDocumentTypes(): DocumentTypeMaster[] {
  if (typeof window === "undefined") return SEED_DOCUMENT_TYPES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_DOCUMENT_TYPES;
    const parsed = JSON.parse(raw) as DocumentTypeMaster[];
    
    // Check if the loaded data has the description field
    const firstDoc = parsed[0];
    if (firstDoc && !("documentTypeCode" in firstDoc)) {
      // Data is old format, clear storage to force reload seed data in new format
      localStorage.removeItem(STORAGE_KEY);
      return SEED_DOCUMENT_TYPES;
    }
    return parsed;
  } catch {
    return SEED_DOCUMENT_TYPES;
  }
}

export function saveDocumentTypes(data: DocumentTypeMaster[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function generateNextId(list: DocumentTypeMaster[]): string {
  const ids = list.map(d => {
    const num = parseInt(d.id.replace("DT-", ""), 10);
    return isNaN(num) ? 0 : num;
  });
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `DT-${String(max + 1).padStart(3, "0")}`;
}

export function generateNextDocumentTypeCode(list: DocumentTypeMaster[]): string {
  const nums = list
    .map((d) => {
      const match = d.documentTypeCode?.match(/DTC-(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `DTC-${String(next).padStart(3, "0")}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
