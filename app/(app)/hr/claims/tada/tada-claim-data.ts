import { CURRENT_USER, HR_APPROVAL } from "@/lib/hr/config";
import { getHrEmployeeById } from "../../employees/employee-master-data";
import {
  getReportingRoleName,
  isTadaApplicableForRole,
  loadClaimCategories,
  resolveRoleIdFromDesignation,
  type CityCategory,
  type TravelMode,
  type TravelType,
  type VehicleType,
  type StayType,
} from "../../sales-force-policy/tada-policy-data";
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

export type ApprovalStatus =
  | "submitted"
  | "pending_manager_approval"
  | "pending_higher_approval"
  | "hierarchy_complete"
  | "rejected";

export type HrClaimStatus =
  | "awaiting_hierarchy"
  | "pending_hr_review"
  | "hr_approved"
  | "hr_rejected"
  | "sent_back"
  | "on_hold"
  | "ready_for_payment"
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
  action: "submitted" | "approved" | "rejected" | "sent_back" | "on_hold" | "hr_approved" | "hr_rejected";
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
  approvalStatus: ApprovalStatus;
  hrStatus: HrClaimStatus;
  roleId?: number;
  territory?: string;
  travelTypeLabel?: string;
  claimCategoryName?: string;
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
  updatedAt: string;
}

export interface TadaClaimFormValues {
  employeeId: number | null;
  roleId: number | null;
  designation: string;
  reportingManager: string;
  claimDate: string;
  travelType: TravelType;
  travelMode?: TravelMode;
  travelClass?: string;
  fromCity: string;
  toCity: string;
  cityCategory: CityCategory;
  periodFrom: string;
  periodTo: string;
  purpose: string;
  claimCategoryId: number;
  claimedAmount: number;
  stayType?: StayType;
  hotelName: string;
  nights: number;
  localCity: string;
  localMode: string;
  vehicleType?: VehicleType;
  fromLocation: string;
  toLocation: string;
  km: number;
  ratePerKm: number;
  incidentalDays: number;
  declarationAccepted: boolean;
  claimType: string;
  remarks: string;
  travelDetails: TadaTravelDetail[];
  expenseDetails: TadaExpenseDetail[];
  attachments: ClaimAttachment[];
}

const STORAGE_KEY = "ds_hr_tada_claims_v4";

export type HrClaimListTab = "pending_hr" | "hr_approved" | "hr_rejected" | "sent_back" | "all";

export const HR_CLAIM_LIST_TABS: { id: HrClaimListTab; label: string }[] = [
  { id: "pending_hr", label: "Pending HR Review" },
  { id: "hr_approved", label: "HR Approved" },
  { id: "hr_rejected", label: "HR Rejected" },
  { id: "sent_back", label: "Sent Back" },
  { id: "all", label: "All Claims" },
];

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  submitted: "Submitted",
  pending_manager_approval: "Pending Manager Approval",
  pending_higher_approval: "Pending Higher Approval",
  hierarchy_complete: "Hierarchy Approved",
  rejected: "Rejected by Manager",
};

export const HR_STATUS_LABEL: Record<HrClaimStatus, string> = {
  awaiting_hierarchy: "Awaiting Hierarchy",
  pending_hr_review: "Pending HR Review",
  hr_approved: "HR Approved",
  hr_rejected: "HR Rejected",
  sent_back: "Sent Back",
  on_hold: "On Hold",
  ready_for_payment: "Ready for Payment",
  paid: "Paid",
};

export function filterClaimsByHrTab(claims: TadaClaim[], tab: HrClaimListTab): TadaClaim[] {
  const submitted = claims.filter((c) => c.status !== "draft");
  switch (tab) {
    case "pending_hr":
      return submitted.filter((c) => c.hrStatus === "pending_hr_review" || c.hrStatus === "on_hold");
    case "hr_approved":
      return submitted.filter((c) =>
        ["hr_approved", "ready_for_payment", "paid"].includes(c.hrStatus),
      );
    case "hr_rejected":
      return submitted.filter((c) => c.hrStatus === "hr_rejected");
    case "sent_back":
      return submitted.filter((c) => c.hrStatus === "sent_back");
    default:
      return submitted;
  }
}

export interface HrClaimFilters {
  employeeId?: number | "all";
  roleId?: number | "all";
  claimCategory?: string;
  travelType?: string;
  policyStatus?: string;
  approvalStatus?: string;
  hrStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function applyHrClaimFilters(claims: TadaClaim[], filters: HrClaimFilters): TadaClaim[] {
  let r = [...claims];
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    r = r.filter(
      (c) =>
        c.claimNumber.toLowerCase().includes(q) ||
        c.employeeName.toLowerCase().includes(q) ||
        c.employeeCode.toLowerCase().includes(q),
    );
  }
  if (filters.employeeId && filters.employeeId !== "all") {
    r = r.filter((c) => c.employeeId === filters.employeeId);
  }
  if (filters.roleId && filters.roleId !== "all") {
    r = r.filter((c) => {
      const rid = c.roleId ?? resolveRoleIdFromDesignation(c.designation);
      return rid === filters.roleId;
    });
  }
  if (filters.claimCategory && filters.claimCategory !== "all") {
    r = r.filter((c) => (c.claimCategoryName ?? c.expenseDetails[0]?.expenseType) === filters.claimCategory);
  }
  if (filters.travelType && filters.travelType !== "all") {
    r = r.filter((c) => {
      const t = c.travelTypeLabel ?? (c.claimType.includes("local") ? "Local" : "Outstation");
      return t === filters.travelType;
    });
  }
  if (filters.approvalStatus && filters.approvalStatus !== "all") {
    r = r.filter((c) => c.approvalStatus === filters.approvalStatus);
  }
  if (filters.hrStatus && filters.hrStatus !== "all") {
    r = r.filter((c) => c.hrStatus === filters.hrStatus);
  }
  if (filters.dateFrom) r = r.filter((c) => (c.submittedAt ?? c.claimDate) >= filters.dateFrom!);
  if (filters.dateTo) r = r.filter((c) => (c.submittedAt ?? c.claimDate).slice(0, 10) <= filters.dateTo!);
  return r;
}

function enrichClaimMeta(claim: TadaClaim): TadaClaim {
  const emp = getHrEmployeeById(claim.employeeId);
  const roleId = claim.roleId ?? resolveRoleIdFromDesignation(claim.designation);
  return {
    ...claim,
    roleId: roleId ?? undefined,
    territory: claim.territory ?? emp?.branch ?? "—",
    travelTypeLabel: claim.travelTypeLabel ?? (claim.claimType.includes("local") ? "Local" : "Outstation"),
    claimCategoryName: claim.claimCategoryName ?? claim.expenseDetails[0]?.expenseType ?? "—",
  };
}

function resolveClaimCategoryId(expenseType: string): number {
  const cats = loadClaimCategories();
  const exact = cats.find((c) => c.claimCategoryName === expenseType);
  if (exact) return exact.id;
  const partial = cats.find((c) => expenseType.toLowerCase().includes(c.claimCategoryName.toLowerCase()));
  return partial?.id ?? cats[0]?.id ?? 1;
}

export function getClaimedAmount(claim: TadaClaim): number {
  return claim.claimAmount;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function inferApprovalStatus(c: TadaClaim): ApprovalStatus {
  if (c.approvalStatus) return c.approvalStatus;
  if (c.status === "rejected" && c.hrStatus !== "hr_rejected") return "rejected";
  if (c.status === "approved" || c.hrStatus === "pending_hr_review") return "hierarchy_complete";
  if (c.currentApprovalLevelCode) {
    const idx = c.requiredApprovalLevelCodes?.indexOf(c.currentApprovalLevelCode) ?? 0;
    return idx <= 0 ? "pending_manager_approval" : "pending_higher_approval";
  }
  if (c.submittedAt) return "submitted";
  return "submitted";
}

function inferHrStatus(c: TadaClaim): HrClaimStatus {
  if (c.hrStatus) return c.hrStatus;
  if (c.status === "paid" || c.paymentStatus === "paid") return "paid";
  if (c.approvalTrail?.some((t) => t.action === "hr_rejected")) return "hr_rejected";
  if (c.approvalTrail?.some((t) => t.action === "sent_back")) return "sent_back";
  if (c.approvalTrail?.some((t) => t.action === "on_hold")) return "on_hold";
  if (c.status === "rejected") return "awaiting_hierarchy";
  if (c.status === "approved" && c.paymentStatus === "sent_to_accounts") return "ready_for_payment";
  if (c.status === "approved") return "pending_hr_review";
  if (c.status === "pending_approval" || c.status === "submitted") return "awaiting_hierarchy";
  return "awaiting_hierarchy";
}

function normalizeClaim(raw: TadaClaim): TadaClaim {
  const trail = raw.approvalTrail ?? [];
  const required = raw.requiredApprovalLevelCodes ?? [];
  const base: TadaClaim = {
    ...raw,
    approvalTrail: trail,
    requiredApprovalLevelCodes: required,
    currentApprovalLevelCode: raw.currentApprovalLevelCode ?? null,
    currentApprovalLevelLabel: raw.currentApprovalLevelLabel ?? null,
    approvalStatus: inferApprovalStatus(raw),
    hrStatus: inferHrStatus(raw),
    updatedAt: raw.updatedAt ?? raw.submittedAt ?? raw.claimDate,
  };
  return enrichClaimMeta(base);
}

export function newRowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_TRAVEL: TadaTravelDetail = {
  id: "",
  travelDate: "",
  fromLocation: "",
  toLocation: "",
  cityCategory: "Other",
  travelMode: "Rail",
  distanceKm: 0,
  ratePerKm: 0,
  amount: 0,
};

export const DEFAULT_EXPENSE: TadaExpenseDetail = {
  id: "",
  expenseType: "Travel Fare",
  billDate: "",
  billNo: "",
  claimedAmount: 0,
  approvedAmount: 0,
  remarks: "",
};

export const DEFAULT_CLAIM_FORM: TadaClaimFormValues = {
  employeeId: null,
  roleId: null,
  designation: "",
  reportingManager: "",
  claimDate: new Date().toISOString().slice(0, 10),
  travelType: "Local Travel",
  fromCity: "",
  toCity: "",
  cityCategory: "Other",
  periodFrom: "",
  periodTo: "",
  purpose: "",
  claimCategoryId: 1,
  claimedAmount: 0,
  hotelName: "",
  nights: 0,
  localCity: "",
  localMode: "",
  fromLocation: "",
  toLocation: "",
  km: 0,
  ratePerKm: 0,
  incidentalDays: 0,
  declarationAccepted: false,
  claimType: "local_travel",
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
    claimDate: "2026-06-04",
    periodFrom: "2026-06-01",
    periodTo: "2026-06-03",
    claimType: "outstation_travel",
    travelTypeLabel: "Outstation",
    claimCategoryName: "Travel Fare",
    remarks: "Mumbai dealer meet",
    travelDetails: [{ id: "tr1", travelDate: "2026-06-01", fromLocation: "Nagpur", toLocation: "Mumbai", cityCategory: "Mega Metro", travelMode: "Rail", distanceKm: 0, ratePerKm: 0, amount: 1850 }],
    expenseDetails: [{ id: "ex1", expenseType: "Travel Fare", billDate: "2026-06-01", billNo: "TKT-4412", claimedAmount: 1850, approvedAmount: 0, remarks: "" }],
    attachments: [{ id: "att1", documentName: "Rail Ticket", fileName: "mumbai_ticket.pdf" }],
    status: "pending_approval",
    approvalStatus: "pending_higher_approval",
    hrStatus: "awaiting_hierarchy",
    claimAmount: 1850,
    approvedAmount: 0,
    currentApprovalLevelCode: "ASM",
    currentApprovalLevelLabel: "Area Sales Manager",
    requiredApprovalLevelCodes: ["ASM", "RSM"],
    approvalTrail: [
      { levelCode: "—", levelLabel: "Submission", action: "submitted", actorName: "Amit Deshmukh", actorRole: "Employee", at: "2026-06-04T08:00:00.000Z", remarks: "Submitted from mobile app", claimedAmount: 1850, channel: "mobile" },
      { levelCode: "ASM", levelLabel: "Area Sales Manager", action: "approved", actorName: "Priya Patil", actorRole: "Area Sales Manager", at: "2026-06-04T11:00:00.000Z", remarks: "Approved at ASM level", claimedAmount: 1850, approvedAmount: 1850, channel: "mobile" },
    ],
    submittedBy: "Amit Deshmukh",
    submittedAt: "2026-06-04T08:00:00.000Z",
    paymentStatus: "pending_payment",
    paymentReady: false,
    createdBy: "Amit Deshmukh",
    updatedBy: "Priya Patil",
    updatedAt: "2026-06-04T11:00:00.000Z",
  },
  {
    id: 2,
    claimNumber: "TAC-2026-0002",
    employeeId: 3,
    employeeCode: "EMP-0003",
    employeeName: "Amit Deshmukh",
    designation: "Territory Manager",
    reportingManager: "Rahul Sharma",
    claimDate: "2026-05-28",
    periodFrom: "2026-05-20",
    periodTo: "2026-05-22",
    claimType: "outstation_travel",
    travelTypeLabel: "Outstation",
    claimCategoryName: "Lodging",
    remarks: "Pune field visit",
    travelDetails: [{ id: "tr2", travelDate: "2026-05-20", fromLocation: "Nagpur", toLocation: "Pune", cityCategory: "Metro", travelMode: "Bus", distanceKm: 0, ratePerKm: 0, amount: 0 }],
    expenseDetails: [{ id: "ex2", expenseType: "Lodging", billDate: "2026-05-21", billNo: "HTL-8821", claimedAmount: 4200, approvedAmount: 4200, remarks: "Hotel stay 2 nights" }],
    attachments: [{ id: "att2", documentName: "Hotel Bill", fileName: "pune_hotel.pdf" }],
    status: "approved",
    approvalStatus: "hierarchy_complete",
    hrStatus: "pending_hr_review",
    claimAmount: 4200,
    approvedAmount: 4200,
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    requiredApprovalLevelCodes: ["ASM", "RSM"],
    approvalTrail: [
      { levelCode: "—", levelLabel: "Submission", action: "submitted", actorName: "Amit Deshmukh", actorRole: "Employee", at: "2026-05-28T09:00:00.000Z", remarks: "Submitted from mobile", claimedAmount: 4200, channel: "mobile" },
      { levelCode: "ASM", levelLabel: "Area Sales Manager", action: "approved", actorName: "Priya Patil", actorRole: "Area Sales Manager", at: "2026-05-29T10:00:00.000Z", remarks: "Approved", claimedAmount: 4200, approvedAmount: 4200, channel: "mobile" },
      { levelCode: "RSM", levelLabel: "Regional Sales Manager", action: "approved", actorName: "Rahul Sharma", actorRole: "Regional Sales Manager", at: "2026-05-30T09:00:00.000Z", remarks: "Hierarchy complete", approvedAmount: 4200, channel: "web" },
    ],
    submittedBy: "Amit Deshmukh",
    submittedAt: "2026-05-28T09:00:00.000Z",
    finalApprovedAt: "2026-05-30T09:00:00.000Z",
    paymentStatus: "pending_payment",
    paymentReady: false,
    createdBy: "Amit Deshmukh",
    updatedBy: "Rahul Sharma",
    updatedAt: "2026-05-30T09:00:00.000Z",
  },
  {
    id: 3,
    claimNumber: "TAC-2026-0003",
    employeeId: 4,
    employeeCode: "EMP-0004",
    employeeName: "Sneha Patil",
    designation: "Territory Manager",
    reportingManager: "Priya Patil",
    claimDate: "2026-05-15",
    periodFrom: "2026-05-10",
    periodTo: "2026-05-12",
    claimType: "outstation_travel",
    travelTypeLabel: "Outstation",
    claimCategoryName: "Boarding / Meals",
    remarks: "Dealer conference",
    travelDetails: [],
    expenseDetails: [{ id: "ex3", expenseType: "Boarding / Meals", billDate: "2026-05-11", billNo: "—", claimedAmount: 900, approvedAmount: 900, remarks: "" }],
    attachments: [],
    status: "approved",
    approvalStatus: "hierarchy_complete",
    hrStatus: "ready_for_payment",
    claimAmount: 900,
    approvedAmount: 900,
    approvedBy: "HR Admin",
    approvedAt: "2026-05-20",
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    requiredApprovalLevelCodes: ["ASM"],
    approvalTrail: [
      { levelCode: "—", levelLabel: "Submission", action: "submitted", actorName: "Sneha Patil", actorRole: "Employee", at: "2026-05-15T07:30:00.000Z", remarks: "Mobile submission", claimedAmount: 900, channel: "mobile" },
      { levelCode: "ASM", levelLabel: "Area Sales Manager", action: "approved", actorName: "Priya Patil", actorRole: "Area Sales Manager", at: "2026-05-16T10:00:00.000Z", remarks: "Approved", approvedAmount: 900, channel: "mobile" },
      { levelCode: "HR", levelLabel: "HR", action: "hr_approved", actorName: "HR Admin", actorRole: "HR", at: "2026-05-20T14:00:00.000Z", remarks: "Policy validated — forwarded to Payments", approvedAmount: 900, channel: "web" },
    ],
    submittedBy: "Sneha Patil",
    submittedAt: "2026-05-15T07:30:00.000Z",
    finalApprovedAt: "2026-05-20T14:00:00.000Z",
    paymentStatus: "sent_to_accounts",
    paymentReady: true,
    accountsSyncedAt: "2026-05-20T14:05:00.000Z",
    createdBy: "Sneha Patil",
    updatedBy: "HR Admin",
    updatedAt: "2026-05-20T14:05:00.000Z",
  },
  {
    id: 4,
    claimNumber: "TAC-2026-0004",
    employeeId: 3,
    employeeCode: "EMP-0003",
    employeeName: "Amit Deshmukh",
    designation: "Territory Manager",
    reportingManager: "Rahul Sharma",
    claimDate: "2026-05-08",
    periodFrom: "2026-05-05",
    periodTo: "2026-05-06",
    claimType: "outstation_travel",
    travelTypeLabel: "Outstation",
    claimCategoryName: "Lodging",
    remarks: "Pune visit — policy violation",
    travelDetails: [],
    expenseDetails: [{ id: "ex4", expenseType: "Lodging", billDate: "2026-05-05", billNo: "HTL-9912", claimedAmount: 6000, approvedAmount: 6000, remarks: "Exceeded limit" }],
    attachments: [{ id: "att4", documentName: "Hotel Bill", fileName: "pune_excess.pdf" }],
    status: "rejected",
    approvalStatus: "hierarchy_complete",
    hrStatus: "hr_rejected",
    claimAmount: 6000,
    approvedAmount: 6000,
    rejectionRemarks: "Claim exceeds eligible lodging limit — bill mismatch with policy.",
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    requiredApprovalLevelCodes: ["ASM", "RSM"],
    approvalTrail: [
      { levelCode: "—", levelLabel: "Submission", action: "submitted", actorName: "Amit Deshmukh", actorRole: "Employee", at: "2026-05-08T08:00:00.000Z", remarks: "Submitted", claimedAmount: 6000, channel: "mobile" },
      { levelCode: "ASM", levelLabel: "Area Sales Manager", action: "approved", actorName: "Priya Patil", actorRole: "Area Sales Manager", at: "2026-05-09T09:00:00.000Z", remarks: "Approved at ASM", approvedAmount: 6000, channel: "mobile" },
      { levelCode: "RSM", levelLabel: "Regional Sales Manager", action: "approved", actorName: "Rahul Sharma", actorRole: "Regional Sales Manager", at: "2026-05-10T10:00:00.000Z", remarks: "Approved at RSM", approvedAmount: 6000, channel: "web" },
      { levelCode: "HR", levelLabel: "HR", action: "hr_rejected", actorName: "HR Admin", actorRole: "HR", at: "2026-05-11T11:00:00.000Z", remarks: "Claim exceeds eligible lodging limit — bill mismatch with policy.", claimedAmount: 6000, channel: "web" },
    ],
    submittedBy: "Amit Deshmukh",
    submittedAt: "2026-05-08T08:00:00.000Z",
    paymentStatus: "pending_payment",
    paymentReady: false,
    createdBy: "Amit Deshmukh",
    updatedBy: "HR Admin",
    updatedAt: "2026-05-11T11:00:00.000Z",
  },
  {
    id: 5,
    claimNumber: "TAC-2026-0005",
    employeeId: 5,
    employeeCode: "EMP-0005",
    employeeName: "Karan Joshi",
    designation: "Field Marketing Officer",
    reportingManager: "Amit Deshmukh",
    claimDate: "2026-06-02",
    periodFrom: "2026-06-01",
    periodTo: "2026-06-01",
    claimType: "local_travel",
    travelTypeLabel: "Local",
    claimCategoryName: "Local Conveyance",
    remarks: "Missing attachment",
    travelDetails: [],
    expenseDetails: [{ id: "ex5", expenseType: "Local Conveyance", billDate: "2026-06-01", billNo: "—", claimedAmount: 280, approvedAmount: 280, remarks: "" }],
    attachments: [],
    status: "approved",
    approvalStatus: "hierarchy_complete",
    hrStatus: "sent_back",
    claimAmount: 280,
    approvedAmount: 280,
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    requiredApprovalLevelCodes: ["TM"],
    approvalTrail: [
      { levelCode: "—", levelLabel: "Submission", action: "submitted", actorName: "Karan Joshi", actorRole: "Employee", at: "2026-06-02T09:00:00.000Z", remarks: "Mobile submission", claimedAmount: 280, channel: "mobile" },
      { levelCode: "TM", levelLabel: "Territory Manager", action: "approved", actorName: "Amit Deshmukh", actorRole: "Territory Manager", at: "2026-06-02T12:00:00.000Z", remarks: "Approved", approvedAmount: 280, channel: "mobile" },
      { levelCode: "HR", levelLabel: "HR", action: "sent_back", actorName: "HR Admin", actorRole: "HR", at: "2026-06-03T10:00:00.000Z", remarks: "Please upload cab receipt and clarify visit purpose.", claimedAmount: 280, channel: "web" },
    ],
    submittedBy: "Karan Joshi",
    submittedAt: "2026-06-02T09:00:00.000Z",
    paymentStatus: "pending_payment",
    paymentReady: false,
    createdBy: "Karan Joshi",
    updatedBy: "HR Admin",
    updatedAt: "2026-06-03T10:00:00.000Z",
  },
  {
    id: 6,
    claimNumber: "TAC-2026-0006",
    employeeId: 3,
    employeeCode: "EMP-0003",
    employeeName: "Amit Deshmukh",
    designation: "Territory Manager",
    reportingManager: "Rahul Sharma",
    claimDate: "2026-05-25",
    periodFrom: "2026-05-22",
    periodTo: "2026-05-23",
    claimType: "outstation_travel",
    travelTypeLabel: "Outstation",
    claimCategoryName: "Incidental Allowance",
    remarks: "Clarification needed on dates",
    travelDetails: [],
    expenseDetails: [{ id: "ex6", expenseType: "Incidental Allowance", billDate: "2026-05-22", billNo: "—", claimedAmount: 200, approvedAmount: 200, remarks: "" }],
    attachments: [],
    status: "approved",
    approvalStatus: "hierarchy_complete",
    hrStatus: "on_hold",
    claimAmount: 200,
    approvedAmount: 200,
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    requiredApprovalLevelCodes: ["ASM"],
    approvalTrail: [
      { levelCode: "—", levelLabel: "Submission", action: "submitted", actorName: "Amit Deshmukh", actorRole: "Employee", at: "2026-05-25T08:00:00.000Z", remarks: "Submitted", claimedAmount: 200, channel: "mobile" },
      { levelCode: "ASM", levelLabel: "Area Sales Manager", action: "approved", actorName: "Priya Patil", actorRole: "Area Sales Manager", at: "2026-05-26T09:00:00.000Z", remarks: "Approved", approvedAmount: 200, channel: "mobile" },
      { levelCode: "HR", levelLabel: "HR", action: "on_hold", actorName: "HR Admin", actorRole: "HR", at: "2026-05-27T15:00:00.000Z", remarks: "Awaiting attendance confirmation for travel dates.", claimedAmount: 200, channel: "web" },
    ],
    submittedBy: "Amit Deshmukh",
    submittedAt: "2026-05-25T08:00:00.000Z",
    paymentStatus: "pending_payment",
    paymentReady: false,
    createdBy: "Amit Deshmukh",
    updatedBy: "HR Admin",
    updatedAt: "2026-05-27T15:00:00.000Z",
  },
].map((c) => enrichClaimMeta(c as TadaClaim));

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
      cityCategory: "Other",
      travelMode: "Bus",
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
      const v3 = localStorage.getItem("ds_hr_tada_claims_v3");
      if (v3) {
        const migrated = (JSON.parse(v3) as TadaClaim[]).map(normalizeClaim);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      const legacy = localStorage.getItem("ds_hr_tada_claims_v1");
      if (legacy) {
        const migrated = migrateLegacy(JSON.parse(legacy)).map(normalizeClaim);
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
  if (f.claimedAmount > 0) return f.claimedAmount;
  return sumTravelAmounts(f.travelDetails) + sumExpenseClaimed(f.expenseDetails);
}

export function employeeFieldsForClaim(employeeId: number | null): {
  designation: string;
  reportingManager: string;
  roleId: number | null;
} {
  if (!employeeId) return { designation: "", reportingManager: "", roleId: null };
  const emp = getHrEmployeeById(employeeId);
  const designation = emp?.designation ?? "";
  const roleId = resolveRoleIdFromDesignation(designation);
  return {
    designation,
    reportingManager: emp?.reportingManagerName ?? (roleId ? getReportingRoleName(roleId) : "—"),
    roleId,
  };
}

export function syncClaimFormRows(f: TadaClaimFormValues): TadaClaimFormValues {
  const cat = loadClaimCategories().find((c) => c.id === f.claimCategoryId);
  const travelDetails = [{
    ...DEFAULT_TRAVEL,
    id: f.travelDetails[0]?.id ?? newRowId("tr"),
    fromLocation: f.fromCity,
    toLocation: f.toCity,
    cityCategory: f.cityCategory,
    travelMode: f.travelMode ?? "Rail",
    travelDate: f.periodFrom,
    distanceKm: f.km,
    ratePerKm: f.ratePerKm,
    amount: f.claimedAmount,
  }];
  const expenseDetails = [{
    ...DEFAULT_EXPENSE,
    id: f.expenseDetails[0]?.id ?? newRowId("ex"),
    expenseType: cat?.claimCategoryName ?? "Travel Fare",
    claimedAmount: f.claimedAmount,
    billDate: f.claimDate,
  }];
  return {
    ...f,
    travelDetails,
    expenseDetails,
    claimType: f.travelType === "Local Travel" ? "local_travel" : "outstation_travel",
    remarks: f.purpose || f.remarks,
  };
}

export function validateClaimForm(f: TadaClaimFormValues): string | null {
  if (!f.employeeId) return "Employee is required.";
  if (!f.roleId) return "Employee must have a role mapped in User Management Role Master.";
  if (!isTadaApplicableForRole(f.roleId)) return "TA/DA is not applicable for this employee role.";
  if (!f.periodFrom || !f.periodTo) return "Start and end dates are required.";
  if (!f.claimCategoryId) return "Claim category is required.";
  if (sumClaimAmount(f) <= 0) return "Claim amount must be greater than zero.";
  return null;
}

export function formToClaim(
  f: TadaClaimFormValues,
  id: number,
  claimNumber: string,
  status: ClaimStatus,
  existing?: TadaClaim,
): TadaClaim {
  const synced = syncClaimFormRows(f);
  const emp = synced.employeeId ? getHrEmployeeById(synced.employeeId) : undefined;
  const amount = sumClaimAmount(synced);
  return {
    id,
    claimNumber,
    employeeId: synced.employeeId!,
    employeeCode: emp?.employeeCode ?? "",
    employeeName: emp?.employeeName ?? "",
    designation: synced.designation,
    reportingManager: synced.reportingManager,
    claimDate: synced.claimDate,
    periodFrom: synced.periodFrom,
    periodTo: synced.periodTo,
    claimType: synced.claimType,
    remarks: synced.remarks,
    travelDetails: synced.travelDetails,
    expenseDetails: synced.expenseDetails,
    attachments: synced.attachments,
    status,
    approvalStatus: existing?.approvalStatus ?? "submitted",
    hrStatus: existing?.hrStatus ?? "awaiting_hierarchy",
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
    updatedAt: nowIso(),
  };
}

export function claimToForm(c: TadaClaim): TadaClaimFormValues {
  const tr = c.travelDetails[0];
  const ex = c.expenseDetails[0];
  const roleId = resolveRoleIdFromDesignation(c.designation);
  return {
    employeeId: c.employeeId,
    roleId,
    designation: c.designation,
    reportingManager: c.reportingManager,
    claimDate: c.claimDate,
    travelType: c.claimType.includes("local") ? "Local Travel" : "Outstation Travel",
    travelMode: tr?.travelMode as TravelMode | undefined,
    fromCity: tr?.fromLocation ?? "",
    toCity: tr?.toLocation ?? "",
    cityCategory: (tr?.cityCategory as CityCategory) ?? "Other",
    periodFrom: c.periodFrom,
    periodTo: c.periodTo,
    purpose: c.remarks,
    claimCategoryId: resolveClaimCategoryId(ex?.expenseType ?? "Travel Fare"),
    claimedAmount: c.claimAmount,
    hotelName: "",
    nights: 0,
    localCity: "",
    localMode: "",
    fromLocation: tr?.fromLocation ?? "",
    toLocation: tr?.toLocation ?? "",
    km: tr?.distanceKm ?? 0,
    ratePerKm: tr?.ratePerKm ?? 0,
    incidentalDays: 0,
    declarationAccepted: false,
    claimType: c.claimType,
    remarks: c.remarks,
    travelDetails: c.travelDetails.length ? c.travelDetails : [{ ...DEFAULT_TRAVEL, id: newRowId("tr") }],
    expenseDetails: c.expenseDetails.length ? c.expenseDetails : [{ ...DEFAULT_EXPENSE, id: newRowId("ex") }],
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
  const ts = nowIso();
  return enrichClaimMeta({
    ...claim,
    status: "pending_approval",
    approvalStatus: "pending_manager_approval",
    hrStatus: "awaiting_hierarchy",
    requiredApprovalLevelCodes: codes,
    currentApprovalLevelCode: first?.code ?? null,
    currentApprovalLevelLabel: first?.label ?? null,
    approvalTrail: trail,
    submittedBy: claim.employeeName,
    submittedAt: ts,
    paymentReady: false,
    paymentStatus: "pending_payment",
    updatedBy: CURRENT_USER,
    updatedAt: ts,
  });
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
    return enrichClaimMeta({
      ...claim,
      approvalTrail: trail,
      approvedAmount,
      approvalStatus: "pending_higher_approval",
      currentApprovalLevelCode: next.code,
      currentApprovalLevelLabel: next.label,
      updatedBy: CURRENT_USER,
      updatedAt: nowIso(),
    });
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
  return enrichClaimMeta({
    ...claim,
    status: "approved",
    approvalStatus: "hierarchy_complete",
    hrStatus: "pending_hr_review",
    approvedAmount,
    approvedBy: CURRENT_USER,
    approvedAt: ts.slice(0, 10),
    currentApprovalLevelCode: null,
    currentApprovalLevelLabel: null,
    finalApprovedAt: ts,
    paymentReady: false,
    paymentStatus: "pending_payment",
    rejectionRemarks: undefined,
    updatedBy: CURRENT_USER,
    updatedAt: ts,
    expenseDetails: claim.expenseDetails.map((e) => ({
      ...e,
      approvedAmount: e.approvedAmount || e.claimedAmount,
    })),
  });
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
  return enrichClaimMeta({
    ...claim,
    status: "rejected",
    approvalStatus: "rejected",
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
    updatedAt: nowIso(),
  });
}

export function sendClaimToAccounts(claim: TadaClaim): TadaClaim {
  const ts = nowIso();
  return enrichClaimMeta({
    ...claim,
    hrStatus: "ready_for_payment",
    paymentStatus: "sent_to_accounts",
    paymentReady: true,
    accountsSyncedAt: ts,
    updatedBy: CURRENT_USER,
    updatedAt: ts,
  });
}

function appendHrTrail(
  claim: TadaClaim,
  action: ClaimApprovalTrailEntry["action"],
  remarks: string,
  channel: ApprovalChannel = "web",
): ClaimApprovalTrailEntry[] {
  return [
    ...claim.approvalTrail,
    {
      levelCode: "HR",
      levelLabel: "HR",
      action,
      actorName: CURRENT_USER,
      actorRole: "HR",
      at: nowIso(),
      remarks,
      claimedAmount: getClaimedAmount(claim),
      approvedAmount: action === "hr_approved" ? getClaimedAmount(claim) : undefined,
      channel,
    },
  ];
}

export function hrApproveClaim(claim: TadaClaim, remarks: string, channel: ApprovalChannel = "web"): TadaClaim {
  const ts = nowIso();
  const next = enrichClaimMeta({
    ...claim,
    status: "approved",
    approvalStatus: "hierarchy_complete",
    hrStatus: "hr_approved",
    approvedBy: CURRENT_USER,
    approvedAt: ts.slice(0, 10),
    rejectionRemarks: undefined,
    approvalTrail: appendHrTrail(claim, "hr_approved", remarks || "HR approved — forwarded to Payments", channel),
    updatedBy: CURRENT_USER,
    updatedAt: ts,
  });
  return sendClaimToAccounts(next);
}

export function hrRejectClaim(claim: TadaClaim, remarks: string, channel: ApprovalChannel = "web"): TadaClaim {
  const ts = nowIso();
  return enrichClaimMeta({
    ...claim,
    status: "rejected",
    hrStatus: "hr_rejected",
    rejectionRemarks: remarks,
    paymentReady: false,
    paymentStatus: "pending_payment",
    approvalTrail: appendHrTrail(claim, "hr_rejected", remarks, channel),
    updatedBy: CURRENT_USER,
    updatedAt: ts,
  });
}

export function hrSendBackClaim(claim: TadaClaim, remarks: string, channel: ApprovalChannel = "web"): TadaClaim {
  const ts = nowIso();
  return enrichClaimMeta({
    ...claim,
    hrStatus: "sent_back",
    rejectionRemarks: remarks,
    paymentReady: false,
    approvalTrail: appendHrTrail(claim, "sent_back", remarks, channel),
    updatedBy: CURRENT_USER,
    updatedAt: ts,
  });
}

export function hrHoldClaim(claim: TadaClaim, remarks: string, channel: ApprovalChannel = "web"): TadaClaim {
  const ts = nowIso();
  return enrichClaimMeta({
    ...claim,
    hrStatus: "on_hold",
    approvalTrail: appendHrTrail(claim, "on_hold", remarks || "On hold for clarification", channel),
    updatedBy: CURRENT_USER,
    updatedAt: ts,
  });
}

export function canHrActOnClaim(claim: TadaClaim): boolean {
  return ["pending_hr_review", "on_hold"].includes(claim.hrStatus);
}

export function getApprovedClaimsForPayment(): TadaClaim[] {
  return loadTadaClaims().filter(
    (c) => c.hrStatus === "ready_for_payment" || c.paymentStatus === "sent_to_accounts",
  );
}

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};
