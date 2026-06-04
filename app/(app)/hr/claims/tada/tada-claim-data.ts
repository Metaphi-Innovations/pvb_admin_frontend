import {
  CITY_CATEGORY_POLICY_OPTIONS,
  CURRENT_USER,
  HR_APPROVAL,
} from "@/lib/hr/config";
import { getHrEmployeeById } from "../../employees/employee-master-data";

export type ClaimStatus =
  | "draft"
  | "submitted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "paid";

export type PaymentStatus = "pending_payment" | "sent_to_accounts" | "paid";

export interface ClaimAttachment {
  id: string;
  documentName: string;
  fileName: string;
}

export interface TadaTravelDetail {
  id: string;
  travelDate: string;
  fromLocation: string;
  toLocation: string;
  cityCategory: string;
  travelMode: string;
  distanceKm: number;
  ratePerKm: number;
  amount: number;
}

export interface TadaExpenseDetail {
  id: string;
  expenseType: string;
  billDate: string;
  billNo: string;
  claimedAmount: number;
  approvedAmount: number;
  remarks: string;
}

export interface TadaClaim {
  id: number;
  claimNumber: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  reportingManager: string;
  claimDate: string;
  periodFrom: string;
  periodTo: string;
  claimType: string;
  remarks: string;
  travelDetails: TadaTravelDetail[];
  expenseDetails: TadaExpenseDetail[];
  attachments: ClaimAttachment[];
  status: ClaimStatus;
  claimAmount: number;
  approvedAmount: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectionRemarks?: string;
  paymentStatus: PaymentStatus;
  paymentReady: boolean;
  createdBy: string;
  updatedBy: string;
}

export interface TadaClaimFormValues {
  employeeId: number | null;
  designation: string;
  reportingManager: string;
  claimDate: string;
  periodFrom: string;
  periodTo: string;
  claimType: string;
  remarks: string;
  travelDetails: TadaTravelDetail[];
  expenseDetails: TadaExpenseDetail[];
  attachments: ClaimAttachment[];
}

const STORAGE_KEY = "ds_hr_tada_claims_v2";

export function newRowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_TRAVEL: TadaTravelDetail = {
  id: "",
  travelDate: "",
  fromLocation: "",
  toLocation: "",
  cityCategory: CITY_CATEGORY_POLICY_OPTIONS[2],
  travelMode: "Taxi / Auto",
  distanceKm: 0,
  ratePerKm: 0,
  amount: 0,
};

export const DEFAULT_EXPENSE: TadaExpenseDetail = {
  id: "",
  expenseType: "Travel",
  billDate: "",
  billNo: "",
  claimedAmount: 0,
  approvedAmount: 0,
  remarks: "",
};

export const DEFAULT_CLAIM_FORM: TadaClaimFormValues = {
  employeeId: null,
  designation: "",
  reportingManager: "",
  claimDate: new Date().toISOString().slice(0, 10),
  periodFrom: "",
  periodTo: "",
  claimType: "travel",
  remarks: "",
  travelDetails: [{ ...DEFAULT_TRAVEL, id: newRowId("tr") }],
  expenseDetails: [{ ...DEFAULT_EXPENSE, id: newRowId("ex") }],
  attachments: [],
};

const SEED: TadaClaim[] = [
  {
    id: 1,
    claimNumber: "TAC-2026-0001",
    employeeId: 3,
    employeeCode: "EMP-0003",
    employeeName: "Amit Deshmukh",
    designation: "Territory Manager",
    reportingManager: "Rahul Sharma",
    claimDate: "2026-05-28",
    periodFrom: "2026-05-01",
    periodTo: "2026-05-15",
    claimType: "km_reimbursement",
    remarks: "May field visits",
    travelDetails: [
      {
        id: "tr1",
        travelDate: "2026-05-05",
        fromLocation: "Nagpur",
        toLocation: "Wardha",
        cityCategory: "Others",
        travelMode: "Own Two-Wheeler",
        distanceKm: 85,
        ratePerKm: 5,
        amount: 425,
      },
    ],
    expenseDetails: [
      {
        id: "ex1",
        expenseType: "Incidental",
        billDate: "2026-05-05",
        billNo: "—",
        claimedAmount: 200,
        approvedAmount: 0,
        remarks: "Meals",
      },
    ],
    attachments: [
      { id: "att1", documentName: "Fuel Receipt", fileName: "fuel_receipt_may05.pdf" },
    ],
    status: "pending_approval",
    claimAmount: 625,
    approvedAmount: 0,
    paymentStatus: "pending_payment",
    paymentReady: false,
    createdBy: "Amit Deshmukh",
    updatedBy: "Amit Deshmukh",
  },
  {
    id: 2,
    claimNumber: "TAC-2026-0002",
    employeeId: 2,
    employeeCode: "EMP-0002",
    employeeName: "Priya Patil",
    designation: "Area Sales Manager",
    reportingManager: "Rahul Sharma",
    claimDate: "2026-05-20",
    periodFrom: "2026-05-10",
    periodTo: "2026-05-18",
    claimType: "lodging",
    remarks: "Mumbai dealer meet",
    travelDetails: [],
    expenseDetails: [
      {
        id: "ex2",
        expenseType: "Lodging",
        billDate: "2026-05-12",
        billNo: "HTL-8821",
        claimedAmount: 4500,
        approvedAmount: 4500,
        remarks: "Hotel invoice",
      },
    ],
    attachments: [
      { id: "att2", documentName: "Hotel Bill", fileName: "hotel_mumbai.pdf" },
    ],
    status: "approved",
    claimAmount: 4500,
    approvedAmount: 4500,
    approvedBy: "Admin",
    approvedAt: "2026-05-22",
    paymentStatus: "pending_payment",
    paymentReady: true,
    createdBy: "Priya Patil",
    updatedBy: "Admin",
  },
];

function migrateLegacy(raw: unknown): TadaClaim[] {
  const list = raw as Array<Record<string, unknown>>;
  return list.map((c) => {
    if (Array.isArray(c.travelDetails)) return c as unknown as TadaClaim;
    const lines = (c.lines as Array<Record<string, unknown>>) ?? [];
    const travelDetails: TadaTravelDetail[] = lines.map((l) => ({
      id: String(l.id ?? newRowId("tr")),
      travelDate: String(l.travelDate ?? ""),
      fromLocation: String(l.fromLocation ?? ""),
      toLocation: String(l.toLocation ?? ""),
      cityCategory: "Others",
      travelMode: "Taxi / Auto",
      distanceKm: Number(l.distance ?? 0),
      ratePerKm: 0,
      amount: Number(l.amount ?? 0),
    }));
    const expenseDetails: TadaExpenseDetail[] = lines
      .filter((l) => l.claimType !== "travel")
      .map((l) => ({
        id: String(l.id ?? newRowId("ex")),
        expenseType: String(l.claimType ?? "Other"),
        billDate: String(l.travelDate ?? ""),
        billNo: "",
        claimedAmount: Number(l.amount ?? 0),
        approvedAmount: 0,
        remarks: String(l.remarks ?? ""),
      }));
    const oldAtt = c.attachments as string[] | undefined;
    const attachments: ClaimAttachment[] = (oldAtt ?? []).map((name, i) => ({
      id: `att-m-${i}`,
      documentName: name,
      fileName: name,
    }));
    return {
      id: Number(c.id),
      claimNumber: String(c.claimNumber),
      employeeId: Number(c.employeeId),
      employeeCode: String(c.employeeCode ?? ""),
      employeeName: String(c.employeeName ?? ""),
      designation: String(c.designation ?? ""),
      reportingManager: String(c.reportingManager ?? "—"),
      claimDate: String(c.claimDate),
      periodFrom: String(c.periodFrom),
      periodTo: String(c.periodTo),
      claimType: String(c.claimType ?? "travel"),
      remarks: String(c.remarks ?? ""),
      travelDetails,
      expenseDetails: expenseDetails.length
        ? expenseDetails
        : [{ ...DEFAULT_EXPENSE, id: newRowId("ex") }],
      attachments,
      status: c.status as ClaimStatus,
      claimAmount: Number(c.claimAmount ?? 0),
      approvedAmount: Number(c.approvedAmount ?? c.claimAmount ?? 0),
      approvedBy: c.approvedBy as string | undefined,
      approvedAt: c.approvedAt as string | undefined,
      rejectionRemarks: c.rejectionRemarks as string | undefined,
      paymentStatus: (c.paymentStatus as PaymentStatus) ?? "pending_payment",
      paymentReady: Boolean(c.paymentReady),
      createdBy: String(c.createdBy ?? CURRENT_USER),
      updatedBy: String(c.updatedBy ?? CURRENT_USER),
    };
  });
}

export function loadTadaClaims(): TadaClaim[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("ds_hr_tada_claims_v1");
      if (legacy) {
        const migrated = migrateLegacy(JSON.parse(legacy));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as TadaClaim[];
  } catch {
    return SEED;
  }
}

export function saveTadaClaims(list: TadaClaim[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getTadaClaimById(id: number): TadaClaim | undefined {
  return loadTadaClaims().find((c) => c.id === id);
}

export function generateClaimNumber(): string {
  const list = loadTadaClaims();
  const year = new Date().getFullYear();
  const count = list.filter((c) => c.claimNumber.includes(String(year))).length + 1;
  return `TAC-${year}-${String(count).padStart(4, "0")}`;
}

export function sumTravelAmounts(details: TadaTravelDetail[]): number {
  return details.reduce((s, d) => s + (Number(d.amount) || 0), 0);
}

export function sumExpenseClaimed(details: TadaExpenseDetail[]): number {
  return details.reduce((s, d) => s + (Number(d.claimedAmount) || 0), 0);
}

export function sumClaimAmount(f: TadaClaimFormValues): number {
  return sumTravelAmounts(f.travelDetails) + sumExpenseClaimed(f.expenseDetails);
}

export function employeeFieldsForClaim(employeeId: number | null): {
  designation: string;
  reportingManager: string;
} {
  if (!employeeId) return { designation: "", reportingManager: "" };
  const emp = getHrEmployeeById(employeeId);
  return {
    designation: emp?.designation ?? "",
    reportingManager: emp?.reportingManagerName ?? "—",
  };
}

export function validateClaimForm(f: TadaClaimFormValues): string | null {
  if (!f.employeeId) return "Employee is required.";
  if (!f.claimDate) return "Claim date is required.";
  if (!f.periodFrom || !f.periodTo) return "Claim period is required.";
  if (f.periodFrom > f.periodTo) return "Period to must be after period from.";
  if (!f.claimType) return "Claim type is required.";
  const total = sumClaimAmount(f);
  if (total <= 0) return "Claim amount must be greater than zero.";
  for (const t of f.travelDetails) {
    if (t.fromLocation && !t.travelDate) return "Travel date is required for travel rows.";
  }
  for (const e of f.expenseDetails) {
    if (e.claimedAmount > 0 && !e.billDate) return "Bill date is required when expense amount is entered.";
  }
  return null;
}

export function formToClaim(
  f: TadaClaimFormValues,
  id: number,
  claimNumber: string,
  status: ClaimStatus,
  existing?: TadaClaim,
): TadaClaim {
  const emp = f.employeeId ? getHrEmployeeById(f.employeeId) : undefined;
  const amount = sumClaimAmount(f);
  return {
    id,
    claimNumber,
    employeeId: f.employeeId!,
    employeeCode: emp?.employeeCode ?? "",
    employeeName: emp?.employeeName ?? "",
    designation: f.designation,
    reportingManager: f.reportingManager,
    claimDate: f.claimDate,
    periodFrom: f.periodFrom,
    periodTo: f.periodTo,
    claimType: f.claimType,
    remarks: f.remarks,
    travelDetails: f.travelDetails,
    expenseDetails: f.expenseDetails,
    attachments: f.attachments,
    status,
    claimAmount: amount,
    approvedAmount: existing?.approvedAmount ?? 0,
    approvedBy: existing?.approvedBy,
    approvedAt: existing?.approvedAt,
    rejectionRemarks: existing?.rejectionRemarks,
    paymentStatus: existing?.paymentStatus ?? "pending_payment",
    paymentReady: existing?.paymentReady ?? false,
    createdBy: existing?.createdBy ?? CURRENT_USER,
    updatedBy: CURRENT_USER,
  };
}

export function claimToForm(c: TadaClaim): TadaClaimFormValues {
  return {
    employeeId: c.employeeId,
    designation: c.designation,
    reportingManager: c.reportingManager,
    claimDate: c.claimDate,
    periodFrom: c.periodFrom,
    periodTo: c.periodTo,
    claimType: c.claimType,
    remarks: c.remarks,
    travelDetails: c.travelDetails.length
      ? c.travelDetails
      : [{ ...DEFAULT_TRAVEL, id: newRowId("tr") }],
    expenseDetails: c.expenseDetails.length
      ? c.expenseDetails
      : [{ ...DEFAULT_EXPENSE, id: newRowId("ex") }],
    attachments: c.attachments,
  };
}

export function submitClaim(claim: TadaClaim): TadaClaim {
  const status: ClaimStatus = HR_APPROVAL.tadaClaimEnabled ? "pending_approval" : "approved";
  return {
    ...claim,
    status,
    paymentReady: status === "approved",
    paymentStatus: status === "approved" ? "pending_payment" : claim.paymentStatus,
    updatedBy: CURRENT_USER,
  };
}

export function approveClaim(claim: TadaClaim, remarks?: string): TadaClaim {
  const approvedAmount =
    sumExpenseClaimed(
      claim.expenseDetails.map((e) => ({
        ...e,
        approvedAmount: e.approvedAmount || e.claimedAmount,
      })),
    ) + sumTravelAmounts(claim.travelDetails);
  return {
    ...claim,
    status: "approved",
    approvedAmount,
    approvedBy: CURRENT_USER,
    approvedAt: new Date().toISOString().slice(0, 10),
    rejectionRemarks: remarks,
    paymentReady: true,
    paymentStatus: "pending_payment",
    expenseDetails: claim.expenseDetails.map((e) => ({
      ...e,
      approvedAmount: e.approvedAmount || e.claimedAmount,
    })),
    updatedBy: CURRENT_USER,
  };
}

export function rejectClaim(claim: TadaClaim, remarks: string): TadaClaim {
  return {
    ...claim,
    status: "rejected",
    rejectionRemarks: remarks,
    paymentReady: false,
    updatedBy: CURRENT_USER,
  };
}

export function sendClaimToAccounts(claim: TadaClaim): TadaClaim {
  return {
    ...claim,
    paymentStatus: "sent_to_accounts",
    updatedBy: CURRENT_USER,
  };
}

export function getApprovedClaimsForPayment(): TadaClaim[] {
  return loadTadaClaims().filter((c) => c.status === "approved");
}

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};
