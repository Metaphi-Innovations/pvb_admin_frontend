/**
 * Travel policy resolvers for Admin preview and future mobile consumption.
 * Do not duplicate this logic in a mobile-specific module.
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { loadBranches } from "@/app/(app)/hr/settings/organization-data";
import {
  loadTravelPolicies,
  type AirEligibilityTrigger,
  type CityClass,
  type EntitlementGroup,
  type FieldConveyanceCell,
  type LodgingBoardingCell,
  type OvernightSlab,
  type RelativesStayCell,
  type TimeBand,
  type TimeBandCategory,
  type TravelPolicy,
} from "./travel-policy-data";

export type TravelContextKind = "hq_local" | "ex_hq" | "overnight_journey" | "official_tour";
export type StayKind = "hotel" | "relatives_friends";

export interface TravelEntitlementQuery {
  employee: HrEmployee;
  travelDate: string;
  city?: string;
  travelType?: TravelContextKind;
  stayType?: StayKind;
  mode?: string;
  vehicleType?: string;
  distanceKm?: number;
  journeyHours?: number;
  timeOfDay?: string;
  overnight?: boolean;
  /** When set, skip live “current policy” lookup (historical request / linked claim). */
  policy?: TravelPolicy;
}

export interface TravelClaimInput {
  employee: HrEmployee;
  travelDate: string;
  completionDate?: string;
  city?: string;
  travelType?: TravelContextKind;
  stayType?: StayKind;
  lodgingAmount?: number;
  kmTravelled?: number;
  approvedMonthlyKm?: number;
  vehicleType?: string;
  startPoint?: string;
  destination?: string;
  purpose?: string;
  distanceKm?: number;
  overnight?: boolean;
  journeyHours?: number;
  expenseHints?: string[];
}

export interface ValidationIssue {
  level: "block" | "warn" | "exception";
  message: string;
  field?: string;
}

function cityKey(state: string, city: string): string {
  return `${state.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function getApplicableTravelPolicy(
  employee: HrEmployee,
  travelDate: string,
  policies?: TravelPolicy[],
): TravelPolicy | null {
  const list = (policies ?? loadTravelPolicies()).filter((p) => p.status === "active");
  const dated = list.filter((p) => {
    const from = p.effectiveFrom || "0000-01-01";
    const to = p.effectiveTo || "9999-12-31";
    return travelDate >= from && travelDate <= to;
  });
  if (dated.length === 0) return null;
  const current = dated.find((p) => p.isCurrent);
  return current ?? dated.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null;
}

function designationBlob(employee: HrEmployee): string {
  return `${employee.designation || ""} ${employee.employeeType || ""}`.toLowerCase();
}

export function getEmployeeEntitlementGroup(
  policy: TravelPolicy,
  employee: HrEmployee,
): EntitlementGroup | null {
  const blob = designationBlob(employee);
  const activeMaps = policy.roleMappings.filter((m) => m.active);
  const exact = activeMaps.find((m) => m.designationName && norm(m.designationName) === norm(employee.designation || ""));
  if (exact) return policy.groups.find((g) => g.id === exact.groupId && g.active) ?? null;

  const fuzzy = activeMaps.find((m) => {
    const n = norm(m.designationName);
    if (!n) return false;
    if (blob.includes(n)) return true;
    const tokens = n.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
    return tokens.some((t) => t.length >= 3 && blob.includes(t));
  });
  if (fuzzy) return policy.groups.find((g) => g.id === fuzzy.groupId && g.active) ?? null;

  for (const g of policy.groups.filter((x) => x.active)) {
    const gn = norm(g.name);
    if (gn && blob.includes(gn.split("/")[0]!.trim())) return g;
  }
  return null;
}

function employeeGenderKey(gender: string): "male" | "female" | "all" {
  const g = norm(gender);
  if (g.startsWith("f")) return "female";
  if (g.startsWith("m")) return "male";
  return "all";
}

export function resolveLocalTravelMode(
  policy: TravelPolicy,
  local: { nonPeakMode: string; peakOddMode: string } | undefined,
  timeCategory: TimeBandCategory | null,
  gender: string,
): { mode: string; safetyUpgradeApplied: boolean } {
  const standard = local?.nonPeakMode || "";
  const peakOdd = local?.peakOddMode || standard;
  const inPeakOrOdd = timeCategory === "peak" || timeCategory === "odd";
  const base = inPeakOrOdd ? peakOdd : standard;
  const cfg = policy.oddHoursSafety;
  if (!cfg?.enabled || timeCategory !== "odd") {
    return { mode: base, safetyUpgradeApplied: false };
  }
  const gKey = employeeGenderKey(gender);
  const applies = cfg.applicability === "all" || cfg.applicability === gKey;
  if (!applies) return { mode: base, safetyUpgradeApplied: false };

  if (cfg.upgradeRule === "specific_mode" && cfg.specificMode.trim()) {
    return { mode: cfg.specificMode.trim(), safetyUpgradeApplied: true };
  }
  if (cfg.upgradeRule === "custom" && cfg.customNote.trim()) {
    return { mode: cfg.customNote.trim(), safetyUpgradeApplied: true };
  }

  const ladder = (policy.modeLadder || []).map((s) => s.trim()).filter(Boolean);
  const start = standard || base;
  const idx = ladder.findIndex((l) => norm(l) === norm(start) || norm(l) === norm(base));
  if (idx >= 0 && idx < ladder.length - 1) {
    return { mode: ladder[idx + 1]!, safetyUpgradeApplied: true };
  }
  return { mode: base, safetyUpgradeApplied: false };
}

export function resolveCityClassification(policy: TravelPolicy, cityName: string): CityClass | null {
  const active = policy.cityClasses.filter((c) => c.active);
  const needle = norm(cityName);
  if (!needle) return active.find((c) => c.isFallback) ?? null;
  for (const cls of active) {
    if (cls.isFallback) continue;
    const hit = cls.cities.some((c) => {
      const city = norm(c.city);
      return city === needle || needle.includes(city) || city.includes(needle) || cityKey(c.state, c.city).endsWith(`|${needle}`);
    });
    if (hit) return cls;
  }
  return active.find((c) => c.isFallback) ?? null;
}

export function classifyTravelContext(
  policy: TravelPolicy,
  input: { distanceKm?: number; overnight?: boolean },
): { kind: TravelContextKind; exHq: boolean; priorApprovalRequired: boolean } {
  const overnight = input.overnight === true && policy.exHq.overnightIsExHq;
  const threshold = policy.exHq.distanceThresholdKm;
  const beyond =
    input.distanceKm != null && Number.isFinite(input.distanceKm) && input.distanceKm > threshold;
  const exHq = overnight || beyond;
  return {
    kind: overnight ? "overnight_journey" : exHq ? "ex_hq" : "hq_local",
    exHq,
    priorApprovalRequired: exHq && policy.exHq.priorApprovalRequired,
  };
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map((x) => Number(x));
  return (h || 0) * 60 + (m || 0);
}

/** Bands may wrap midnight (e.g. 22:00–06:00). */
export function timeInBand(timeOfDay: string, band: TimeBand): boolean {
  const t = timeToMin(timeOfDay);
  const a = timeToMin(band.startTime);
  const b = timeToMin(band.endTime);
  if (a === b) return true;
  if (a < b) return t >= a && t < b;
  return t >= a || t < b;
}

export function resolveTimeCategory(
  policy: TravelPolicy,
  timeOfDay: string,
  gender: string,
): TimeBandCategory {
  const g = norm(gender);
  const genderKey = g.startsWith("f") ? "female" : g.startsWith("m") ? "male" : "all";
  const applicable = (band: TimeBand) =>
    band.applicability === "all" || band.applicability === genderKey;
  const odd = policy.timeBands.filter((b) => b.category === "odd" && applicable(b));
  if (odd.some((b) => timeInBand(timeOfDay, b))) return "odd";
  const peak = policy.timeBands.filter((b) => b.category === "peak" && applicable(b));
  if (peak.some((b) => timeInBand(timeOfDay, b))) return "peak";
  return "peak";
}

export function resolveOvernightSlab(policy: TravelPolicy, hours: number): OvernightSlab | null {
  return (
    policy.overnightSlabs.find((s) => hours >= s.fromHours && hours < s.toHours) ??
    policy.overnightSlabs.find((s) => hours >= s.fromHours && hours <= s.toHours) ??
    null
  );
}

export function resolveKmRate(policy: TravelPolicy, vehicleType: string): number | null {
  const row = policy.kmRates.find(
    (r) => r.active && norm(r.vehicleType) === norm(vehicleType),
  );
  return row ? row.ratePerKm : null;
}

export function resolveOwnVehicleRate(policy: TravelPolicy, vehicleType: string): number | null {
  const own = policy.ownVehicleExHq.find((r) => norm(r.vehicleType) === norm(vehicleType));
  if (!own || !own.allowed) return null;
  if (own.useSharedKmRate) return resolveKmRate(policy, vehicleType);
  return own.ratePerKm;
}

export function getLodgingCell(
  policy: TravelPolicy,
  groupId: string,
  classId: string,
): LodgingBoardingCell | undefined {
  return policy.lodgingBoarding.find((c) => c.groupId === groupId && c.classId === classId);
}

export function getRelativesCell(
  policy: TravelPolicy,
  groupId: string,
  classId: string,
): RelativesStayCell | undefined {
  return policy.relativesStay.find((c) => c.groupId === groupId && c.classId === classId);
}

export function getFieldCell(
  policy: TravelPolicy,
  groupId: string,
  classId: string,
): FieldConveyanceCell | undefined {
  return policy.fieldConveyance.find((c) => c.groupId === groupId && c.classId === classId);
}

export interface TravelEntitlementResult {
  policyId: number;
  policyName: string;
  group: EntitlementGroup | null;
  cityClass: CityClass | null;
  context: ReturnType<typeof classifyTravelContext>;
  lodgingLimit: number | null;
  boardingLimit: number | null;
  relativesPerNight: number | null;
  fieldConveyance: FieldConveyanceCell | null;
  incidentalPerDay: number | null;
  mealsMiscPerDay: number | null;
  localMode: string;
  timeCategory: TimeBandCategory | null;
  kmRate: number | null;
  kmAmount: number | null;
  overnightSlab: OvernightSlab | null;
  overnightAmount: number | null;
  air: { allowed: boolean; trigger: AirEligibilityTrigger; minHours: number; priorApproval: boolean; airClass: string } | null;
  billRequiredHotel: boolean;
  priorApproval: boolean;
  safetyUpgradeApplied: boolean;
  guidance: { label: string; value: string }[];
  hqNote: string;
}

function employeeGender(employee: HrEmployee): string {
  return employee.personal?.gender || "";
}

export function getEmployeeHqNote(employee: HrEmployee): string {
  const branches = loadBranches();
  const b = branches.find(
    (x) =>
      x.code === employee.branch ||
      x.name === employee.branch ||
      norm(x.name) === norm(employee.branch || ""),
  );
  if (b?.city) {
    return `HQ city from employee Branch (${b.name}): ${b.city}. Distance/GPS is not on the employee record — Ex-HQ distance must be supplied by the claim.`;
  }
  if (employee.branch) {
    return `Employee Branch is "${employee.branch}". Branch city is not resolved — Ex-HQ uses claim distance against the configured KM threshold.`;
  }
  return "Employee Headquarters city is not stored on the employee master. Ex-HQ uses claim distance vs configured threshold.";
}

export function getTravelEntitlement(q: TravelEntitlementQuery): TravelEntitlementResult | { error: string } {
  const policy = q.policy ?? getApplicableTravelPolicy(q.employee, q.travelDate);
  if (!policy) return { error: "No active travel policy covers this travel date." };
  const group = getEmployeeEntitlementGroup(policy, q.employee);
  const cityClass = q.city ? resolveCityClassification(policy, q.city) : policy.cityClasses.find((c) => c.isFallback) ?? null;
  const context = classifyTravelContext(policy, { distanceKm: q.distanceKm, overnight: q.overnight });
  const lb = group && cityClass ? getLodgingCell(policy, group.id, cityClass.id) : undefined;
  const rel = group && cityClass ? getRelativesCell(policy, group.id, cityClass.id) : undefined;
  const field = group && cityClass ? getFieldCell(policy, group.id, cityClass.id) : undefined;
  const incidental = group ? policy.incidentals.find((i) => i.groupId === group.id) : undefined;
  const local = group ? policy.localTravel.find((i) => i.groupId === group.id) : undefined;
  const modeRow = group ? policy.travelModes.find((i) => i.groupId === group.id) : undefined;
  const timeCategory = q.timeOfDay
    ? resolveTimeCategory(policy, q.timeOfDay, employeeGender(q.employee))
    : null;
  const localResolved = resolveLocalTravelMode(policy, local, timeCategory, employeeGender(q.employee));
  const localMode = localResolved.mode;
  const kmRate = q.vehicleType ? resolveOwnVehicleRate(policy, q.vehicleType) ?? resolveKmRate(policy, q.vehicleType) : null;
  const kmAmount =
    kmRate != null && q.distanceKm != null ? Math.round(kmRate * q.distanceKm * 100) / 100 : null;
  const slab = q.journeyHours != null ? resolveOvernightSlab(policy, q.journeyHours) : null;
  let overnightAmount: number | null = null;
  if (slab) {
    if (slab.reimburseType === "fixed") overnightAmount = slab.amount;
    else overnightAmount = lb ? Math.round((lb.boardingLimit * slab.amount) / 100) : null;
  }

  const lodgingLimit = q.stayType === "relatives_friends" ? null : lb?.lodgingLimit ?? null;
  const relativesPerNight = q.stayType === "relatives_friends" ? rel?.amountPerNight ?? null : null;

  const guidance: { label: string; value: string }[] = [];
  if (q.stayType === "relatives_friends") {
    guidance.push({
      label: "Stay with Relatives/Friends",
      value: relativesPerNight == null ? "Not applicable" : `₹${relativesPerNight.toLocaleString("en-IN")}/night`,
    });
  } else if (lodgingLimit != null) {
    guidance.push({ label: "Hotel Limit", value: `₹${lodgingLimit.toLocaleString("en-IN")}/night` });
    if (lb) guidance.push({ label: "Boarding", value: `₹${lb.boardingLimit.toLocaleString("en-IN")}/day` });
    guidance.push({ label: "Bill Required", value: policy.lodgingRules.billRequired ? "Yes" : "No" });
  }
  if (context.priorApprovalRequired) guidance.push({ label: "Prior Approval", value: "Required" });
  if (localResolved.safetyUpgradeApplied) {
    guidance.push({
      label: "Odd Hours Safety Upgrade",
      value: localMode || "Applied",
    });
  }
  if (kmRate != null) guidance.push({ label: "KM Rate", value: `₹${kmRate}/km` });
  if (kmAmount != null) guidance.push({ label: "KM Amount", value: `₹${kmAmount.toLocaleString("en-IN")}` });

  return {
    policyId: policy.id,
    policyName: policy.name,
    group,
    cityClass,
    context,
    lodgingLimit,
    boardingLimit: lb?.boardingLimit ?? null,
    relativesPerNight,
    fieldConveyance: field ?? null,
    incidentalPerDay: incidental?.amountPerDay ?? null,
    mealsMiscPerDay: local?.mealsMiscPerDay ?? null,
    localMode,
    timeCategory,
    kmRate,
    kmAmount,
    overnightSlab: slab,
    overnightAmount,
    air: modeRow
      ? {
          allowed: modeRow.airAllowed && modeRow.airTrigger !== "not_allowed",
          trigger: modeRow.airTrigger,
          minHours: modeRow.airMinJourneyHours,
          priorApproval: modeRow.airPriorApproval,
          airClass: modeRow.airClass,
        }
      : null,
    billRequiredHotel: policy.lodgingRules.billRequired && q.stayType !== "relatives_friends",
    priorApproval: context.priorApprovalRequired,
    safetyUpgradeApplied: localResolved.safetyUpgradeApplied,
    guidance,
    hqNote: getEmployeeHqNote(q.employee),
  };
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function validateTravelClaim(
  claim: TravelClaimInput,
  policy?: TravelPolicy | null,
): { ok: boolean; issues: ValidationIssue[]; policy: TravelPolicy | null } {
  const resolved = policy ?? getApplicableTravelPolicy(claim.employee, claim.travelDate);
  const issues: ValidationIssue[] = [];
  if (!resolved) {
    return { ok: false, issues: [{ level: "block", message: "No active travel policy for this travel date." }], policy: null };
  }

  const ent = getTravelEntitlement({
    employee: claim.employee,
    travelDate: claim.travelDate,
    city: claim.city,
    travelType: claim.travelType,
    stayType: claim.stayType,
    vehicleType: claim.vehicleType,
    distanceKm: claim.distanceKm ?? claim.kmTravelled,
    overnight: claim.overnight,
    journeyHours: claim.journeyHours,
  });
  if ("error" in ent) {
    issues.push({ level: "block", message: ent.error });
    return { ok: false, issues, policy: resolved };
  }

  const completion = claim.completionDate || claim.travelDate;
  const age = daysBetween(completion, policyTodaySafe());
  if (age > resolved.maxClaimAge.days) {
    const msg = `Claim is ${age} days after travel completion (maximum ${resolved.maxClaimAge.days} days).`;
    if (resolved.maxClaimAge.action === "block") issues.push({ level: "block", message: msg });
    else if (resolved.maxClaimAge.action === "warn") issues.push({ level: "warn", message: msg });
    else issues.push({ level: "exception", message: msg });
  }

  if (claim.stayType === "hotel" && claim.lodgingAmount != null && ent.lodgingLimit != null) {
    if (claim.lodgingAmount > ent.lodgingLimit) {
      const over = claim.lodgingAmount - ent.lodgingLimit;
      const msg = `₹${over.toLocaleString("en-IN")} exceeds your policy entitlement of ₹${ent.lodgingLimit.toLocaleString("en-IN")}. Prior approval is required.`;
      const action = resolved.lodgingRules.overLimitAction;
      if (action === "block") issues.push({ level: "block", message: msg, field: "lodgingAmount" });
      else if (action === "allow_and_flag") issues.push({ level: "warn", message: msg, field: "lodgingAmount" });
      else issues.push({ level: "exception", message: msg, field: "lodgingAmount" });
    }
  }

  if (claim.vehicleType || claim.kmTravelled != null) {
    const fields = resolved.kmClaimFields;
    if (fields.startPoint && !claim.startPoint?.trim()) {
      issues.push({ level: "block", message: "Start point is required for KM claims.", field: "startPoint" });
    }
    if (fields.destination && !claim.destination?.trim()) {
      issues.push({ level: "block", message: "Destination is required for KM claims.", field: "destination" });
    }
    if (fields.purpose && !claim.purpose?.trim()) {
      issues.push({ level: "block", message: "Purpose of visit is required for KM claims.", field: "purpose" });
    }
    if (fields.kmTravelled && (claim.kmTravelled == null || claim.kmTravelled < 0)) {
      issues.push({ level: "block", message: "KM travelled is required.", field: "kmTravelled" });
    }
    if (
      claim.approvedMonthlyKm != null &&
      claim.kmTravelled != null &&
      claim.kmTravelled > claim.approvedMonthlyKm
    ) {
      const msg = "Claimed KM differs from approved monthly KM.";
      if (resolved.kmRules.deviationAction === "block") issues.push({ level: "block", message: msg });
      else if (resolved.kmRules.deviationAction === "allow_with_warning") issues.push({ level: "warn", message: msg });
      else issues.push({ level: "exception", message: msg });
    }
  }

  if (ent.context.exHq && ent.context.priorApprovalRequired) {
    issues.push({
      level: "exception",
      message: `Ex-HQ travel (threshold ${resolved.exHq.distanceThresholdKm} KM ${resolved.exHq.distanceBasis.replace("_", " ")}). Prior approval is required.`,
    });
  }

  const inferredType =
    claim.kmTravelled != null
      ? "KM Reimbursement"
      : claim.stayType === "hotel" || claim.travelType === "ex_hq" || ent.context.exHq
        ? "Ex-HQ Tour"
        : "Local / City Travel";
  const hints = (claim.expenseHints ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean);
  for (const ex of resolved.exclusions.filter((e) => e.active)) {
    const types = (ex.claimTypes || []).map((t) => t.trim().toLowerCase());
    if (types.length && !types.includes(inferredType.toLowerCase())) continue;
    const name = ex.name.trim().toLowerCase();
    const hit = hints.length === 0 ? false : hints.some((h) => h === name || h.includes(name) || name.includes(h));
    if (!hit) continue;
    const msg = `Excluded expense: ${ex.name}${ex.description ? ` — ${ex.description}` : ""}`;
    issues.push({ level: ex.action === "block" ? "block" : "warn", message: msg });
  }

  const blocked = issues.some((i) => i.level === "block");
  return { ok: !blocked, issues, policy: resolved };
}

function policyTodaySafe(): string {
  return new Date().toISOString().slice(0, 10);
}

export function snapshotPolicyRef(policy: TravelPolicy): { policyId: number; policyName: string; policyNumber: string; effectiveFrom: string } {
  return {
    policyId: policy.id,
    policyName: policy.name,
    policyNumber: policy.policyNumber,
    effectiveFrom: policy.effectiveFrom,
  };
}

/** Spec aliases — same implementations, do not duplicate rule logic in UI. */
export { getEmployeeEntitlementGroup as resolveEntitlementGroup, classifyTravelContext as resolveTravelContext };
