/**
 * Pre-Travel request evaluation.
 * Reads Travel Policy via existing resolvers — does not copy matrices or hardcode 70 KM / air hours.
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { BRANCH_OPTIONS } from "@/lib/hr/config";
import { loadBranches } from "@/app/(app)/hr/settings/organization-data";
import {
  getActiveCitiesForState,
  getActiveMockStateNames,
} from "@/app/(app)/hr/sales-force-policy/stateCityMockData";
import { policyToday } from "@/lib/hr/policy-common";
import {
  airTriggerLabel,
  formatInr as policyFormatInr,
  getTravelPolicyById,
  loadTravelPolicies,
  type TravelPolicy,
} from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import {
  classifyTravelContext,
  getApplicableTravelPolicy,
  getEmployeeEntitlementGroup,
  getLodgingCell,
  getRelativesCell,
  resolveCityClassification,
  resolveOwnVehicleRate,
  resolveKmRate,
  snapshotPolicyRef,
  type TravelContextKind,
} from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-resolver";
import {
  type AirEligibility,
  type EmployeeTravelRequest,
  type HqSource,
  type TravelRequestCheck,
  type TravelRequestException,
  type TravelRequestSnapshot,
  formatInr,
} from "./travel-request-data";

export interface HqResolution {
  city: string;
  source: HqSource;
  sourceLabel: string;
  configured: boolean;
  message: string;
}

export interface TravelRequestEvaluation {
  policy: TravelPolicy | null;
  hq: HqResolution;
  groupName: string | null;
  cityClassName: string | null;
  cityClassId: string | null;
  context: TravelContextKind | "";
  contextLabel: string;
  priorApprovalRequired: boolean;
  entitledRailClass: string;
  airEligible: AirEligibility;
  airLabel: string;
  airMinHours: number;
  airTrigger: string;
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
  canSubmit: boolean;
  blockReasons: string[];
  chainRolesNeeded: boolean;
}

function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

function cityFromBranchLabel(label: string): string {
  const parts = label.split(/[—–-]/);
  return (parts[parts.length - 1] || "").trim();
}

export function resolveEmployeeHeadquarters(employee: HrEmployee): HqResolution {
  const extra = employee.employmentExtra as { headquarters?: string; hq?: string; workLocation?: string } | undefined;
  const dedicated = (extra?.headquarters || extra?.hq || "").trim();
  if (dedicated) {
    return {
      city: dedicated,
      source: "employee_hq",
      sourceLabel: "Employee",
      configured: true,
      message: "",
    };
  }

  const branches = loadBranches();
  const code = (employee.branch || "").trim();
  const byCode = branches.find(
    (b) =>
      norm(b.code) === norm(code) ||
      norm(b.name) === norm(code) ||
      (code && norm(b.name).includes(norm(code))),
  );
  if (byCode?.city?.trim()) {
    return {
      city: byCode.city.trim(),
      source: "branch",
      sourceLabel: "Branch",
      configured: true,
      message: "",
    };
  }

  const opt = BRANCH_OPTIONS.find((o) => o.value === code);
  if (opt) {
    const city = cityFromBranchLabel(opt.label);
    if (city) {
      const named = branches.find((b) => norm(b.city) === norm(city));
      return {
        city,
        source: "branch",
        sourceLabel: "Branch",
        configured: true,
        message: named ? "" : "Headquarters city taken from assigned Branch (temporary fallback).",
      };
    }
  }

  if (code) {
    const byCity = branches.find((b) => norm(b.city) === norm(code) || norm(b.name).includes(norm(code)));
    if (byCity?.city?.trim()) {
      return {
        city: byCity.city.trim(),
        source: "branch",
        sourceLabel: "Branch",
        configured: true,
        message: "",
      };
    }
  }

  return {
    city: "",
    source: "none",
    sourceLabel: "—",
    configured: false,
    message: "Employee Headquarters is not configured.",
  };
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

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = new Date(`${from.slice(0, 10)}T00:00:00`);
  const b = new Date(`${to.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function railRank(s: string): number {
  const n = norm(s);
  if (!n) return 0;
  if (/1st|first|\b1 ac\b|ac1|ac i\b/.test(n)) return 40;
  if (/2nd|second|\b2 ac\b|ac2|ac ii\b/.test(n)) return 30;
  if (/3rd|third|\b3 ac\b|ac3|ac iii\b/.test(n)) return 20;
  if (/chair|cc/.test(n)) return 12;
  if (/sleeper|\bsl\b/.test(n)) return 10;
  return 5;
}

function contextLabel(kind: TravelContextKind | ""): string {
  if (kind === "ex_hq") return "Ex-HQ";
  if (kind === "overnight_journey") return "Overnight / Ex-HQ";
  if (kind === "official_tour") return "Official Tour";
  if (kind === "hq_local") return "Local / HQ";
  return "—";
}

function taxiSummary(policy: TravelPolicy, kind: EmployeeTravelRequest["taxiKind"]): string {
  const t = policy.taxi;
  if (kind === "private") {
    if (t.privateType === "not_allowed") return "Private taxi: Not Allowed";
    if (t.privateType === "fixed_limit") return `Private taxi: Fixed limit ${policyFormatInr(t.privateFixedLimit)}`;
    return "Private taxi: Actual against bill";
  }
  if (kind === "shared") {
    if (t.sharedType === "per_km") return `Shared / public taxi: ₹${t.sharedRatePerKm}/KM`;
    return "Shared / public taxi: Actual reimbursement";
  }
  if (t.privateType === "not_allowed" && t.sharedType === "per_km") {
    return `Shared taxi ₹${t.sharedRatePerKm}/KM · Private: ${t.privateType.replace(/_/g, " ")}`;
  }
  return `Shared: ${t.sharedType.replace(/_/g, " ")} · Private: ${t.privateType.replace(/_/g, " ")}`;
}

export function evaluateTravelRequest(
  employee: HrEmployee,
  req: EmployeeTravelRequest,
  opts?: { frozenPolicy?: TravelPolicy | null },
): TravelRequestEvaluation {
  const today = policyToday();
  const travelDate = (req.departureDate || today).slice(0, 10);
  const livePolicy = getApplicableTravelPolicy(employee, travelDate, loadTravelPolicies());
  const frozen =
    opts?.frozenPolicy ??
    (req.snapshot?.policyId ? getTravelPolicyById(req.snapshot.policyId) ?? null : null);
  const policy = frozen ?? livePolicy;
  const hq = resolveEmployeeHeadquarters(employee);

  const empty: TravelRequestEvaluation = {
    policy: policy,
    hq,
    groupName: null,
    cityClassName: null,
    cityClassId: null,
    context: "",
    contextLabel: "—",
    priorApprovalRequired: false,
    entitledRailClass: "",
    airEligible: "",
    airLabel: "—",
    airMinHours: 0,
    airTrigger: "",
    destinationConveyance: "",
    lodgingLimit: null,
    boardingLimit: null,
    relativesPerNight: null,
    kmRate: null,
    kmAmount: null,
    taxiSummary: "",
    estimatedTravel: Number(req.estimatedTravelCost) || 0,
    estimatedStay: Number(req.estimatedStayCost) || 0,
    estimatedOther: Number(req.estimatedOtherCost) || 0,
    estimatedTotal: 0,
    policyEligibleEstimate: 0,
    exceptionEstimate: 0,
    exceptions: [],
    checks: [],
    guidance: [],
    canSubmit: false,
    blockReasons: [],
    chainRolesNeeded: false,
  };

  const checks: TravelRequestCheck[] = [];
  const exceptions: TravelRequestException[] = [];
  const guidance: { label: string; value: string }[] = [];

  if (!hq.configured) {
    checks.push({
      id: "hq",
      level: "block",
      label: "Employee Headquarters is not configured.",
      detail: "Automatic Ex-HQ determination is blocked until Headquarters or Branch city is set.",
    });
  } else {
    checks.push({
      id: "hq",
      level: "ok",
      label: `Headquarters: ${hq.city}`,
      detail: `Source: ${hq.sourceLabel}${hq.message ? ` · ${hq.message}` : ""}`,
    });
  }

  if (!policy) {
    checks.push({
      id: "policy",
      level: "block",
      label: "No active travel policy covers this travel date.",
    });
    empty.checks = checks;
    empty.blockReasons = checks.filter((c) => c.level === "block").map((c) => c.label);
    empty.estimatedTotal = empty.estimatedTravel + empty.estimatedStay + empty.estimatedOther;
    return empty;
  }

  checks.push({ id: "policy", level: "ok", label: "Employee eligible", detail: policy.name });

  const group = getEmployeeEntitlementGroup(policy, employee);
  if (group) {
    checks.push({ id: "group", level: "ok", label: `Entitlement group: ${group.name}` });
  } else {
    checks.push({
      id: "group",
      level: "block",
      label: "Designation is not mapped to an entitlement group.",
    });
  }

  const dest = req.destination.trim();
  const cityClass = dest ? resolveCityClassification(policy, dest) : policy.cityClasses.find((c) => c.isFallback) ?? null;
  if (dest) {
    if (cityClass) {
      checks.push({
        id: "city",
        level: "ok",
        label: "Destination classified",
        detail: `${dest} · ${cityClass.name}`,
      });
    } else {
      checks.push({ id: "city", level: "warn", label: "Destination could not be classified; fallback will apply." });
    }
  }

  const overnight = req.stayRequired || daysBetween(req.departureDate, req.returnDate) >= 1;
  let context: TravelContextKind | "" = "";
  let priorApprovalRequired = false;

  if (!hq.configured) {
    if (overnight && policy.exHq.overnightIsExHq) {
      const ctx = classifyTravelContext(policy, { overnight: true });
      context = ctx.kind;
      priorApprovalRequired = ctx.priorApprovalRequired;
    } else {
      context = "";
    }
  } else {
    const ctx = classifyTravelContext(policy, {
      distanceKm: req.distanceKm ?? undefined,
      overnight,
    });
    context = ctx.kind;
    priorApprovalRequired = ctx.priorApprovalRequired;
  }

  const modeRow = group ? policy.travelModes.find((m) => m.groupId === group.id) : undefined;
  const stayCity = (req.stayCity || dest).trim();
  const stayClass = stayCity ? resolveCityClassification(policy, stayCity) : cityClass;
  const lb = group && stayClass ? getLodgingCell(policy, group.id, stayClass.id) : undefined;
  const rel = group && stayClass ? getRelativesCell(policy, group.id, stayClass.id) : undefined;

  const nights =
    req.expectedNights != null && req.expectedNights > 0
      ? req.expectedNights
      : Math.max(overnight ? 1 : 0, daysBetween(req.departureDate, req.returnDate));

  const kmRate =
    req.travelMode === "Own Vehicle" && req.vehicleType
      ? resolveOwnVehicleRate(policy, req.vehicleType) ?? resolveKmRate(policy, req.vehicleType)
      : req.travelMode === "Taxi" && req.taxiKind === "shared" && policy.taxi.sharedType === "per_km"
        ? policy.taxi.sharedRatePerKm
        : null;
  const kmAmount =
    kmRate != null && req.distanceKm != null ? Math.round(kmRate * req.distanceKm * 100) / 100 : null;

  let airEligible: AirEligibility = "";
  let airLabel = "—";
  if (req.travelMode === "Air" && modeRow) {
    const hours = req.estimatedJourneyHours;
    if (modeRow.airTrigger === "not_allowed" || !modeRow.airAllowed) {
      airEligible = "no";
      airLabel = "Not Allowed";
      exceptions.push({ id: "air-na", label: "Air travel is not allowed for this entitlement group." });
      checks.push({ id: "mode", level: "exception", label: "Air travel not allowed — exception / not eligible." });
    } else if (modeRow.airTrigger === "always") {
      airEligible = "yes";
      airLabel = `Allowed · ${modeRow.airClass || "Economy"}`;
      checks.push({ id: "mode", level: "ok", label: "Travel mode allowed (Air)." });
      if (modeRow.airPriorApproval) {
        priorApprovalRequired = true;
        checks.push({ id: "air-appr", level: "warn", label: "Air travel requires approval." });
      }
    } else if (modeRow.airTrigger === "journey_duration") {
      const minH = modeRow.airMinJourneyHours;
      if (hours == null) {
        airEligible = "conditional";
        airLabel = `Conditional · road/rail journey > ${minH} hours`;
        checks.push({
          id: "air-hours",
          level: "warn",
          label: `Enter estimated road/rail journey duration (policy threshold ${minH} hours).`,
        });
      } else if (hours >= minH) {
        airEligible = "yes";
        airLabel = `Allowed · journey ${hours}h ≥ ${minH}h`;
        checks.push({ id: "mode", level: "ok", label: "Air eligible on journey-duration rule." });
        if (modeRow.airPriorApproval) {
          priorApprovalRequired = true;
          checks.push({ id: "air-appr", level: "warn", label: "Air travel requires approval." });
        }
      } else {
        airEligible = "no";
        airLabel = `Not eligible · ${hours}h < ${minH}h`;
        exceptions.push({
          id: "air-below",
          label: `Air requested below configured journey duration (${minH} hours).`,
        });
        checks.push({
          id: "mode",
          level: "exception",
          label: `Air not eligible below ${minH} hours — exception approval required.`,
        });
        priorApprovalRequired = true;
      }
    } else if (modeRow.airTrigger === "manual_approval") {
      airEligible = "conditional";
      airLabel = "Approval only";
      priorApprovalRequired = true;
      checks.push({ id: "air-appr", level: "warn", label: "Air travel requires approval." });
    }
  } else if (req.travelMode === "Rail") {
    const entitled = modeRow?.railClass || "";
    const requested = req.requestedRailClass.trim() || entitled;
    if (entitled && requested && railRank(requested) > railRank(entitled)) {
      exceptions.push({ id: "class", label: "Travel Class Exception" });
      checks.push({
        id: "class",
        level: "exception",
        label: "Requested rail class exceeds entitlement.",
        detail: `Entitled ${entitled} · Requested ${requested}`,
      });
      priorApprovalRequired = true;
    } else if (req.travelMode) {
      checks.push({ id: "mode", level: "ok", label: "Travel mode allowed (Rail)." });
    }
  } else if (req.travelMode === "Taxi") {
    const t = policy.taxi;
    if (req.taxiKind === "private" && t.privateType === "not_allowed") {
      exceptions.push({ id: "taxi", label: "Private taxi is not allowed." });
      checks.push({ id: "mode", level: "exception", label: "Private taxi is not allowed." });
    } else if (req.travelMode) {
      checks.push({ id: "mode", level: "ok", label: "Travel mode allowed (Taxi)." });
    }
  } else if (req.travelMode === "Own Vehicle") {
    const own = req.vehicleType
      ? policy.ownVehicleExHq.find((r) => norm(r.vehicleType) === norm(req.vehicleType))
      : undefined;
    if (own && !own.allowed) {
      exceptions.push({ id: "ov", label: "Own vehicle type is not allowed." });
      checks.push({ id: "mode", level: "exception", label: "Selected own vehicle is not allowed." });
    } else if (req.travelMode) {
      checks.push({ id: "mode", level: "ok", label: "Travel mode allowed (Own Vehicle)." });
      if (own?.priorApprovalRequired) {
        priorApprovalRequired = true;
        checks.push({ id: "ov-appr", level: "warn", label: "Own vehicle requires prior approval." });
      }
    }
  } else if (req.travelMode) {
    checks.push({ id: "mode", level: "ok", label: `Travel mode: ${req.travelMode}` });
  }

  if (req.departureDate && req.returnDate && req.returnDate < req.departureDate) {
    checks.push({ id: "dates", level: "block", label: "Return date cannot be before departure date." });
  }

  if (req.departureDate && req.departureDate < today) {
    if (priorApprovalRequired || (context !== "hq_local" && context !== "")) {
      checks.push({
        id: "before",
        level: "block",
        label: "Request must be submitted before travel when prior approval is required.",
      });
    } else {
      checks.push({
        id: "before",
        level: "warn",
        label: "Departure date is in the past.",
      });
    }
  } else if (req.departureDate) {
    checks.push({ id: "before", level: "ok", label: "Request submitted before travel." });
  }

  if (context === "ex_hq" || context === "overnight_journey") {
    if (policy.exHq.priorApprovalRequired) priorApprovalRequired = true;
  }

  let lodgingLimit: number | null = null;
  let boardingLimit: number | null = null;
  let relativesPerNight: number | null = null;
  let stayEligible = 0;

  if (req.stayRequired) {
    if (req.stayType === "relatives_friends") {
      relativesPerNight = rel?.amountPerNight ?? null;
      stayEligible = relativesPerNight != null ? relativesPerNight * nights : 0;
      if (relativesPerNight == null) {
        checks.push({
          id: "rel",
          level: "warn",
          label: "Stay with relatives/friends is not applicable for this group/city.",
        });
      }
    } else {
      lodgingLimit = lb?.lodgingLimit ?? null;
      boardingLimit = lb?.boardingLimit ?? null;
      stayEligible =
        (lodgingLimit != null ? lodgingLimit * nights : 0) + (boardingLimit != null ? boardingLimit * nights : 0);
    }
  }

  const travelEligible =
    kmAmount != null
      ? kmAmount
      : req.travelMode === "Taxi" && req.taxiKind === "private" && policy.taxi.privateType === "fixed_limit"
        ? policy.taxi.privateFixedLimit
        : Number(req.estimatedTravelCost) || 0;

  const estimatedTravel = Number(req.estimatedTravelCost) || kmAmount || 0;
  const estimatedStay = Number(req.estimatedStayCost) || stayEligible;
  const estimatedOther = Number(req.estimatedOtherCost) || 0;
  const estimatedTotal = estimatedTravel + estimatedStay + estimatedOther;
  const policyEligibleEstimate = travelEligible + stayEligible;
  const exceptionEstimate = Math.max(0, Math.round((estimatedTotal - policyEligibleEstimate) * 100) / 100);

  if (!req.purpose.trim()) checks.push({ id: "purpose", level: "block", label: "Travel purpose is required." });
  if (!req.travelFrom.trim()) checks.push({ id: "from", level: "block", label: "Travel from is required." });
  if (!dest) checks.push({ id: "dest", level: "block", label: "Destination is required." });
  if (!req.departureDate) checks.push({ id: "dep", level: "block", label: "Departure date is required." });
  if (!req.returnDate) checks.push({ id: "ret", level: "block", label: "Return date is required." });
  if (!req.travelMode) checks.push({ id: "need-mode", level: "block", label: "Travel mode is required." });
  if (req.travelMode === "Air" && !req.airReason.trim() && airEligible !== "yes") {
    checks.push({ id: "air-reason", level: "warn", label: "Reason for air travel is recommended." });
  }
  if (req.travelMode === "Own Vehicle" && !req.vehicleType) {
    checks.push({ id: "veh", level: "block", label: "Vehicle type is required for own vehicle." });
  }
  if (req.stayRequired && !req.stayType) {
    checks.push({ id: "stay-type", level: "block", label: "Stay type is required." });
  }

  guidance.push({ label: "Travel Context", value: contextLabel(context) });
  if (group) guidance.push({ label: "Entitlement Group", value: group.name });
  if (modeRow?.railClass) guidance.push({ label: "Rail Class", value: modeRow.railClass });
  if (modeRow) {
    guidance.push({
      label: "Air Travel",
      value: airLabel !== "—" ? airLabel : airTriggerLabel(modeRow.airTrigger),
    });
    if (modeRow.destinationConveyance) {
      guidance.push({ label: "Destination Conveyance", value: modeRow.destinationConveyance });
    }
  }
  guidance.push({ label: "Prior Approval", value: priorApprovalRequired ? "Required" : "Not required" });
  if (req.stayRequired && req.stayType === "relatives_friends") {
    guidance.push({
      label: "Relatives / Friends",
      value: relativesPerNight == null ? "Not applicable" : `${formatInr(relativesPerNight)} / night`,
    });
  } else if (req.stayRequired) {
    if (lodgingLimit != null) guidance.push({ label: "Lodging Limit", value: `${formatInr(lodgingLimit)} / night` });
    if (boardingLimit != null) guidance.push({ label: "Boarding Limit", value: `${formatInr(boardingLimit)} / day` });
  }
  if (cityClass) guidance.push({ label: "City Classification", value: cityClass.name });
  if (kmRate != null) guidance.push({ label: "KM Rate", value: `₹${kmRate}/KM` });
  if (kmAmount != null) guidance.push({ label: "Estimated Eligible KM", value: formatInr(kmAmount) });

  const blockReasons = [...new Set(checks.filter((c) => c.level === "block").map((c) => c.label))];
  const chainRolesNeeded = priorApprovalRequired || exceptions.length > 0;

  return {
    policy,
    hq,
    groupName: group?.name ?? null,
    cityClassName: cityClass?.name ?? null,
    cityClassId: cityClass?.id ?? null,
    context,
    contextLabel: contextLabel(context),
    priorApprovalRequired,
    entitledRailClass: modeRow?.railClass || "",
    airEligible,
    airLabel,
    airMinHours: modeRow?.airMinJourneyHours ?? 0,
    airTrigger: modeRow?.airTrigger ?? "",
    destinationConveyance: modeRow?.destinationConveyance || "",
    lodgingLimit,
    boardingLimit,
    relativesPerNight,
    kmRate,
    kmAmount,
    taxiSummary: taxiSummary(policy, req.taxiKind),
    estimatedTravel,
    estimatedStay,
    estimatedOther,
    estimatedTotal,
    policyEligibleEstimate,
    exceptionEstimate,
    exceptions,
    checks,
    guidance,
    canSubmit: blockReasons.length === 0,
    blockReasons,
    chainRolesNeeded,
  };
}

export function buildRequestSnapshot(
  employee: HrEmployee,
  req: EmployeeTravelRequest,
  evaln: TravelRequestEvaluation,
): TravelRequestSnapshot {
  const ref = evaln.policy ? snapshotPolicyRef(evaln.policy) : { policyId: 0, policyName: "", policyNumber: "", effectiveFrom: "" };
  return {
    capturedAt: new Date().toISOString(),
    policyId: ref.policyId,
    policyName: ref.policyName,
    policyNumber: ref.policyNumber,
    effectiveFrom: ref.effectiveFrom,
    groupId: evaln.policy
      ? getEmployeeEntitlementGroup(evaln.policy, employee)?.id ?? null
      : null,
    groupName: evaln.groupName,
    hqCity: evaln.hq.city,
    hqSource: evaln.hq.source,
    destination: req.destination,
    cityClassId: evaln.cityClassId,
    cityClassName: evaln.cityClassName,
    travelContext: evaln.context,
    priorApprovalRequired: evaln.priorApprovalRequired,
    requestedMode: req.travelMode,
    entitledRailClass: evaln.entitledRailClass,
    requestedRailClass: req.requestedRailClass || evaln.entitledRailClass,
    airEligible: evaln.airEligible,
    airTrigger: evaln.airTrigger,
    airMinHours: evaln.airMinHours,
    destinationConveyance: evaln.destinationConveyance,
    lodgingLimit: evaln.lodgingLimit,
    boardingLimit: evaln.boardingLimit,
    relativesPerNight: evaln.relativesPerNight,
    kmRate: evaln.kmRate,
    kmAmount: evaln.kmAmount,
    taxiSummary: evaln.taxiSummary,
    estimatedTravel: evaln.estimatedTravel,
    estimatedStay: evaln.estimatedStay,
    estimatedOther: evaln.estimatedOther,
    estimatedTotal: evaln.estimatedTotal,
    policyEligibleEstimate: evaln.policyEligibleEstimate,
    exceptionEstimate: evaln.exceptionEstimate,
    exceptions: evaln.exceptions,
    checks: evaln.checks,
    guidance: evaln.guidance,
  };
}

export function vehicleTypesFromPolicy(policy: TravelPolicy | null): string[] {
  if (!policy) return ["Two-Wheeler", "Four-Wheeler"];
  const fromKm = policy.kmRates.filter((r) => r.active).map((r) => r.vehicleType);
  const fromOwn = policy.ownVehicleExHq.map((r) => r.vehicleType);
  return [...new Set([...fromOwn, ...fromKm])];
}

export function railClassOptions(policy: TravelPolicy | null, entitled: string): string[] {
  const base = ["Sleeper", "3rd AC", "2nd AC", "1st AC", "Chair Car"];
  const fromPolicy = (policy?.travelModes ?? []).map((m) => m.railClass).filter(Boolean);
  return [...new Set([entitled, ...fromPolicy, ...base].filter(Boolean))];
}

/** Linked claims must use the request's snapshotted policy, not today's live policy. */
export function policyFromRequestSnapshot(req: EmployeeTravelRequest): TravelPolicy | null {
  if (!req.snapshot?.policyId) return null;
  return getTravelPolicyById(req.snapshot.policyId) ?? null;
}
