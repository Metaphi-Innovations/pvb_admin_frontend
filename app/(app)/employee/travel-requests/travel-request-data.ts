/**
 * Pre-Travel / Ex-HQ Travel Requests — frontend/demo persistence.
 * Entitlements always come from Travel Policy via resolvers. This store holds
 * requests + submit-time snapshots only.
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import { policyToday } from "@/lib/hr/policy-common";
import type { ApproverRole } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import type { TravelContextKind } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-resolver";

export const TRAVEL_REQUESTS_STORAGE_KEY = "ds_hr_travel_requests_v1";
export const HR_TRAVEL_REQUESTS_EVENT = "hr-travel-requests-updated";

export type TravelRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "returned"
  | "rejected"
  | "cancelled";

export type TravelModeKind = "Rail" | "Air" | "Bus" | "Taxi" | "Own Vehicle" | "Other";
export type StayKind = "" | "hotel" | "relatives_friends";
export type TaxiKind = "" | "shared" | "private";
export type AirEligibility = "yes" | "no" | "conditional" | "";
export type HqSource = "employee_hq" | "branch" | "none";

export const TRAVEL_MODE_OPTIONS: TravelModeKind[] = [
  "Rail",
  "Air",
  "Bus",
  "Taxi",
  "Own Vehicle",
  "Other",
];

export const REQUEST_STATUS_LABEL: Record<TravelRequestStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  returned: "Returned",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export interface TravelRequestCheck {
  id: string;
  level: "ok" | "warn" | "exception" | "block";
  label: string;
  detail?: string;
}

export interface TravelRequestException {
  id: string;
  label: string;
}

export interface TravelRequestSnapshot {
  capturedAt: string;
  policyId: number;
  policyName: string;
  policyNumber: string;
  effectiveFrom: string;
  groupId: string | null;
  groupName: string | null;
  hqCity: string;
  hqSource: HqSource;
  destination: string;
  cityClassId: string | null;
  cityClassName: string | null;
  travelContext: TravelContextKind | "";
  priorApprovalRequired: boolean;
  requestedMode: string;
  entitledRailClass: string;
  requestedRailClass: string;
  airEligible: AirEligibility;
  airTrigger: string;
  airMinHours: number;
  destinationConveyance: string;
  lodgingLimit: number | null;
  boardingLimit: number | null;
  relativesPerNight: number | null;
  kmRate: number | null;
  kmAmount: number | null;
  taxiSummary: string;
  estimatedTravel: number;
  estimatedStay: number;
  estimatedOther: number;
  estimatedTotal: number;
  policyEligibleEstimate: number;
  exceptionEstimate: number;
  exceptions: TravelRequestException[];
  checks: TravelRequestCheck[];
  guidance: { label: string; value: string }[];
}

export type ApprovalStepStatus = "pending" | "approved" | "rejected" | "returned" | "skipped";

export interface TravelRequestApprovalStep {
  id: string;
  order: number;
  role: ApproverRole;
  roleLabel: string;
  status: ApprovalStepStatus;
  assigneeEmployeeId: number | null;
  assigneeName: string;
  resolved: boolean;
  actedAt: string;
  actedBy: string;
  remark: string;
}

export interface TravelRequestTimelineEvent {
  id: string;
  at: string;
  action: string;
  user: string;
  remark: string;
  status: TravelRequestStatus | "";
}

export interface EmployeeTravelRequest {
  id: number;
  requestNo: string;
  status: TravelRequestStatus;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  branch: string;
  purpose: string;
  travelFrom: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  travelMode: TravelModeKind | "";
  estimatedTravelCost: number | null;
  stayRequired: boolean;
  expectedNights: number | null;
  remarks: string;
  visitReference: string;
  projectPurpose: string;
  /** Manual one-way KM — GPS is not calculated. */
  distanceKm: number | null;
  estimatedJourneyHours: number | null;
  airFareEstimate: number | null;
  airReason: string;
  requestedRailClass: string;
  vehicleType: string;
  taxiKind: TaxiKind;
  stayCity: string;
  stayType: StayKind;
  estimatedStayCost: number | null;
  estimatedOtherCost: number | null;
  snapshot: TravelRequestSnapshot | null;
  approvalChainName: string;
  approvalSteps: TravelRequestApprovalStep[];
  currentStepIndex: number;
  timeline: TravelRequestTimelineEvent[];
  submittedOn: string;
  approvedOn: string;
  finalApproverName: string;
  returnReason: string;
  rejectionReason: string;
  cancelReason: string;
  createdAt: string;
  updatedAt: string;
}

function stampNow(): string {
  return new Date().toISOString();
}

export function emptyTravelRequest(employee: HrEmployee): EmployeeTravelRequest {
  const today = policyToday();
  return {
    id: 0,
    requestNo: "",
    status: "draft",
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    designation: employee.designation,
    branch: employee.branch,
    purpose: "",
    travelFrom: "",
    destination: "",
    departureDate: today,
    departureTime: "09:00",
    returnDate: today,
    returnTime: "18:00",
    travelMode: "",
    estimatedTravelCost: null,
    stayRequired: false,
    expectedNights: null,
    remarks: "",
    visitReference: "",
    projectPurpose: "",
    distanceKm: null,
    estimatedJourneyHours: null,
    airFareEstimate: null,
    airReason: "",
    requestedRailClass: "",
    vehicleType: "",
    taxiKind: "",
    stayCity: "",
    stayType: "",
    estimatedStayCost: null,
    estimatedOtherCost: null,
    snapshot: null,
    approvalChainName: "",
    approvalSteps: [],
    currentStepIndex: 0,
    timeline: [],
    submittedOn: "",
    approvedOn: "",
    finalApproverName: "",
    returnReason: "",
    rejectionReason: "",
    cancelReason: "",
    createdAt: stampNow(),
    updatedAt: stampNow(),
  };
}

function normalize(r: EmployeeTravelRequest): EmployeeTravelRequest {
  return {
    ...emptyTravelRequest({
      id: r.employeeId,
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      designation: r.designation,
      branch: r.branch,
    } as HrEmployee),
    ...r,
    approvalSteps: r.approvalSteps ?? [],
    timeline: r.timeline ?? [],
    snapshot: r.snapshot ?? null,
  };
}

function loadRaw(): EmployeeTravelRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRAVEL_REQUESTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmployeeTravelRequest[];
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

function persist(list: EmployeeTravelRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAVEL_REQUESTS_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(HR_TRAVEL_REQUESTS_EVENT));
}

export function loadTravelRequests(): EmployeeTravelRequest[] {
  return loadRaw().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function loadTravelRequestsForEmployee(employeeId: number): EmployeeTravelRequest[] {
  return loadTravelRequests().filter((r) => r.employeeId === employeeId);
}

export function getTravelRequestById(id: number): EmployeeTravelRequest | undefined {
  return loadRaw().find((r) => r.id === id);
}

export function nextTravelRequestNumber(list?: EmployeeTravelRequest[]): string {
  const year = new Date().getFullYear();
  const prefix = `TRV-${year}-`;
  const source = list ?? loadRaw();
  let max = 0;
  for (const r of source) {
    if (!r.requestNo?.startsWith(prefix)) continue;
    const n = Number(r.requestNo.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function nextId(list: EmployeeTravelRequest[]): number {
  return list.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

export function saveTravelRequest(req: EmployeeTravelRequest): EmployeeTravelRequest {
  const list = loadRaw();
  const now = stampNow();
  if (!req.id) {
    const saved: EmployeeTravelRequest = {
      ...req,
      id: nextId(list),
      requestNo: req.requestNo || nextTravelRequestNumber(list),
      createdAt: req.createdAt || now,
      updatedAt: now,
    };
    list.push(saved);
    persist(list);
    return saved;
  }
  const idx = list.findIndex((r) => r.id === req.id);
  const saved: EmployeeTravelRequest = { ...req, updatedAt: now };
  if (idx >= 0) list[idx] = saved;
  else list.push(saved);
  persist(list);
  return saved;
}

export function approvedTravelRequestsForEmployee(employeeId: number): EmployeeTravelRequest[] {
  return loadTravelRequestsForEmployee(employeeId).filter((r) => r.status === "approved");
}

export function newTimelineId(): string {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatRequestDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function travelPeriodLabel(r: Pick<EmployeeTravelRequest, "departureDate" | "returnDate">): string {
  if (!r.departureDate) return "—";
  if (!r.returnDate || r.returnDate === r.departureDate) return formatRequestDate(r.departureDate);
  return `${formatRequestDate(r.departureDate)} – ${formatRequestDate(r.returnDate)}`;
}

export function salesForceEmployees(): HrEmployee[] {
  return loadHrEmployees().filter(
    (e) => e.status === "active" && /sales/i.test(`${e.department} ${e.designation}`),
  );
}
