import {
  CITY_CATEGORY_POLICY_OPTIONS,
  CURRENT_USER,
  HR_APPROVAL,
} from "@/lib/hr/config";
import { getHrEmployeeById } from "../../employees/employee-master-data";
import {
  getLevelByCode,
  loadApprovalHierarchy,
  resolveApproverForLevel,
  resolveRequiredLevels,
  type ApprovalHierarchyLevel,
} from "./approval-hierarchy-data";

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

export type ApprovalChannel = "web" | "mobile";

export interface ClaimApprovalTrailEntry {
  levelCode: string;
  levelLabel: string;
  action: "submitted" | "approved" | "rejected";
  actorName: string;
  actorRole: string;
  at: string;
  remarks: string;
  claimedAmount?: number;
  approvedAmount?: number;
  channel: ApprovalChannel;
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
  /** Multi-level approval */
  currentApprovalLevelCode: string | null;
  currentApprovalLevelLabel: string | null;
  requiredApprovalLevelCodes: string[];
  approvalTrail: ClaimApprovalTrailEntry[];
  submittedBy?: string;
  submittedAt?: string;
  finalApprovedAt?: string;
  accountsSyncedAt?: string;
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

const STORAGE_KEY = "ds_hr_tada_claims_v3";

export function getClaimedAmount(claim: TadaClaim): number {
  return claim.claimAmount;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function normalizeClaim(raw: TadaClaim): TadaClaim {
  const trail = raw.approvalTrail ?? [];
  const required = raw.requiredApprovalLevelCodes ?? [];
  return {
    ...raw,
    approvalTrail: trail,
    requiredApprovalLevelCodes: required,
    currentApprovalLevelCode: raw.currentApprovalLevelCode ?? null,
    currentApprovalLevelLabel: raw.currentApprovalLevelLabel ?? null,
  };
}

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
    currentApprovalLevelCode: "TM",
    currentApprovalLevelLabel: "Territory Manager",
    requiredApprovalLevelCodes: ["TM", "ASM"],
    approvalTrail: [
      {
        levelCode: "—",
        levelLabel: "Submission",
        action: "submitted",
        actorName: "Amit Deshmukh",
        actorRole: "Employee",
        at: "2026-05-28T09:05:00.000Z",
        remarks: "Submitted from mobile app",
        claimedAmount: 625,
        channel: "mobile",
      },
    ],
    submittedBy: "Amit Deshmukh",
    submittedAt: "2026-05-28T09:05:00.000Z",
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
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    requiredApprovalLevelCodes: ["TM", "ASM"],
    approvalTrail: [
      {
        levelCode: "—",
        levelLabel: "Submission",
        action: "submitted",
        actorName: "Priya Patil",
        actorRole: "Employee",
        at: "2026-05-20T10:00:00.000Z",
        remarks: "Submitted",
        claimedAmount: 4500,
        channel: "web",
      },
      {
        levelCode: "TM",
        levelLabel: "Territory Manager",
        action: "approved",
        actorName: "Admin",
        actorRole: "Territory Manager",
        at: "2026-05-21T11:00:00.000Z",
        remarks: "Approved",
        claimedAmount: 4500,
        approvedAmount: 4500,
        channel: "web",
      },
      {
        levelCode: "ASM",
        levelLabel: "Area Sales Manager",
        action: "approved",
        actorName: "Admin",
        actorRole: "Area Sales Manager",
        at: "2026-05-22T09:00:00.000Z",
        remarks: "Final approval",
        approvedAmount: 4500,
        channel: "web",
      },
    ],
    finalApprovedAt: "2026-05-22T09:00:00.000Z",
    paymentStatus: "sent_to_accounts",
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
      currentApprovalLevelCode: (c.currentApprovalLevelCode as string) ?? null,
      currentApprovalLevelLabel: (c.currentApprovalLevelLabel as string) ?? null,
      requiredApprovalLevelCodes: (c.requiredApprovalLevelCodes as string[]) ?? [],
      approvalTrail: (c.approvalTrail as ClaimApprovalTrailEntry[]) ?? [],
      submittedBy: c.submittedBy as string | undefined,
      submittedAt: c.submittedAt as string | undefined,
      finalApprovedAt: c.finalApprovedAt as string | undefined,
      accountsSyncedAt: c.accountsSyncedAt as string | undefined,
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
    return (JSON.parse(raw) as TadaClaim[]).map(normalizeClaim);
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
    currentApprovalLevelCode: existing?.currentApprovalLevelCode ?? null,
    currentApprovalLevelLabel: existing?.currentApprovalLevelLabel ?? null,
    requiredApprovalLevelCodes: existing?.requiredApprovalLevelCodes ?? [],
    approvalTrail: existing?.approvalTrail ?? [],
    submittedBy: existing?.submittedBy,
    submittedAt: existing?.submittedAt,
    finalApprovedAt: existing?.finalApprovedAt,
    accountsSyncedAt: existing?.accountsSyncedAt,
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

function buildRequiredChain(claimAmount: number): {
  levels: ApprovalHierarchyLevel[];
  codes: string[];
} {
  const levels = resolveRequiredLevels(claimAmount);
  return { levels, codes: levels.map((l) => l.code) };
}

export function submitClaim(claim: TadaClaim, channel: ApprovalChannel = "web"): TadaClaim {
  const claimed = getClaimedAmount(claim);
  if (!HR_APPROVAL.tadaClaimEnabled) {
    return finalizeClaimApproval(claim, claimed, "Auto-approved", channel);
  }
  const { levels, codes } = buildRequiredChain(claimed);
  const first = levels[0];
  const trail: ClaimApprovalTrailEntry[] = [
    ...(claim.approvalTrail ?? []),
    {
      levelCode: "—",
      levelLabel: "Submission",
      action: "submitted",
      actorName: claim.employeeName,
      actorRole: "Employee",
      at: nowIso(),
      remarks: claim.remarks || "Claim submitted",
      claimedAmount: claimed,
      channel,
    },
  ];
  return {
    ...claim,
    status: "pending_approval",
    requiredApprovalLevelCodes: codes,
    currentApprovalLevelCode: first?.code ?? null,
    currentApprovalLevelLabel: first?.label ?? null,
    approvalTrail: trail,
    submittedBy: claim.employeeName,
    submittedAt: nowIso(),
    paymentReady: false,
    paymentStatus: "pending_payment",
    updatedBy: CURRENT_USER,
  };
}

export function getCurrentApprovalLevel(claim: TadaClaim): ApprovalHierarchyLevel | undefined {
  if (!claim.currentApprovalLevelCode) return undefined;
  return getLevelByCode(claim.currentApprovalLevelCode);
}

export function validatePartialApprovedAmount(claim: TadaClaim, amount: number): string | null {
  const claimed = getClaimedAmount(claim);
  if (amount <= 0) return "Approved amount must be greater than zero.";
  if (amount > claimed) return `Cannot exceed claimed amount (${claimed}).`;
  return null;
}

function advanceToNextLevel(
  claim: TadaClaim,
  approvedAmount: number,
  remarks: string,
  channel: ApprovalChannel,
): TadaClaim {
  const config = loadApprovalHierarchy();
  const chain = resolveRequiredLevels(getClaimedAmount(claim), config);
  const currentIdx = chain.findIndex((l) => l.code === claim.currentApprovalLevelCode);
  const level = currentIdx >= 0 ? chain[currentIdx] : chain[0];
  if (!level) return finalizeClaimApproval(claim, approvedAmount, remarks, channel);

  const approver = resolveApproverForLevel(level);
  const trail: ClaimApprovalTrailEntry[] = [
    ...claim.approvalTrail,
    {
      levelCode: level.code,
      levelLabel: level.label,
      action: "approved",
      actorName: approver.name,
      actorRole: approver.role,
      at: nowIso(),
      remarks: remarks || `Approved at ${level.label}`,
      claimedAmount: getClaimedAmount(claim),
      approvedAmount,
      channel,
    },
  ];

  const next = chain[currentIdx + 1];
  if (next) {
    return {
      ...claim,
      approvalTrail: trail,
      approvedAmount,
      currentApprovalLevelCode: next.code,
      currentApprovalLevelLabel: next.label,
      updatedBy: CURRENT_USER,
    };
  }
  return finalizeClaimApproval({ ...claim, approvalTrail: trail, approvedAmount }, approvedAmount, remarks, channel);
}

export function finalizeClaimApproval(
  claim: TadaClaim,
  approvedAmount: number,
  remarks: string,
  channel: ApprovalChannel = "web",
): TadaClaim {
  const ts = nowIso();
  return {
    ...claim,
    status: "approved",
    approvedAmount,
    approvedBy: CURRENT_USER,
    approvedAt: ts.slice(0, 10),
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    finalApprovedAt: ts,
    paymentReady: true,
    paymentStatus: "sent_to_accounts",
    rejectionRemarks: undefined,
    updatedBy: CURRENT_USER,
    expenseDetails: claim.expenseDetails.map((e) => ({
      ...e,
      approvedAmount: e.approvedAmount || e.claimedAmount,
    })),
  };
}

/** Approve at current hierarchy level; may advance or finalize */
export function approveClaim(
  claim: TadaClaim,
  approvedAmount: number,
  remarks?: string,
  channel: ApprovalChannel = "web",
): TadaClaim {
  const err = validatePartialApprovedAmount(claim, approvedAmount);
  if (err) throw new Error(err);
  if (claim.status !== "pending_approval" && claim.status !== "submitted") {
    return claim;
  }
  if (!claim.currentApprovalLevelCode) {
    return finalizeClaimApproval(claim, approvedAmount, remarks ?? "", channel);
  }
  return advanceToNextLevel(claim, approvedAmount, remarks ?? "", channel);
}

export function approveClaimFull(claim: TadaClaim, remarks?: string, channel: ApprovalChannel = "web"): TadaClaim {
  return approveClaim(claim, getClaimedAmount(claim), remarks, channel);
}

export function rejectClaim(
  claim: TadaClaim,
  remarks: string,
  channel: ApprovalChannel = "web",
): TadaClaim {
  const level = getCurrentApprovalLevel(claim);
  const approver = level ? resolveApproverForLevel(level) : { name: CURRENT_USER, role: "Approver" };
  return {
    ...claim,
    status: "rejected",
    rejectionRemarks: remarks,
    paymentReady: false,
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    approvalTrail: [
      ...claim.approvalTrail,
      {
        levelCode: level?.code ?? "—",
        levelLabel: level?.label ?? "Rejection",
        action: "rejected",
        actorName: approver.name,
        actorRole: approver.role,
        at: nowIso(),
        remarks,
        claimedAmount: getClaimedAmount(claim),
        channel,
      },
    ],
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
