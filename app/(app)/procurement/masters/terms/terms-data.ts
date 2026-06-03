import { nextId, todayStr } from "@/lib/procurement/utils";

export type TermApplicableTo = "pr" | "po" | "both";
export type TermStatus = "active" | "inactive";

export interface TermsMaster {
  id: number;
  termTitle: string;
  termContent: string;
  applicableTo: TermApplicableTo;
  defaultTerm: boolean;
  status: TermStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export const APPLICABLE_TO_OPTIONS = [
  { value: "pr", label: "Purchase Request" },
  { value: "po", label: "Purchase Order" },
  { value: "both", label: "Both" },
];

export const APPLICABLE_TO_LABELS: Record<TermApplicableTo, string> = {
  pr: "PR",
  po: "PO",
  both: "Both",
};

const STORAGE_KEY = "ds_procurement_terms";

const SEED: TermsMaster[] = [
  {
    id: 1,
    termTitle: "Payment Terms",
    termContent: "Payment shall be made within the credit period agreed in the PO. Late payments may attract interest as per company policy.",
    applicableTo: "po",
    defaultTerm: true,
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-05",
    updatedBy: "Admin",
    updatedDate: "2024-01-05",
  },
  {
    id: 2,
    termTitle: "Delivery & Inspection",
    termContent: "Goods must be delivered to the shipping address specified. Buyer reserves the right to inspect and reject non-conforming goods.",
    applicableTo: "po",
    defaultTerm: true,
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-05",
    updatedBy: "Admin",
    updatedDate: "2024-01-05",
  },
  {
    id: 3,
    termTitle: "Warranty",
    termContent: "Supplier warrants that all products are free from defects and conform to applicable FCO / quality standards for the agreed period.",
    applicableTo: "both",
    defaultTerm: false,
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 4,
    termTitle: "PR Justification",
    termContent: "Requester confirms that the procurement is budget-approved and aligned with departmental requirements.",
    applicableTo: "pr",
    defaultTerm: true,
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
];

export function loadTermsMasters(): TermsMaster[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as TermsMaster[];
  } catch {
    return SEED;
  }
}

export function saveTermsMasters(list: TermsMaster[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getDefaultTermsFor(applicable: "pr" | "po"): TermsMaster[] {
  return loadTermsMasters().filter(
    (t) => t.status === "active" && t.defaultTerm && (t.applicableTo === applicable || t.applicableTo === "both"),
  );
}

export { todayStr, nextId };
