/**
 * Employee claim policy evaluation.
 * Reads Travel Policy via existing resolvers — does not copy matrices or hardcode amounts.
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import {
  getActiveCitiesForState,
  getActiveMockStateNames,
} from "@/app/(app)/hr/sales-force-policy/stateCityMockData";
import type {
  ClaimTypeRule,
  OverLimitAction,
  TravelPolicy,
} from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import { getTravelPolicyById, loadTravelPolicies } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import {
  classifyTravelContext,
  getApplicableTravelPolicy,
  getEmployeeEntitlementGroup,
  getEmployeeHqNote,
  getTravelEntitlement,
  resolveCityClassification,
  snapshotPolicyRef,
  validateTravelClaim,
  type TravelContextKind,
  type TravelEntitlementQuery,
  type TravelEntitlementResult,
  type ValidationIssue,
} from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-resolver";
import { policyToday } from "@/lib/hr/policy-common";
import {
  CLAIM_TYPE_OPTIONS,
  type EmployeeClaimType,
  type EmployeeTravelClaim,
  type PolicyEntitlementSnapshot,
} from "./travel-claim-data";
import { getTravelRequestById } from "@/app/(app)/employee/travel-requests/travel-request-data";

export type PolicyCheckLevel = "ok" | "warn" | "exception" | "block";

export interface PolicyCheckRow {
  id: string;
  level: PolicyCheckLevel;
  label: string;
  detail?: string;
}

export interface DeadlineResult {
  dueDate: string;
  kind: "within" | "late" | "blocked";
  message: string;
}

export interface ClaimEvaluation {
  policy: TravelPolicy | null;
  policyError: string | null;
  entitlement: TravelEntitlementResult | null;
  claimRule: ClaimTypeRule | null;
  groupName: string | null;
  cityClassName: string | null;
  hqNote: string;
  guidance: { label: string; value: string }[];
  checks: PolicyCheckRow[];
  claimedAmount: number;
  eligibleAmount: number;
  exceptionAmount: number;
  amountLocked: boolean;
  amountHint: string;
  billRequired: boolean;
  originalBillRequired: boolean;
  companyNameRequired: boolean;
  gstinRequired: boolean;
  priorApprovalRequired: boolean;
  exceptionRequired: boolean;
  nights: number;
  journeyHours: number | null;
  journeyLabel: string;
  kmRate: number | null;
  kmCalcLabel: string;
  localMode: string;
  timeCategory: string | null;
  entitledRailClass: string;
  airNote: string;
  monthlyKmNote: string | null;
  deadline: DeadlineResult | null;
  canSubmit: boolean;
  blockReasons: string[];
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T00:00:00`);
  const b = new Date(`${to.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function followingMonthDue(iso: string, dayOfMonth: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const y = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
  const m = (d.getMonth() + 1) % 12;
  const last = new Date(y, m + 1, 0).getDate();
  const day = Math.min(Math.max(1, dayOfMonth || 1), last);
  const out = new Date(y, m, day);
  const mm = String(out.getMonth() + 1).padStart(2, "0");
  const dd = String(out.getDate()).padStart(2, "0");
  return `${out.getFullYear()}-${mm}-${dd}`;
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function hoursBetween(from: string, to: string): number | null {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.round(((b - a) / 3600000) * 100) / 100;
}

export function formatDuration(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function nightsBetween(from: string, to: string): number {
  return Math.max(0, daysBetween(from, to));
}

export function listDestinationCities(): { city: string; state: string }[] {
  const out: { city: string; state: string }[] = [];
  for (const state of getActiveMockStateNames()) {
    for (const city of getActiveCitiesForState(state)) {
      out.push({ city, state });
    }
  }
  return out.sort((a, b) => a.city.localeCompare(b.city));
}

export function matchClaimTypeRule(
  policy: TravelPolicy,
  claimType: EmployeeClaimType | "",
): ClaimTypeRule | null {
  if (!claimType) return null;
  const opt = CLAIM_TYPE_OPTIONS.find((t) => t.key === claimType);
  const hints = [opt?.label ?? "", ...(opt?.policyRuleHints ?? [])].map(norm).filter(Boolean);
  const rules = policy.claimRules;
  for (const hint of hints) {
    const hit = rules.find((r) => {
      const n = norm(r.claimType);
      return n === hint || n.includes(hint) || hint.includes(n);
    });
    if (hit) return hit;
  }
  return null;
}

function overLimitLevel(action: OverLimitAction): PolicyCheckLevel {
  if (action === "block") return "block";
  if (action === "allow_and_flag") return "warn";
  return "exception";
}

function completionDate(claim: EmployeeTravelClaim): string {
  if (claim.claimType === "lodging" && claim.checkOutDate) return claim.checkOutDate.slice(0, 10);
  if (claim.claimType === "relatives_friends" && claim.stayTo) return claim.stayTo.slice(0, 10);
  if (claim.claimType === "ex_hq_travel" && claim.returnAt) return claim.returnAt.slice(0, 10);
  if (claim.claimType === "overnight_journey" && claim.journeyEnd) return claim.journeyEnd.slice(0, 10);
  if (claim.periodTo) return claim.periodTo.slice(0, 10);
  return (claim.expenseDate || policyToday()).slice(0, 10);
}

export function resolveDeadline(
  policy: TravelPolicy,
  rule: ClaimTypeRule | null,
  completion: string,
  today: string,
): DeadlineResult {
  const candidates: string[] = [];
  if (rule) {
    if (rule.deadlineMethod === "within_days_of_completion" || rule.deadlineMethod === "whichever_earlier") {
      candidates.push(addDays(completion, rule.withinDays));
    }
    if (rule.deadlineMethod === "by_day_of_following_month" || rule.deadlineMethod === "whichever_earlier") {
      candidates.push(followingMonthDue(completion, rule.followingMonthDay));
    }
    if (rule.deadlineMethod === "absolute_max_days") {
      candidates.push(addDays(completion, rule.absoluteMaxDays));
    }
  }
  const maxDue = addDays(completion, policy.maxClaimAge.days);
  const due = [...candidates, maxDue].sort()[0]!;
  const age = daysBetween(completion, today);

  if (age > policy.maxClaimAge.days && policy.maxClaimAge.action === "block") {
    return {
      dueDate: maxDue,
      kind: "blocked",
      message: `This claim is older than the policy maximum of ${policy.maxClaimAge.days} days.`,
    };
  }
  if (today > due) {
    const overdue = daysBetween(due, today);
    return {
      dueDate: due,
      kind: age > policy.maxClaimAge.days ? (policy.maxClaimAge.action === "block" ? "blocked" : "late") : "late",
      message: `This claim is ${overdue} day${overdue === 1 ? "" : "s"} overdue.`,
    };
  }
  return {
    dueDate: due,
    kind: "within",
    message: `Submit by ${formatDisplayDate(due)}`,
  };
}

function travelContextKind(claim: EmployeeTravelClaim): TravelContextKind | undefined {
  if (claim.claimType === "ex_hq_travel") return "ex_hq";
  if (claim.claimType === "overnight_journey") return "overnight_journey";
  if (claim.claimType === "local_city" || claim.claimType === "field_conveyance") return "hq_local";
  return undefined;
}

function stayKind(claim: EmployeeTravelClaim): "hotel" | "relatives_friends" | undefined {
  if (claim.claimType === "relatives_friends") return "relatives_friends";
  if (claim.claimType === "lodging" || claim.claimType === "boarding") return "hotel";
  return undefined;
}

function journeyHoursOf(claim: EmployeeTravelClaim): number | null {
  if (claim.claimType === "overnight_journey") return hoursBetween(claim.journeyStart, claim.journeyEnd);
  if (claim.claimType === "ex_hq_travel") return hoursBetween(claim.departureAt, claim.returnAt);
  if (claim.claimType === "local_city" && claim.expenseDate && claim.startTime && claim.endTime) {
    return hoursBetween(`${claim.expenseDate}T${claim.startTime}`, `${claim.expenseDate}T${claim.endTime}`);
  }
  return null;
}

function cityFor(claim: EmployeeTravelClaim): string {
  if (claim.city.trim()) return claim.city.trim();
  if (claim.destination.trim()) return claim.destination.trim();
  if (claim.locationMarket.trim()) return claim.locationMarket.trim();
  if (claim.toLocation.trim()) return claim.toLocation.trim();
  return "";
}

export function buildEntitlementQuery(
  employee: HrEmployee,
  claim: EmployeeTravelClaim,
): TravelEntitlementQuery {
  const hours = journeyHoursOf(claim);
  const overnight = claim.overnight || claim.claimType === "overnight_journey";
  return {
    employee,
    travelDate: (claim.expenseDate || policyToday()).slice(0, 10),
    city: cityFor(claim) || undefined,
    travelType: travelContextKind(claim),
    stayType: stayKind(claim),
    mode: claim.modeOfTravel || undefined,
    vehicleType: claim.vehicleType || undefined,
    distanceKm: claim.distanceKm ?? claim.kmTravelled ?? undefined,
    journeyHours: hours ?? undefined,
    timeOfDay: claim.startTime || undefined,
    overnight,
  };
}

function inr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function hasKind(claim: EmployeeTravelClaim, kind: "bill" | "ticket" | "approval" | "other"): boolean {
  return claim.attachments.some((a) => a.kind === kind);
}

function applyIssue(checks: PolicyCheckRow[], issue: ValidationIssue, id: string) {
  checks.push({
    id,
    level: issue.level === "block" ? "block" : issue.level === "warn" ? "warn" : "exception",
    label: issue.message,
  });
}

export function evaluateClaim(employee: HrEmployee, claim: EmployeeTravelClaim): ClaimEvaluation {
  const today = policyToday();
  const travelDate = (claim.expenseDate || today).slice(0, 10);
  const linkedReq = claim.linkedTravelRequestId ? getTravelRequestById(claim.linkedTravelRequestId) : undefined;
  const frozenPolicy =
    linkedReq?.snapshot?.policyId != null ? getTravelPolicyById(linkedReq.snapshot.policyId) ?? null : null;
  const policy = frozenPolicy ?? getApplicableTravelPolicy(employee, travelDate, loadTravelPolicies());
  const hqNote = getEmployeeHqNote(employee);
  const empty: ClaimEvaluation = {
    policy: policy,
    policyError: policy ? null : "No active travel policy covers this travel date.",
    entitlement: null,
    claimRule: null,
    groupName: null,
    cityClassName: null,
    hqNote,
    guidance: [],
    checks: [],
    claimedAmount: 0,
    eligibleAmount: 0,
    exceptionAmount: 0,
    amountLocked: false,
    amountHint: "",
    billRequired: false,
    originalBillRequired: false,
    companyNameRequired: false,
    gstinRequired: false,
    priorApprovalRequired: false,
    exceptionRequired: false,
    nights: 0,
    journeyHours: null,
    journeyLabel: "—",
    kmRate: null,
    kmCalcLabel: "",
    localMode: "",
    timeCategory: null,
    entitledRailClass: "",
    airNote: "",
    monthlyKmNote: null,
    deadline: null,
    canSubmit: false,
    blockReasons: [],
  };

  if (!policy) {
    empty.checks.push({
      id: "no-policy",
      level: "block",
      label: "No active travel policy for this travel date.",
    });
    empty.blockReasons = ["No active travel policy for this travel date."];
    return empty;
  }

  const group = getEmployeeEntitlementGroup(policy, employee);
  const cityName = cityFor(claim);
  const cityClass = cityName
    ? resolveCityClassification(policy, cityName)
    : policy.cityClasses.find((c) => c.isFallback) ?? null;
  const query = { ...buildEntitlementQuery(employee, claim), policy };
  const entRaw = getTravelEntitlement(query);
  const entitlement = "error" in entRaw ? null : entRaw;
  const claimRule = matchClaimTypeRule(policy, claim.claimType);
  const hours = journeyHoursOf(claim);
  const nightsLodging = nightsBetween(claim.checkInDate, claim.checkOutDate);
  const nightsStay = nightsBetween(claim.stayFrom, claim.stayTo);
  const nights = claim.claimType === "relatives_friends" ? nightsStay : nightsLodging;

  let claimed = 0;
  let eligible = 0;
  let amountLocked = false;
  let amountHint = "";
  let kmRate: number | null = entitlement?.kmRate ?? null;
  let kmCalcLabel = "";
  const checks: PolicyCheckRow[] = [];
  const guidance: { label: string; value: string }[] = [];

  const type = claim.claimType;
  const modeRow = group ? policy.travelModes.find((i) => i.groupId === group.id) : undefined;
  const localRow = group ? policy.localTravel.find((i) => i.groupId === group.id) : undefined;
  const incidentalRow = group ? policy.incidentals.find((i) => i.groupId === group.id) : undefined;
  const kmRow = claim.vehicleType
    ? policy.kmRates.find((r) => r.active && norm(r.vehicleType) === norm(claim.vehicleType))
    : undefined;
  const fieldCell = entitlement?.fieldConveyance ?? null;

  let billRequired = Boolean(claimRule?.billRequired);
  let originalBillRequired = Boolean(claimRule?.originalBillRequired || policy.billing.originalBillRequired);
  let companyNameRequired = Boolean(claimRule?.companyNameOnBill || policy.billing.billInCompanyName);
  let gstinRequired = false;
  let priorApprovalRequired = Boolean(claimRule?.priorApprovalRequired);

  if (type === "lodging") {
    const limit = entitlement?.lodgingLimit ?? null;
    const eligibleNights = nights;
    eligible = limit != null ? Math.round(limit * eligibleNights * 100) / 100 : 0;
    claimed = Number(claim.billAmount) || 0;
    billRequired = policy.lodgingRules.billRequired;
    originalBillRequired = policy.lodgingRules.billRequired && policy.billing.originalBillRequired;
    companyNameRequired = policy.lodgingRules.billInCompanyName;
    gstinRequired = policy.lodgingRules.gstinRequired;
    priorApprovalRequired =
      priorApprovalRequired ||
      entitlement?.priorApproval ||
      (policy.lodgingRules.exceptionsRequirePriorApproval && claimed > eligible);
    if (cityName) {
      guidance.push({
        label: "City",
        value: cityClass ? `${cityName} — ${cityClass.name}` : cityName,
      });
    }
    if (limit != null) guidance.push({ label: "Lodging", value: `${inr(limit)}/night` });
    if (entitlement?.boardingLimit != null) {
      guidance.push({ label: "Boarding", value: `${inr(entitlement.boardingLimit)}/day` });
    }
    guidance.push({ label: "Bill", value: billRequired ? "Required" : "Not required" });
    amountHint = `Eligible ${inr(eligible)} · Claimed ${inr(claimed)} · Excess ${inr(Math.max(0, claimed - eligible))}`;
  } else if (type === "boarding") {
    const perDay = entitlement?.boardingLimit ?? null;
    const days = Math.max(1, claim.eligibleDays || nights || daysBetween(claim.periodFrom, claim.periodTo) || 1);
    eligible = perDay != null ? Math.round(perDay * days * 100) / 100 : 0;
    claimed = Number(claim.travelAmount ?? claim.billAmount) || 0;
    if (policy.overnightExclusions.boardingSameTransit && claim.overnight) {
      eligible = 0;
      checks.push({
        id: "board-excl",
        level: "block",
        label: "Boarding is excluded for overnight / same-transit journeys as per policy.",
      });
    }
    if (perDay != null) guidance.push({ label: "Boarding Limit", value: `${inr(perDay)}/day` });
    guidance.push({ label: "Eligible days", value: String(days) });
    amountHint = `Eligible ${inr(eligible)}`;
  } else if (type === "relatives_friends") {
    const rate = entitlement?.relativesPerNight ?? null;
    amountLocked = true;
    eligible = rate != null ? Math.round(rate * nightsStay * 100) / 100 : 0;
    claimed = eligible;
    billRequired = false;
    originalBillRequired = false;
    companyNameRequired = false;
    if (cityName) {
      guidance.push({
        label: "City",
        value: cityClass ? `${cityName} — ${cityClass.name}` : cityName,
      });
    }
    guidance.push({
      label: "Flat allowance",
      value: rate == null ? "Not applicable" : `${inr(rate)} × ${nightsStay} night${nightsStay === 1 ? "" : "s"}`,
    });
    guidance.push({ label: "Bill", value: "Not required" });
    amountHint = rate == null ? "This stay type is not entitled for your group/city." : `${inr(rate)} × ${nightsStay} = ${inr(claimed)}`;
    if (rate == null) {
      checks.push({
        id: "rel-na",
        level: "block",
        label: "Stay with relatives/friends is not applicable for your entitlement group and city.",
      });
    }
  } else if (type === "overnight_journey") {
    amountLocked = true;
    eligible = entitlement?.overnightAmount ?? 0;
    claimed = eligible;
    billRequired = Boolean(claimRule?.billRequired);
    const slab = entitlement?.overnightSlab;
    guidance.push({ label: "Journey Duration", value: formatDuration(hours) });
    guidance.push({
      label: "Applicable Allowance",
      value: slab
        ? `${inr(eligible)} (${slab.fromHours}–${slab.toHours}h)`
        : "No matching duration slab",
    });
    amountHint = hours == null ? "Enter journey start and end." : `${formatDuration(hours)} → ${inr(eligible)}`;
    if (hours != null && !slab) {
      checks.push({
        id: "ovn-slab",
        level: "warn",
        label: "No overnight slab matches this journey duration.",
      });
    }
  } else if (type === "personal_vehicle_km") {
    amountLocked = true;
    const km = Number(claim.kmTravelled) || 0;
    kmRate = entitlement?.kmRate ?? null;
    eligible = kmRate != null ? Math.round(kmRate * km * 100) / 100 : 0;
    claimed = eligible;
    billRequired = Boolean(kmRow?.billsRequired);
    originalBillRequired = billRequired && policy.billing.originalBillRequired;
    kmCalcLabel = kmRate != null ? `${km} KM × ${inr(kmRate)}` : "Rate not configured for this vehicle";
    guidance.push({ label: "KM Rate", value: kmRate != null ? `${inr(kmRate)}/km` : "Not configured" });
    if (kmRate != null) guidance.push({ label: "Claim Amount", value: `${km} KM × ${inr(kmRate)} = ${inr(claimed)}` });
    if (!claim.vehicleType) {
      checks.push({ id: "km-veh", level: "block", label: "Vehicle type is required." });
    } else if (kmRate == null) {
      checks.push({ id: "km-rate", level: "block", label: "No KM rate is configured for the selected vehicle." });
    }
  } else if (type === "field_conveyance") {
    if (policy.fieldApplicability.notPayableDuringExHq && claim.distanceKm != null) {
      const ctx = classifyTravelContext(policy, { distanceKm: claim.distanceKm, overnight: claim.overnight });
      if (ctx.exHq) {
        checks.push({
          id: "field-exhq",
          level: "block",
          label: "Field daily conveyance is not payable during Ex-HQ travel as per policy.",
        });
      }
    }
    if (policy.overnightExclusions.fieldConveyance && claim.overnight) {
      checks.push({
        id: "field-ovn",
        level: "block",
        label: "Field conveyance is excluded when an overnight journey applies.",
      });
    }
    if (fieldCell?.allowanceType === "fixed") {
      amountLocked = true;
      eligible = fieldCell.amount;
      claimed = eligible;
      billRequired = fieldCell.billsRequired;
      amountHint = `Flat daily allowance ${inr(eligible)}`;
    } else if (fieldCell?.allowanceType === "actual") {
      amountLocked = false;
      claimed = Number(claim.travelAmount ?? claim.billAmount) || 0;
      eligible = fieldCell.amount > 0 ? fieldCell.amount : claimed;
      billRequired = fieldCell.billsRequired;
      amountHint = "Actual reimbursement as per policy";
    } else {
      checks.push({
        id: "field-na",
        level: "block",
        label: "Field conveyance is not configured for your entitlement group and city.",
      });
    }
    if (cityName) {
      guidance.push({
        label: "City",
        value: cityClass ? `${cityName} — ${cityClass.name}` : cityName,
      });
    }
    if (fieldCell) {
      guidance.push({
        label: "Daily allowance",
        value: fieldCell.allowanceType === "fixed" ? inr(fieldCell.amount) : "Actual",
      });
      guidance.push({ label: "Bill", value: fieldCell.billsRequired ? "Required" : "Not required" });
    }
  } else if (type === "incidental") {
    amountLocked = true;
    const days = Math.max(1, claim.eligibleDays || daysBetween(claim.periodFrom, claim.periodTo) || 1);
    const rate = entitlement?.incidentalPerDay ?? incidentalRow?.amountPerDay ?? null;
    eligible = rate != null ? Math.round(rate * days * 100) / 100 : 0;
    claimed = eligible;
    billRequired = Boolean(incidentalRow?.billsRequired);
    originalBillRequired = false;
    companyNameRequired = false;
    if (policy.overnightExclusions.incidental && claim.overnight) {
      eligible = 0;
      claimed = 0;
      checks.push({
        id: "inc-ovn",
        level: "block",
        label: "Incidental allowance is excluded when an overnight journey applies.",
      });
    }
    guidance.push({ label: "Incidental", value: rate != null ? `${inr(rate)}/day × ${days} day(s)` : "Not configured" });
    guidance.push({ label: "Bill", value: billRequired ? "Required" : "Not required" });
    amountHint = rate != null ? `${inr(rate)} × ${days} = ${inr(claimed)}` : "";
    if (rate == null) {
      checks.push({ id: "inc-na", level: "block", label: "Incidental allowance is not configured for your group." });
    }
  } else if (type === "ex_hq_travel") {
    claimed = Number(claim.ticketAmount) || 0;
    eligible = claimed;
    billRequired = claimRule?.billRequired ?? policy.billing.attachmentMandatory;
    priorApprovalRequired = priorApprovalRequired || Boolean(entitlement?.priorApproval) || policy.exHq.priorApprovalRequired;
    if (modeRow) {
      guidance.push({ label: "Entitled rail class", value: modeRow.railClass || "—" });
      guidance.push({
        label: "Air",
        value: modeRow.airAllowed && modeRow.airTrigger !== "not_allowed" ? `Allowed (${modeRow.airClass || "—"})` : "Not allowed",
      });
      guidance.push({ label: "Destination conveyance", value: modeRow.destinationConveyance || "—" });
    }
    if (policy.exHq.priorApprovalRequired) guidance.push({ label: "Prior Approval", value: "Required" });
    guidance.push({
      label: "Ex-HQ threshold",
      value: `${policy.exHq.distanceThresholdKm} KM ${policy.exHq.distanceBasis.replace("_", " ")}`,
    });
  } else if (type === "local_city") {
    claimed = Number(claim.travelAmount) || 0;
    eligible = claimed;
    billRequired = Boolean(claimRule?.billRequired || localRow?.mealsBillsRequired);
    const localMode = entitlement?.localMode || "";
    if (entitlement?.timeCategory) {
      guidance.push({
        label: "Time band",
        value: entitlement.timeCategory === "odd" ? "Odd hours" : "Peak / standard",
      });
    }
    if (localMode) guidance.push({ label: "Entitled travel mode", value: localMode });
    if (entitlement?.mealsMiscPerDay != null) {
      guidance.push({ label: "Meals / misc", value: `${inr(entitlement.mealsMiscPerDay)}/day` });
    }
  } else if (type === "other_travel") {
    claimed = Number(claim.travelAmount ?? claim.billAmount) || 0;
    eligible = claimed;
    billRequired = claimRule?.billRequired ?? policy.billing.attachmentMandatory;
  }

  if (group) guidance.push({ label: "Your Entitlement", value: group.name });
  if (claimRule) {
    guidance.push({ label: "Bill Required", value: billRequired ? "Yes" : "No" });
    if (priorApprovalRequired) guidance.push({ label: "Prior Approval", value: "Required" });
  }

  const deadline = resolveDeadline(policy, claimRule, completionDate(claim), today);
  guidance.push({ label: "Submission Deadline", value: deadline.message });

  const exceptionAmount = Math.max(0, Math.round((claimed - eligible) * 100) / 100);
  let exceptionRequired = exceptionAmount > 0.009;

  if (type === "lodging" && exceptionRequired) {
    const lvl = overLimitLevel(policy.lodgingRules.overLimitAction);
    checks.push({
      id: "lodging-over",
      level: lvl,
      label: `Claimed ${inr(claimed)} vs eligible ${inr(eligible)} (excess ${inr(exceptionAmount)}).`,
      detail: "Amount is not auto-reduced.",
    });
    if (policy.lodgingRules.exceptionsRequirePriorApproval) priorApprovalRequired = true;
  } else if (type === "boarding" && exceptionRequired) {
    const lvl = overLimitLevel(claimRule?.exceptionHandling ?? "allow_with_prior_approval");
    checks.push({
      id: "board-over",
      level: lvl,
      label: `Claimed ${inr(claimed)} exceeds boarding entitlement ${inr(eligible)}.`,
    });
  }

  if (type === "ex_hq_travel" || type === "local_city") {
    if (claim.modeOfTravel === "Air" && entitlement?.air) {
      const air = entitlement.air;
      if (!air.allowed || air.trigger === "not_allowed") {
        checks.push({
          id: "air-na",
          level: "block",
          label: "Air travel is not allowed for your entitlement.",
        });
      } else if (air.trigger === "journey_duration") {
        if (hours == null) {
          checks.push({
            id: "air-hours",
            level: "warn",
            label: "Enter departure and return to check the air journey-duration rule.",
          });
        } else if (hours < air.minHours) {
          const action = claimRule?.exceptionHandling ?? "allow_with_prior_approval";
          checks.push({
            id: "air-dur",
            level: overLimitLevel(action),
            label: `Journey duration is ${formatDuration(hours)}; air eligibility requires at least ${air.minHours} hours.`,
          });
          if (air.priorApproval) priorApprovalRequired = true;
        }
      } else if (air.trigger === "manual_approval") {
        checks.push({
          id: "air-manual",
          level: "exception",
          label: "Air travel requires prior approval for your entitlement.",
        });
        priorApprovalRequired = true;
      }
      if (air.priorApproval) priorApprovalRequired = true;
    } else if (claim.modeOfTravel === "Air" && !entitlement?.air) {
      checks.push({ id: "air-row", level: "block", label: "Air entitlement is not configured for your group." });
    }

    if (claim.modeOfTravel && modeRow) {
      const entitledModes = new Set<string>();
      if (modeRow.railClass) entitledModes.add("Rail");
      if (modeRow.airAllowed && modeRow.airTrigger !== "not_allowed") entitledModes.add("Air");
      const conv = norm(modeRow.destinationConveyance);
      if (conv.includes("taxi") || conv.includes("cab")) entitledModes.add("Taxi");
      if (conv.includes("auto")) entitledModes.add("Auto");
      if (conv.includes("bus")) entitledModes.add("Bus");
      if (conv.includes("train") || conv.includes("metro")) entitledModes.add("Local Train");
      if (claim.modeOfTravel === "Own Vehicle") {
        const own = policy.ownVehicleExHq.find((r) => r.allowed);
        if (!own) {
          checks.push({
            id: "mode-own",
            level: overLimitLevel(claimRule?.exceptionHandling ?? "allow_with_prior_approval"),
            label: "Selected travel mode exceeds policy entitlement.",
          });
        }
      } else if (
        claim.modeOfTravel !== "Other" &&
        entitledModes.size > 0 &&
        !entitledModes.has(claim.modeOfTravel) &&
        claim.modeOfTravel !== "Air"
      ) {
        checks.push({
          id: "mode-ex",
          level: overLimitLevel(claimRule?.exceptionHandling ?? "allow_with_prior_approval"),
          label: "Selected travel mode exceeds policy entitlement.",
        });
      }
    }
  }

  let monthlyKmNote: string | null = null;
  if (type === "personal_vehicle_km" && (policy.kmRules.monthlyApprovalRequired || kmRow?.monthlyKmApprovalRequired)) {
    monthlyKmNote = "Manager KM approval required before final claim approval.";
    checks.push({
      id: "km-monthly",
      level: "warn",
      label: "Monthly KM Approval Required",
      detail: monthlyKmNote,
    });
  }

  if (deadline.kind === "within") {
    checks.push({ id: "deadline-ok", level: "ok", label: "Submitted within allowed period", detail: deadline.message });
  } else if (deadline.kind === "blocked") {
    checks.push({ id: "deadline-block", level: "block", label: deadline.message });
  } else {
    const lateAction = policy.maxClaimAge.action;
    const level: PolicyCheckLevel =
      lateAction === "block" ? "block" : lateAction === "warn" ? "warn" : "exception";
    checks.push({ id: "deadline-late", level, label: deadline.message });
  }

  if (billRequired) {
    const ok = hasKind(claim, "bill") || (type === "ex_hq_travel" && (hasKind(claim, "ticket") || hasKind(claim, "bill")));
    if (ok) checks.push({ id: "bill-ok", level: "ok", label: "Bill attached" });
    else checks.push({ id: "bill-miss", level: "block", label: "Bill / supporting document is required by policy." });
  } else {
    checks.push({ id: "bill-na", level: "ok", label: "Bill not required for this claim type" });
  }

  if (companyNameRequired && (type === "lodging" || type === "ex_hq_travel" || type === "other_travel")) {
    if (claim.billInCompanyName == null) {
      checks.push({
        id: "co-bill-need",
        level: "block",
        label: "Confirm whether the bill is in company name.",
      });
    } else if (claim.billInCompanyName === false) {
      const lvl = overLimitLevel(claimRule?.exceptionHandling ?? policy.lodgingRules.overLimitAction);
      checks.push({
        id: "co-bill",
        level: lvl,
        label: "Bill is not in company name.",
      });
    }
  }

  if (gstinRequired && type === "lodging" && billRequired && !claim.hotelGstin.trim()) {
    checks.push({ id: "gstin", level: "block", label: "Hotel GSTIN is required by policy." });
  }

  const isExHqClaim = type === "ex_hq_travel" || entitlement?.context.exHq === true;
  if (isExHqClaim && policy.exHq.priorApprovalRequired && type !== "local_city" && type !== "field_conveyance") {
    if (!linkedReq || linkedReq.status !== "approved") {
      checks.push({
        id: "tr-req",
        level: "block",
        label: "Ex-HQ claim requires a linked Approved Travel Request.",
      });
    } else {
      checks.push({
        id: "tr-ok",
        level: "ok",
        label: `Linked approved travel request ${linkedReq.requestNo}`,
      });
      const approvedMode = linkedReq.snapshot?.requestedMode || "";
      if (approvedMode && claim.modeOfTravel && norm(approvedMode) !== norm(claim.modeOfTravel)) {
        checks.push({
          id: "tr-dev",
          level: "exception",
          label: "Deviation from Approved Travel Request",
          detail: `Approved ${approvedMode} · Claimed ${claim.modeOfTravel}`,
        });
        exceptionRequired = true;
      }
      if (linkedReq.snapshot && claimed > 0) {
        const est = linkedReq.snapshot.estimatedTotal;
        const variance = claimed - est;
        checks.push({
          id: "tr-var",
          level: "ok",
          label: `Approved estimate ${inr(est)} · Actual claim ${inr(claimed)} · Variance ${inr(variance)}`,
        });
      }
    }
  } else if (priorApprovalRequired) {
    const attached = hasKind(claim, "approval") || Boolean(claim.priorApprovalRef.trim()) || Boolean(linkedReq?.status === "approved");
    if (attached) checks.push({ id: "pa-ok", level: "ok", label: "Prior approval evidence attached" });
    else {
      checks.push({
        id: "pa-miss",
        level: "exception",
        label: "Prior approval is required — attach approval evidence.",
      });
    }
  }

  const v = validateTravelClaim(
    {
      employee,
      travelDate,
      completionDate: completionDate(claim),
      city: cityName || undefined,
      travelType: travelContextKind(claim),
      stayType: stayKind(claim),
      vehicleType: type === "personal_vehicle_km" ? claim.vehicleType || undefined : undefined,
      kmTravelled: type === "personal_vehicle_km" ? claim.kmTravelled ?? undefined : undefined,
      startPoint: claim.startPoint || undefined,
      destination: claim.destinationPoint || claim.destination || undefined,
      purpose: claim.purpose || undefined,
      distanceKm: claim.distanceKm ?? undefined,
      overnight: query.overnight,
      journeyHours: hours ?? undefined,
    },
    policy,
  );
  v.issues.forEach((issue, i) => {
    if (issue.field === "lodgingAmount") return;
    const dup = checks.some((c) => c.label === issue.message);
    if (!dup) applyIssue(checks, issue, `v-${i}`);
  });

  if (!claim.claimType) {
    checks.push({ id: "type", level: "block", label: "Select a claim type." });
  }
  if (!claim.expenseDate) {
    checks.push({ id: "date", level: "block", label: "Expense / travel date is required." });
  }
  if (!claim.purpose.trim() && claim.claimType) {
    checks.push({ id: "purpose", level: "block", label: "Purpose is required." });
  }

  if (type === "ex_hq_travel") {
    if (!claim.travelFrom.trim()) checks.push({ id: "from", level: "block", label: "Travel from is required." });
    if (!(claim.destination.trim() || claim.city.trim())) {
      checks.push({ id: "dest", level: "block", label: "Destination is required." });
    }
    if (!claim.departureAt) checks.push({ id: "dep", level: "block", label: "Departure date/time is required." });
    if (!claim.returnAt) checks.push({ id: "ret", level: "block", label: "Return date/time is required." });
    if (!claim.modeOfTravel) checks.push({ id: "mode", level: "block", label: "Mode of travel is required." });
  }
  if (type === "lodging") {
    if (!claim.city.trim()) checks.push({ id: "city", level: "block", label: "City is required." });
    if (!claim.checkInDate) checks.push({ id: "in", level: "block", label: "Check-in date is required." });
    if (!claim.checkOutDate) checks.push({ id: "out", level: "block", label: "Check-out date is required." });
    if (claim.billAmount == null || claim.billAmount < 0) {
      checks.push({ id: "amt", level: "block", label: "Bill amount is required." });
    }
  }
  if (type === "personal_vehicle_km") {
    if (!claim.expenseDate) checks.push({ id: "km-date", level: "block", label: "Travel date is required." });
    if (policy.kmClaimFields.kmTravelled && (claim.kmTravelled == null || claim.kmTravelled < 0)) {
      checks.push({ id: "km", level: "block", label: "KM travelled is required." });
    }
  }
  if (type === "overnight_journey") {
    if (!claim.journeyStart) checks.push({ id: "js", level: "block", label: "Journey start is required." });
    if (!claim.journeyEnd) checks.push({ id: "je", level: "block", label: "Journey end is required." });
  }
  if (type === "local_city") {
    if (!claim.expenseDate) checks.push({ id: "ld", level: "block", label: "Date is required." });
    if (!claim.startTime) checks.push({ id: "st", level: "block", label: "Start time is required." });
    if (!claim.endTime) checks.push({ id: "et", level: "block", label: "End time is required." });
    if (!claim.fromLocation.trim()) checks.push({ id: "lf", level: "block", label: "From location is required." });
    if (!claim.toLocation.trim()) checks.push({ id: "lt", level: "block", label: "To location is required." });
  }
  if (type === "field_conveyance") {
    if (!claim.expenseDate) checks.push({ id: "fd", level: "block", label: "Date is required." });
    if (!claim.locationMarket.trim() && !claim.city.trim()) {
      checks.push({ id: "floc", level: "block", label: "Location / market is required." });
    }
  }

  exceptionRequired = exceptionRequired || checks.some((c) => c.level === "exception");
  if (exceptionRequired) {
    if (!claim.exceptionReason.trim()) {
      checks.push({ id: "ex-reason", level: "block", label: "Exception reason is required when the claim exceeds policy." });
    } else {
      checks.push({ id: "ex-flag", level: "exception", label: "Exception approval required" });
    }
    if (priorApprovalRequired && !(hasKind(claim, "approval") || claim.priorApprovalRef.trim())) {
      /* already flagged */
    }
  }

  if (claimed <= eligible + 0.009 && claimed > 0 && !checks.some((c) => c.id === "within")) {
    checks.push({ id: "within", level: "ok", label: "Claim within entitlement" });
  }

  const blockReasons = [...new Set(checks.filter((c) => c.level === "block").map((c) => c.label))];
  const canSubmit = Boolean(type) && blockReasons.length === 0 && claimed >= 0;

  const airNote =
    entitlement?.air == null
      ? ""
      : entitlement.air.allowed
        ? `Air ${entitlement.air.airClass || ""} · trigger ${entitlement.air.trigger.replace(/_/g, " ")}${
            entitlement.air.trigger === "journey_duration" ? ` (${entitlement.air.minHours}h)` : ""
          }`
        : "Air not allowed";

  if (group) {
    /* guidance already has entitlement */
  } else {
    checks.push({
      id: "group",
      level: "warn",
      label: "Your designation is not mapped to an entitlement group. Limits may not resolve.",
    });
  }

  return {
    policy,
    policyError: null,
    entitlement,
    claimRule,
    groupName: group?.name ?? null,
    cityClassName: cityClass?.name ?? null,
    hqNote,
    guidance: uniqueGuidance(guidance),
    checks,
    claimedAmount: claimed,
    eligibleAmount: eligible,
    exceptionAmount: exceptionAmount,
    amountLocked,
    amountHint,
    billRequired,
    originalBillRequired,
    companyNameRequired,
    gstinRequired,
    priorApprovalRequired,
    exceptionRequired,
    nights,
    journeyHours: hours,
    journeyLabel: formatDuration(hours),
    kmRate,
    kmCalcLabel,
    localMode: entitlement?.localMode || "",
    timeCategory: entitlement?.timeCategory ?? null,
    entitledRailClass: modeRow?.railClass || "",
    airNote,
    monthlyKmNote,
    deadline,
    canSubmit,
    blockReasons,
  };
}

function uniqueGuidance(rows: { label: string; value: string }[]): { label: string; value: string }[] {
  const seen = new Set<string>();
  const out: { label: string; value: string }[] = [];
  for (const r of rows) {
    const k = `${r.label}|${r.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function buildPolicySnapshot(
  _employee: HrEmployee,
  claim: EmployeeTravelClaim,
  evaln: ClaimEvaluation,
): PolicyEntitlementSnapshot | null {
  if (!evaln.policy) return null;
  const ref = snapshotPolicyRef(evaln.policy);
  const ent = evaln.entitlement;
  return {
    capturedAt: new Date().toISOString(),
    policyId: ref.policyId,
    policyName: ref.policyName,
    policyNumber: ref.policyNumber,
    effectiveFrom: ref.effectiveFrom,
    groupId: ent?.group?.id ?? null,
    groupName: evaln.groupName,
    cityClassId: ent?.cityClass?.id ?? null,
    cityClassName: evaln.cityClassName,
    lodgingLimitPerNight: ent?.lodgingLimit ?? null,
    boardingLimitPerDay: ent?.boardingLimit ?? null,
    relativesPerNight: ent?.relativesPerNight ?? null,
    fieldAllowanceType: ent?.fieldConveyance?.allowanceType ?? null,
    fieldAmount: ent?.fieldConveyance?.amount ?? null,
    incidentalPerDay: ent?.incidentalPerDay ?? null,
    kmRate: evaln.kmRate,
    kmAmount: ent?.kmAmount ?? null,
    overnightFromHours: ent?.overnightSlab?.fromHours ?? null,
    overnightToHours: ent?.overnightSlab?.toHours ?? null,
    overnightAmount: ent?.overnightAmount ?? null,
    localMode: evaln.localMode,
    timeCategory: evaln.timeCategory,
    airAllowed: ent?.air?.allowed ?? null,
    airMinHours: ent?.air?.minHours ?? null,
    airTrigger: ent?.air?.trigger ?? null,
    billRequired: evaln.billRequired,
    priorApprovalRequired: evaln.priorApprovalRequired,
    guidance: evaln.guidance,
    eligibleAmount: evaln.eligibleAmount,
    claimedAmount: evaln.claimedAmount,
    exceptionAmount: evaln.exceptionAmount,
    amountLocked: evaln.amountLocked,
    nights: evaln.nights,
    deadlineMessage: evaln.deadline?.message ?? "",
    deadlineKind: evaln.deadline?.kind ?? "",
    daysAfterTravel: daysBetween(
      (claim.checkOutDate || claim.periodTo || claim.expenseDate || "").slice(0, 10) || policyToday(),
      policyToday(),
    ),
    maxClaimAgeDays: evaln.policy.maxClaimAge.days,
    monthlyKmNote: evaln.monthlyKmNote,
  };
}

export function vehicleTypesFromPolicy(policy: TravelPolicy | null): string[] {
  if (!policy) return [];
  const names = new Set<string>();
  for (const r of policy.kmRates.filter((x) => x.active)) names.add(r.vehicleType);
  for (const r of policy.ownVehicleExHq.filter((x) => x.allowed)) names.add(r.vehicleType);
  return [...names];
}

export { getApplicableTravelPolicy, getEmployeeEntitlementGroup, resolveCityClassification };
