import { PROCUREMENT_APPROVAL, CURRENT_USER } from "@/lib/procurement/config";
import { nextId, todayStr } from "@/lib/procurement/utils";
import type { ActivityEntry } from "@/lib/procurement/types";

/** Visible in listing tabs */
export type PRListStatus = "draft" | "pending_approval" | "approved" | "rejected";

/** Legacy / system statuses still stored but only shown under All */
export type PRStatus =
  | PRListStatus
  | "partially_converted"
  | "fully_converted"
  | "closed";

export interface PRAttachment {
  uid: string;
  name: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface PRLineItem {
  uid: string;
  productId: number;
  productCode: string;
  productName: string;
  description: string;
  uom: string;
  requestedQty: number;
  remarks: string;
}

export interface PurchaseRequest {
  id: number;
  prNumber: string;
  prDate: string;
  requestedBy: string;
  requiredByDate: string;
  remarks: string;
  status: PRStatus;
  lines: PRLineItem[];
  attachments: PRAttachment[];
  convertedPoIds: number[];
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  approvedBy: string;
  approvedDate: string;
  activity: ActivityEntry[];
}

const STORAGE_KEY = "ds_procurement_purchase_requests_v2";

const SEED: PurchaseRequest[] = [
  {
    id: 1,
    prNumber: "PR-2025-0001",
    prDate: "2025-02-01",
    requestedBy: "Rajesh Kumar",
    requiredByDate: "2025-02-15",
    remarks: "Q1 fertilizer stock replenishment. Prefer Agro Chem as vendor.",
    status: "approved",
    lines: [
      {
        uid: "l1",
        productId: 1,
        productCode: "PRD-001",
        productName: "NPK 19:19:19",
        description: "Balanced NPK fertilizer",
        uom: "KG",
        requestedQty: 500,
        remarks: "",
      },
      {
        uid: "l2",
        productId: 3,
        productCode: "PRD-003",
        productName: "Urea 46%",
        description: "Nitrogen fertilizer",
        uom: "KG",
        requestedQty: 300,
        remarks: "",
      },
    ],
    attachments: [],
    convertedPoIds: [],
    createdBy: "Rajesh Kumar",
    createdDate: "2025-02-01",
    updatedBy: "Admin",
    updatedDate: "2025-02-03",
    approvedBy: "Admin",
    approvedDate: "2025-02-03",
    activity: [
      { date: "2025-02-01", action: "Created", by: "Rajesh Kumar" },
      { date: "2025-02-02", action: "Submitted", by: "Rajesh Kumar" },
      { date: "2025-02-03", action: "Approved", by: "Admin" },
    ],
  },
  {
    id: 2,
    prNumber: "PR-2025-0002",
    prDate: "2025-02-10",
    requestedBy: "Priya Sharma",
    requiredByDate: "2025-02-25",
    remarks: "Field demo kits for Maharashtra region.",
    status: "pending_approval",
    lines: [
      {
        uid: "l1",
        productId: 9,
        productCode: "PRD-010",
        productName: "Manual Sprayer 16L",
        description: "Knapsack sprayer",
        uom: "PCS",
        requestedQty: 25,
        remarks: "",
      },
    ],
    attachments: [
      {
        uid: "a1",
        name: "demo_requirements.pdf",
        size: "248 KB",
        uploadedAt: "2025-02-10",
        uploadedBy: "Priya Sharma",
      },
    ],
    convertedPoIds: [],
    createdBy: "Priya Sharma",
    createdDate: "2025-02-10",
    updatedBy: "Priya Sharma",
    updatedDate: "2025-02-10",
    approvedBy: "",
    approvedDate: "",
    activity: [
      { date: "2025-02-10", action: "Created", by: "Priya Sharma" },
      { date: "2025-02-10", action: "Submitted", by: "Priya Sharma" },
    ],
  },
  {
    id: 3,
    prNumber: "PR-2025-0003",
    prDate: "2025-03-01",
    requestedBy: CURRENT_USER,
    requiredByDate: "2025-03-20",
    remarks: "Organic product trial stock.",
    status: "draft",
    lines: [
      {
        uid: "l1",
        productId: 7,
        productCode: "PRD-008",
        productName: "Vermicompost",
        description: "Organic compost",
        uom: "KG",
        requestedQty: 200,
        remarks: "",
      },
    ],
    attachments: [],
    convertedPoIds: [],
    createdBy: CURRENT_USER,
    createdDate: "2025-03-01",
    updatedBy: CURRENT_USER,
    updatedDate: "2025-03-01",
    approvedBy: "",
    approvedDate: "",
    activity: [{ date: "2025-03-01", action: "Created", by: CURRENT_USER }],
  },
  {
    id: 4,
    prNumber: "PR-2025-0004",
    prDate: "2025-01-18",
    requestedBy: "Suresh Mehta",
    requiredByDate: "2025-02-01",
    remarks: "Emergency pesticide procurement — rejected due to budget freeze.",
    status: "rejected",
    lines: [
      {
        uid: "l1",
        productId: 4,
        productCode: "PRD-004",
        productName: "Chlorpyrifos 20 EC",
        description: "Insecticide",
        uom: "LTR",
        requestedQty: 100,
        remarks: "",
      },
    ],
    attachments: [],
    convertedPoIds: [],
    createdBy: "Suresh Mehta",
    createdDate: "2025-01-18",
    updatedBy: "Admin",
    updatedDate: "2025-01-20",
    approvedBy: "",
    approvedDate: "",
    activity: [
      { date: "2025-01-18", action: "Created", by: "Suresh Mehta" },
      { date: "2025-01-19", action: "Submitted", by: "Suresh Mehta" },
      { date: "2025-01-20", action: "Rejected", by: "Admin", note: "Budget freeze Q1" },
    ],
  },
];

export function loadPurchaseRequests(): PurchaseRequest[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as PurchaseRequest[];
  } catch {
    return SEED;
  }
}

export function savePurchaseRequests(list: PurchaseRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getPRById(id: number): PurchaseRequest | undefined {
  return loadPurchaseRequests().find((p) => p.id === id);
}

export function generatePRNumber(list: PurchaseRequest[]): string {
  const year = new Date().getFullYear();
  const n = list.length + 1;
  return `PR-${year}-${String(n).padStart(5, "0")}`;
}

export function recalcPR(pr: PurchaseRequest): PurchaseRequest {
  return {
    ...pr,
    lines: pr.lines.filter((l) => l.productId > 0 || l.productName),
  };
}

export function submitPR(pr: PurchaseRequest): PurchaseRequest {
  const today = todayStr();
  const status: PRStatus = PROCUREMENT_APPROVAL.prEnabled ? "pending_approval" : "approved";
  return {
    ...pr,
    status,
    updatedBy: CURRENT_USER,
    updatedDate: today,
    approvedBy: status === "approved" ? "System" : "",
    approvedDate: status === "approved" ? today : "",
    activity: [
      ...pr.activity,
      { date: today, action: "Submitted", by: CURRENT_USER },
      ...(status === "approved"
        ? [{ date: today, action: "Approved", by: "System (auto)", note: "Approval disabled" }]
        : []),
    ],
  };
}

export function approvePR(pr: PurchaseRequest, note?: string): PurchaseRequest {
  const today = todayStr();
  return {
    ...pr,
    status: "approved",
    approvedBy: CURRENT_USER,
    approvedDate: today,
    updatedBy: CURRENT_USER,
    updatedDate: today,
    activity: [...pr.activity, { date: today, action: "Approved", by: CURRENT_USER, note }],
  };
}

export function rejectPR(pr: PurchaseRequest, reason?: string): PurchaseRequest {
  const today = todayStr();
  return {
    ...pr,
    status: "rejected",
    updatedBy: CURRENT_USER,
    updatedDate: today,
    activity: [...pr.activity, { date: today, action: "Rejected", by: CURRENT_USER, note: reason }],
  };
}

export const PR_STATUS_CFG: Record<
  PRStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  draft: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Draft" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-400", label: "Pending" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", label: "Rejected" },
  partially_converted: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", label: "Partial PO" },
  fully_converted: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Converted" },
  closed: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-500", label: "Closed" },
};

export const LIST_TAB_STATUSES: PRListStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
];

export { nextId, todayStr };
