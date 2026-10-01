/**
 * Sales Force Travel Policy — frontend/demo persistence.
 * Seed values come from the ParamVerse Bio Sales Force Travel Policy reference.
 * All amounts, rates, cities, slabs and deadlines are stored data — not code constants used as business rules.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { policyToday } from "@/lib/hr/policy-common";
import { loadDesignations, type DesignationRecord } from "@/app/(app)/hr/settings/organization-data";

const STORAGE_KEY = "ds_hr_travel_policies_v1";
export const HR_TRAVEL_POLICY_EVENT = "hr-travel-policies-updated";

export type TravelPolicyStatus = "active" | "inactive";
export type DistanceBasis = "one_way" | "round_trip";
export type AirEligibilityTrigger = "always" | "journey_duration" | "manual_approval" | "not_allowed";
export type TaxiReimburseType = "actual" | "per_km";
export type PrivateTaxiType = "actual_against_bill" | "fixed_limit" | "not_allowed";
export type SharedRoomHandling = "each_employee" | "single_claims_full" | "custom";
export type OverLimitAction = "block" | "allow_with_prior_approval" | "allow_and_flag";
export type OvernightReimburseType = "fixed" | "percent_boarding";
export type FieldAllowanceType = "fixed" | "actual";
export type TimeBandCategory = "peak" | "odd";
export type TimeBandApplicability = "all" | "male" | "female";
export type OddHoursUpgradeRule = "one_level_higher" | "specific_mode" | "custom";
export type ExclusionAction = "block" | "warn";
export type GuidanceKind = "do" | "dont" | "instruction";
export type DeadlineMethod =
  | "within_days_of_completion"
  | "by_day_of_following_month"
  | "whichever_earlier"
  | "absolute_max_days";
export type ClaimAgeAction = "block" | "warn" | "require_exception";
export type KmDeviationAction = "block" | "require_exception" | "allow_with_warning";
export type ApproverRole = "reporting_manager" | "sales_head" | "hr" | "finance" | "bu_head";

export interface EntitlementGroup {
  id: string;
  name: string;
  active: boolean;
}

export interface RoleMapping {
  id: string;
  designationId: number | null;
  designationName: string;
  groupId: string;
  active: boolean;
}

export interface CityRef {
  state: string;
  city: string;
}

export interface CityClass {
  id: string;
  name: string;
  description: string;
  cities: CityRef[];
  isFallback: boolean;
  active: boolean;
}

export interface ExHqConfig {
  distanceThresholdKm: number;
  distanceBasis: DistanceBasis;
  overnightIsExHq: boolean;
  priorApprovalRequired: boolean;
  approver1: ApproverRole;
  approver2: ApproverRole | "";
}

export interface TravelModeRow {
  groupId: string;
  railClass: string;
  airAllowed: boolean;
  airClass: string;
  airTrigger: AirEligibilityTrigger;
  airMinJourneyHours: number;
  airPriorApproval: boolean;
  destinationConveyance: string;
}

export interface TaxiConfig {
  sharedType: TaxiReimburseType;
  sharedRatePerKm: number;
  requireStartDestKm: boolean;
  privateType: PrivateTaxiType;
  privateFixedLimit: number;
  privateBillRequired: boolean;
}

export interface OwnVehicleExHqRow {
  vehicleType: string;
  allowed: boolean;
  useSharedKmRate: boolean;
  ratePerKm: number;
  priorApprovalRequired: boolean;
}

export interface LodgingBoardingCell {
  groupId: string;
  classId: string;
  lodgingLimit: number;
  boardingLimit: number;
}

export interface LodgingRules {
  billRequired: boolean;
  billInCompanyName: boolean;
  gstinRequired: boolean;
  gstReimbursedSeparately: boolean;
  sharedRoomHandling: SharedRoomHandling;
  exceptionsRequirePriorApproval: boolean;
  overLimitAction: OverLimitAction;
}

export interface RelativesStayCell {
  groupId: string;
  classId: string;
  /** null = not allowed / N/A */
  amountPerNight: number | null;
}

export interface OvernightSlab {
  id: string;
  fromHours: number;
  toHours: number;
  reimburseType: OvernightReimburseType;
  amount: number;
}

export interface OvernightExclusions {
  boardingSameTransit: boolean;
  fieldConveyance: boolean;
  incidental: boolean;
}

export interface LocalTravelRow {
  groupId: string;
  mealsMiscPerDay: number;
  mealsBillsRequired: boolean;
  nonPeakMode: string;
  peakOddMode: string;
}

export interface TimeBand {
  id: string;
  category: TimeBandCategory;
  applicability: TimeBandApplicability;
  startTime: string;
  endTime: string;
}

export interface FieldConveyanceCell {
  groupId: string;
  classId: string;
  allowanceType: FieldAllowanceType;
  amount: number;
  billsRequired: boolean;
}

export interface FieldApplicability {
  hqLocalFieldTravel: boolean;
  notPayableDuringExHq: boolean;
}

export interface KmRateRow {
  id: string;
  vehicleType: string;
  ratePerKm: number;
  priorApprovalRequired: boolean;
  monthlyKmApprovalRequired: boolean;
  billsRequired: boolean;
  active: boolean;
}

export interface KmClaimFields {
  travelDate: boolean;
  startPoint: boolean;
  destination: boolean;
  purpose: boolean;
  kmTravelled: boolean;
  startOdometer: boolean;
  endOdometer: boolean;
  routeAttachment: boolean;
}

export interface KmRules {
  monthlyApprovalRequired: boolean;
  deviationAction: KmDeviationAction;
  dueDayOfFollowingMonth: number;
}

export interface IncidentalRow {
  groupId: string;
  amountPerDay: number;
  billsRequired: boolean;
  travelContext: string;
}

export interface ClaimTypeRule {
  id: string;
  claimType: string;
  deadlineMethod: DeadlineMethod;
  withinDays: number;
  followingMonthDay: number;
  absoluteMaxDays: number;
  billRequired: boolean;
  originalBillRequired: boolean;
  companyNameOnBill: boolean;
  gstinRequired: boolean;
  attachmentRequired: boolean;
  priorApprovalRequired: boolean;
  exceptionHandling: OverLimitAction;
}

export interface MaxClaimAge {
  days: number;
  action: ClaimAgeAction;
}

export interface BillingRequirements {
  billInCompanyName: boolean;
  originalBillRequired: boolean;
  gstinRequired: boolean;
  attachmentMandatory: boolean;
  approvalAttachmentRequired: boolean;
}

export interface ExceptionRule {
  id: string;
  name: string;
  allowed: boolean;
  requiresPriorApproval: boolean;
  approvers: ApproverRole[];
}

export interface TravelAdvanceConfig {
  enabled: boolean;
  settlementDays: number;
  blockNewIfUnsettled: boolean;
}

export interface OddHoursSafetyUpgrade {
  enabled: boolean;
  applicability: TimeBandApplicability;
  upgradeRule: OddHoursUpgradeRule;
  specificMode: string;
  customNote: string;
}

export interface PolicyExclusion {
  id: string;
  name: string;
  description: string;
  /** Empty = all claim types */
  claimTypes: string[];
  action: ExclusionAction;
  active: boolean;
}

export interface GuidanceItem {
  id: string;
  kind: GuidanceKind;
  text: string;
  sortOrder: number;
  active: boolean;
}

export interface PolicyDocumentMeta {
  fileName: string;
  sizeLabel: string;
  /** Browser-local preview only — not a server upload */
  dataUrl: string;
}

export interface ApprovalChain {
  id: string;
  name: string;
  steps: ApproverRole[];
}

export interface TravelPolicy {
  id: number;
  name: string;
  policyNumber: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: TravelPolicyStatus;
  isCurrent: boolean;
  appliesTo: string;
  description: string;
  groups: EntitlementGroup[];
  roleMappings: RoleMapping[];
  cityClasses: CityClass[];
  exHq: ExHqConfig;
  travelModes: TravelModeRow[];
  taxi: TaxiConfig;
  ownVehicleExHq: OwnVehicleExHqRow[];
  lodgingBoarding: LodgingBoardingCell[];
  lodgingRules: LodgingRules;
  relativesStay: RelativesStayCell[];
  overnightSlabs: OvernightSlab[];
  overnightExclusions: OvernightExclusions;
  localTravel: LocalTravelRow[];
  timeBands: TimeBand[];
  fieldConveyance: FieldConveyanceCell[];
  fieldApplicability: FieldApplicability;
  kmRates: KmRateRow[];
  kmClaimFields: KmClaimFields;
  kmRules: KmRules;
  incidentals: IncidentalRow[];
  claimRules: ClaimTypeRule[];
  maxClaimAge: MaxClaimAge;
  billing: BillingRequirements;
  exceptions: ExceptionRule[];
  travelAdvance: TravelAdvanceConfig;
  approvalChains: ApprovalChain[];
  oddHoursSafety: OddHoursSafetyUpgrade;
  modeLadder: string[];
  exclusions: PolicyExclusion[];
  guidance: GuidanceItem[];
  approvedBy: string;
  approvalDate: string;
  internalRemark: string;
  document: PolicyDocumentMeta | null;
  claimRefCount: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

function nid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultOddHoursSafety(): OddHoursSafetyUpgrade {
  return {
    enabled: true,
    applicability: "female",
    upgradeRule: "one_level_higher",
    specificMode: "",
    customNote: "",
  };
}

export function defaultModeLadder(): string[] {
  return ["Auto", "Shared Taxi", "Bus", "Sleeper", "3AC", "2AC", "Private Taxi", "Air Economy"];
}

export function defaultExclusions(): PolicyExclusion[] {
  return [
    {
      id: "excl-personal",
      name: "Personal expenses",
      description: "Personal shopping, entertainment, and non-official costs.",
      claimTypes: [],
      action: "block",
      active: true,
    },
    {
      id: "excl-alcohol",
      name: "Alcohol / personal consumption",
      description: "Alcohol and personal consumption items are not reimbursable.",
      claimTypes: [],
      action: "block",
      active: true,
    },
    {
      id: "excl-repair",
      name: "Vehicle repair",
      description: "Repair of personal or company vehicles is not a travel claim.",
      claimTypes: ["KM Reimbursement"],
      action: "block",
      active: true,
    },
    {
      id: "excl-maint",
      name: "Vehicle maintenance",
      description: "Servicing, tyres, and routine maintenance are excluded.",
      claimTypes: ["KM Reimbursement"],
      action: "block",
      active: true,
    },
    {
      id: "excl-ins",
      name: "Vehicle insurance",
      description: "Insurance premiums are not reimbursed as travel expense.",
      claimTypes: ["KM Reimbursement"],
      action: "block",
      active: true,
    },
  ];
}

export function defaultGuidance(): GuidanceItem[] {
  return [
    { id: "gd-1", kind: "do", text: "Plan Ex-HQ travel in advance and obtain prior approval where required.", sortOrder: 1, active: true },
    { id: "gd-2", kind: "do", text: "Submit claims with original bills in the company name within the configured deadline.", sortOrder: 2, active: true },
    { id: "gd-3", kind: "do", text: "Record start point, destination, purpose and KM for own-vehicle claims.", sortOrder: 3, active: true },
    { id: "gd-4", kind: "dont", text: "Do not claim personal expenses, alcohol, or vehicle repair / insurance as travel.", sortOrder: 4, active: true },
    { id: "gd-5", kind: "dont", text: "Do not claim boarding, field conveyance and incidental together for the same overnight transit period if the policy excludes them.", sortOrder: 5, active: true },
    { id: "gd-6", kind: "instruction", text: "City class, entitlement group and HQ are resolved from masters — do not self-select them on the claim.", sortOrder: 6, active: true },
  ];
}

export function blankClaimTypeRule(id: string): ClaimTypeRule {
  return {
    id,
    claimType: "New claim type",
    deadlineMethod: "by_day_of_following_month",
    withinDays: 7,
    followingMonthDay: 3,
    absoluteMaxDays: 30,
    billRequired: false,
    originalBillRequired: false,
    companyNameOnBill: false,
    gstinRequired: false,
    attachmentRequired: false,
    priorApprovalRequired: false,
    exceptionHandling: "allow_with_prior_approval",
  };
}

export function normalizeTravelPolicy(raw: Partial<TravelPolicy> & { id: number }): TravelPolicy {
  const seedSafety = defaultOddHoursSafety();
  const claimRules = (raw.claimRules ?? []).map((r) => ({
    ...r,
    gstinRequired: r.gstinRequired ?? false,
    attachmentRequired: r.attachmentRequired ?? false,
  }));
  const next: TravelPolicy = {
    ...(raw as TravelPolicy),
    oddHoursSafety: { ...seedSafety, ...(raw.oddHoursSafety ?? {}) },
    modeLadder: Array.isArray(raw.modeLadder) && raw.modeLadder.length ? raw.modeLadder : defaultModeLadder(),
    exclusions: Array.isArray(raw.exclusions) ? raw.exclusions : defaultExclusions(),
    guidance: Array.isArray(raw.guidance) ? raw.guidance : defaultGuidance(),
    approvedBy: raw.approvedBy ?? "",
    approvalDate: raw.approvalDate ?? "",
    internalRemark: raw.internalRemark ?? "",
    document: raw.document ?? null,
    claimRules,
  };
  return ensureMatrixCells(next);
}

function today(): string {
  return policyToday();
}

function stampAudit() {
  const t = today();
  return { createdBy: CURRENT_USER, updatedBy: CURRENT_USER, createdAt: t, updatedAt: t };
}

const G = { nsm: "nsm", rsm: "rsm", asm: "asm", tm: "tm" } as const;
const C = { mega: "mega", metro: "metro", others: "others" } as const;

function lb(groupId: string, classId: string, lodging: number, boarding: number): LodgingBoardingCell {
  return { groupId, classId, lodgingLimit: lodging, boardingLimit: boarding };
}
function rs(groupId: string, classId: string, amountPerNight: number | null): RelativesStayCell {
  return { groupId, classId, amountPerNight };
}
function fc(
  groupId: string,
  classId: string,
  allowanceType: FieldAllowanceType,
  amount: number,
  billsRequired: boolean,
): FieldConveyanceCell {
  return { groupId, classId, allowanceType, amount, billsRequired };
}

/** Seed = first version of ParamVerse Bio Sales Force Travel Policy. Editable; not used as runtime constants. */
export function buildSeedTravelPolicy(): TravelPolicy {
  const groups: EntitlementGroup[] = [
    { id: G.nsm, name: "NSM", active: true },
    { id: G.rsm, name: "RSM / State Head", active: true },
    { id: G.asm, name: "ASM", active: true },
    { id: G.tm, name: "TM", active: true },
  ];

  const designations = typeof window === "undefined" ? [] : loadDesignations();
  const findDesig = (pred: (d: DesignationRecord) => boolean) =>
    designations.find((d) => d.status === "active" && pred(d));

  const mapRole = (name: string, groupId: string, match: (d: DesignationRecord) => boolean): RoleMapping => {
    const d = findDesig(match);
    return {
      id: nid("rm"),
      designationId: d?.id ?? null,
      designationName: d?.name ?? name,
      groupId,
      active: true,
    };
  };

  const roleMappings: RoleMapping[] = [
    mapRole("National Sales Manager", G.nsm, (d) => /nsm|national sales/i.test(`${d.code} ${d.name}`)),
    mapRole("Regional Sales Manager / State Head", G.rsm, (d) => /rsm|regional sales|state head/i.test(`${d.code} ${d.name}`)),
    mapRole("Area Sales Manager", G.asm, (d) => /asm|area sales/i.test(`${d.code} ${d.name}`)),
    mapRole("Territory Manager", G.tm, (d) => /(?:^|\b)tm(?:\b|$)|territory manager/i.test(`${d.code} ${d.name}`)),
    mapRole("Agronomist", G.tm, (d) => /agronomist/i.test(`${d.code} ${d.name}`)),
  ];

  const cityClasses: CityClass[] = [
    {
      id: C.mega,
      name: "Mega Metro",
      description: "Largest metros",
      cities: [
        { state: "Maharashtra", city: "Mumbai" },
        { state: "Delhi", city: "New Delhi" },
        { state: "Karnataka", city: "Bengaluru" },
        { state: "Telangana", city: "Hyderabad" },
        { state: "Tamil Nadu", city: "Chennai" },
        { state: "West Bengal", city: "Kolkata" },
      ],
      isFallback: false,
      active: true,
    },
    {
      id: C.metro,
      name: "Metro",
      description: "Other major cities",
      cities: [
        { state: "Maharashtra", city: "Pune" },
        { state: "Gujarat", city: "Ahmedabad" },
        { state: "Gujarat", city: "Surat" },
      ],
      isFallback: false,
      active: true,
    },
    {
      id: C.others,
      name: "Others",
      description: "Default when city is not mapped",
      cities: [],
      isFallback: true,
      active: true,
    },
  ];

  const travelModes: TravelModeRow[] = [
    {
      groupId: G.nsm,
      railClass: "2nd AC",
      airAllowed: true,
      airClass: "Economy",
      airTrigger: "always",
      airMinJourneyHours: 0,
      airPriorApproval: false,
      destinationConveyance: "Taxi / Cab",
    },
    {
      groupId: G.rsm,
      railClass: "2nd AC",
      airAllowed: true,
      airClass: "Economy",
      airTrigger: "journey_duration",
      airMinJourneyHours: 12,
      airPriorApproval: true,
      destinationConveyance: "Taxi / Cab",
    },
    {
      groupId: G.asm,
      railClass: "3rd AC",
      airAllowed: true,
      airClass: "Economy",
      airTrigger: "journey_duration",
      airMinJourneyHours: 12,
      airPriorApproval: true,
      destinationConveyance: "Shared taxi / Auto",
    },
    {
      groupId: G.tm,
      railClass: "Sleeper / 3rd AC",
      airAllowed: false,
      airClass: "Economy",
      airTrigger: "not_allowed",
      airMinJourneyHours: 12,
      airPriorApproval: true,
      destinationConveyance: "Shared / Public taxi",
    },
  ];

  const lodgingBoarding: LodgingBoardingCell[] = [
    lb(G.nsm, C.mega, 4000, 800),
    lb(G.nsm, C.metro, 3500, 700),
    lb(G.nsm, C.others, 3000, 600),
    lb(G.rsm, C.mega, 3000, 600),
    lb(G.rsm, C.metro, 2500, 500),
    lb(G.rsm, C.others, 2000, 400),
    lb(G.asm, C.mega, 2400, 500),
    lb(G.asm, C.metro, 2000, 400),
    lb(G.asm, C.others, 1700, 350),
    lb(G.tm, C.mega, 1800, 400),
    lb(G.tm, C.metro, 1500, 350),
    lb(G.tm, C.others, 1200, 300),
  ];

  const relativesStay: RelativesStayCell[] = [
    rs(G.nsm, C.mega, 1000),
    rs(G.nsm, C.metro, 800),
    rs(G.nsm, C.others, 600),
    rs(G.rsm, C.mega, 800),
    rs(G.rsm, C.metro, 600),
    rs(G.rsm, C.others, 500),
    rs(G.asm, C.mega, 700),
    rs(G.asm, C.metro, 500),
    rs(G.asm, C.others, 400),
    rs(G.tm, C.mega, 600),
    rs(G.tm, C.metro, 400),
    rs(G.tm, C.others, 300),
  ];

  const fieldConveyance: FieldConveyanceCell[] = [
    fc(G.nsm, C.mega, "actual", 0, true),
    fc(G.nsm, C.metro, "actual", 0, true),
    fc(G.nsm, C.others, "actual", 0, true),
    fc(G.rsm, C.mega, "fixed", 400, false),
    fc(G.rsm, C.metro, "fixed", 350, false),
    fc(G.rsm, C.others, "fixed", 300, false),
    fc(G.asm, C.mega, "fixed", 300, false),
    fc(G.asm, C.metro, "fixed", 250, false),
    fc(G.asm, C.others, "fixed", 200, false),
    fc(G.tm, C.mega, "fixed", 200, false),
    fc(G.tm, C.metro, "fixed", 150, false),
    fc(G.tm, C.others, "fixed", 125, false),
  ];

  return {
    id: 1,
    name: "Sales Force Travel Policy",
    policyNumber: "PVB/HR/2026-STP",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    status: "active",
    isCurrent: true,
    appliesTo: "Sales Force",
    description:
      "Travel entitlements, reimbursement limits and claim rules for Sales Force roles. Seeded from the ParamVerse Bio Sales Force Travel Policy; all values are editable.",
    groups,
    roleMappings,
    cityClasses,
    exHq: {
      distanceThresholdKm: 70,
      distanceBasis: "one_way",
      overnightIsExHq: true,
      priorApprovalRequired: true,
      approver1: "reporting_manager",
      approver2: "bu_head",
    },
    travelModes,
    taxi: {
      sharedType: "per_km",
      sharedRatePerKm: 4,
      requireStartDestKm: true,
      privateType: "actual_against_bill",
      privateFixedLimit: 0,
      privateBillRequired: true,
    },
    ownVehicleExHq: [
      { vehicleType: "Two-Wheeler", allowed: true, useSharedKmRate: true, ratePerKm: 0, priorApprovalRequired: false },
      { vehicleType: "Four-Wheeler", allowed: true, useSharedKmRate: true, ratePerKm: 0, priorApprovalRequired: true },
    ],
    lodgingBoarding,
    lodgingRules: {
      billRequired: true,
      billInCompanyName: true,
      gstinRequired: true,
      gstReimbursedSeparately: true,
      sharedRoomHandling: "each_employee",
      exceptionsRequirePriorApproval: true,
      overLimitAction: "allow_with_prior_approval",
    },
    relativesStay,
    overnightSlabs: [
      { id: "os-1", fromHours: 3, toHours: 6, reimburseType: "fixed", amount: 200 },
      { id: "os-2", fromHours: 6, toHours: 12, reimburseType: "fixed", amount: 400 },
      { id: "os-3", fromHours: 12, toHours: 18, reimburseType: "fixed", amount: 600 },
      { id: "os-4", fromHours: 18, toHours: 24, reimburseType: "percent_boarding", amount: 100 },
    ],
    overnightExclusions: {
      boardingSameTransit: false,
      fieldConveyance: false,
      incidental: false,
    },
    localTravel: [
      { groupId: G.nsm, mealsMiscPerDay: 400, mealsBillsRequired: false, nonPeakMode: "Cab / Taxi", peakOddMode: "Cab (AC)" },
      { groupId: G.rsm, mealsMiscPerDay: 350, mealsBillsRequired: false, nonPeakMode: "Cab / Taxi", peakOddMode: "Cab (AC)" },
      { groupId: G.asm, mealsMiscPerDay: 300, mealsBillsRequired: false, nonPeakMode: "Auto / Shared taxi", peakOddMode: "Taxi" },
      { groupId: G.tm, mealsMiscPerDay: 250, mealsBillsRequired: false, nonPeakMode: "Auto / Bus / Metro", peakOddMode: "Taxi" },
    ],
    timeBands: [
      { id: "tb-1", category: "peak", applicability: "all", startTime: "08:00", endTime: "11:00" },
      { id: "tb-2", category: "peak", applicability: "all", startTime: "17:00", endTime: "21:00" },
      { id: "tb-3", category: "odd", applicability: "female", startTime: "20:00", endTime: "07:00" },
      { id: "tb-4", category: "odd", applicability: "male", startTime: "22:00", endTime: "06:00" },
    ],
    fieldConveyance,
    fieldApplicability: { hqLocalFieldTravel: true, notPayableDuringExHq: true },
    kmRates: [
      {
        id: "km-2w",
        vehicleType: "Two-Wheeler",
        ratePerKm: 3.5,
        priorApprovalRequired: false,
        monthlyKmApprovalRequired: true,
        billsRequired: false,
        active: true,
      },
      {
        id: "km-4w",
        vehicleType: "Four-Wheeler",
        ratePerKm: 8.5,
        priorApprovalRequired: true,
        monthlyKmApprovalRequired: true,
        billsRequired: false,
        active: true,
      },
    ],
    kmClaimFields: {
      travelDate: true,
      startPoint: true,
      destination: true,
      purpose: true,
      kmTravelled: true,
      startOdometer: false,
      endOdometer: false,
      routeAttachment: false,
    },
    kmRules: {
      monthlyApprovalRequired: true,
      deviationAction: "require_exception",
      dueDayOfFollowingMonth: 3,
    },
    incidentals: [
      { groupId: G.nsm, amountPerDay: 250, billsRequired: false, travelContext: "Ex-HQ" },
      { groupId: G.rsm, amountPerDay: 200, billsRequired: false, travelContext: "Ex-HQ" },
      { groupId: G.asm, amountPerDay: 150, billsRequired: false, travelContext: "Ex-HQ" },
      { groupId: G.tm, amountPerDay: 100, billsRequired: false, travelContext: "Ex-HQ" },
    ],
    claimRules: [
      {
        id: "cr-exhq",
        claimType: "Ex-HQ Tour",
        deadlineMethod: "whichever_earlier",
        withinDays: 7,
        followingMonthDay: 3,
        absoluteMaxDays: 30,
        billRequired: true,
        originalBillRequired: true,
        companyNameOnBill: true,
        gstinRequired: true,
        attachmentRequired: true,
        priorApprovalRequired: true,
        exceptionHandling: "allow_with_prior_approval",
      },
      {
        id: "cr-km",
        claimType: "KM Reimbursement",
        deadlineMethod: "by_day_of_following_month",
        withinDays: 7,
        followingMonthDay: 3,
        absoluteMaxDays: 30,
        billRequired: false,
        originalBillRequired: false,
        companyNameOnBill: false,
        gstinRequired: false,
        attachmentRequired: false,
        priorApprovalRequired: false,
        exceptionHandling: "allow_with_prior_approval",
      },
      {
        id: "cr-local",
        claimType: "Local / City Travel",
        deadlineMethod: "by_day_of_following_month",
        withinDays: 7,
        followingMonthDay: 3,
        absoluteMaxDays: 30,
        billRequired: false,
        originalBillRequired: false,
        companyNameOnBill: false,
        gstinRequired: false,
        attachmentRequired: false,
        priorApprovalRequired: false,
        exceptionHandling: "allow_and_flag",
      },
    ],
    maxClaimAge: { days: 30, action: "block" },
    billing: {
      billInCompanyName: true,
      originalBillRequired: true,
      gstinRequired: true,
      attachmentMandatory: true,
      approvalAttachmentRequired: false,
    },
    exceptions: [
      { id: "ex-lodging", name: "Lodging above limit", allowed: true, requiresPriorApproval: true, approvers: ["reporting_manager", "sales_head"] },
      { id: "ex-class", name: "Travel class upgrade", allowed: true, requiresPriorApproval: true, approvers: ["reporting_manager", "sales_head"] },
      { id: "ex-mode", name: "Different travel mode", allowed: true, requiresPriorApproval: true, approvers: ["reporting_manager"] },
      { id: "ex-km", name: "KM deviation", allowed: true, requiresPriorApproval: true, approvers: ["reporting_manager"] },
      { id: "ex-late", name: "Late claim", allowed: false, requiresPriorApproval: true, approvers: ["hr", "finance"] },
    ],
    travelAdvance: { enabled: true, settlementDays: 15, blockNewIfUnsettled: true },
    approvalChains: [
      { id: "ap-normal", name: "Normal Claim", steps: ["reporting_manager", "finance"] },
      { id: "ap-exception", name: "Exception", steps: ["reporting_manager", "sales_head", "finance"] },
    ],
    oddHoursSafety: defaultOddHoursSafety(),
    modeLadder: defaultModeLadder(),
    exclusions: defaultExclusions(),
    guidance: defaultGuidance(),
    approvedBy: "",
    approvalDate: "",
    internalRemark: "",
    document: null,
    claimRefCount: 0,
    ...stampAudit(),
  };
}

function emptyPolicySkeleton(id: number, name: string): TravelPolicy {
  const base = buildSeedTravelPolicy();
  return {
    ...base,
    id,
    name,
    policyNumber: "",
    effectiveFrom: today(),
    effectiveTo: "",
    status: "active",
    isCurrent: false,
    appliesTo: "Sales Force",
    description: "",
    claimRefCount: 0,
    ...stampAudit(),
  };
}

function loadRaw(): TravelPolicy[] {
  if (typeof window === "undefined") return [normalizeTravelPolicy(buildSeedTravelPolicy())];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = [buildSeedTravelPolicy()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as TravelPolicy[];
    const source = Array.isArray(parsed) && parsed.length ? parsed : [buildSeedTravelPolicy()];
    const list = source.map((p) => normalizeTravelPolicy(p));
    const needsPersist =
      !Array.isArray(parsed) ||
      parsed.some(
        (p) =>
          !p.oddHoursSafety ||
          !Array.isArray(p.exclusions) ||
          !Array.isArray(p.guidance) ||
          p.approvedBy === undefined ||
          p.claimRules?.some((r) => r.gstinRequired === undefined),
      );
    if (needsPersist) saveRaw(list);
    return list;
  } catch {
    return [buildSeedTravelPolicy()];
  }
}

function saveRaw(list: TravelPolicy[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(HR_TRAVEL_POLICY_EVENT));
}

export function loadTravelPolicies(): TravelPolicy[] {
  return loadRaw().sort((a, b) => (b.effectiveFrom || "").localeCompare(a.effectiveFrom || ""));
}

export function getTravelPolicyById(id: number): TravelPolicy | undefined {
  return loadRaw().find((p) => p.id === id);
}

export function nextTravelPolicyId(): number {
  const list = loadRaw();
  return list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1;
}

export function saveTravelPolicy(policy: TravelPolicy): TravelPolicy {
  const next: TravelPolicy = { ...normalizeTravelPolicy(policy), updatedBy: CURRENT_USER, updatedAt: today() };
  const list = loadRaw();
  let working = [...list];
  if (next.isCurrent) {
    working = working.map((p) =>
      p.id === next.id ? next : overlappingCurrent(p, next) ? { ...p, isCurrent: false, updatedAt: today() } : p,
    );
    if (!working.some((p) => p.id === next.id)) working = [next, ...working];
    else working = working.map((p) => (p.id === next.id ? next : p));
  } else {
    const idx = working.findIndex((p) => p.id === next.id);
    if (idx >= 0) working[idx] = next;
    else working = [next, ...working];
  }
  saveRaw(working);
  return next;
}

function overlappingCurrent(existing: TravelPolicy, incoming: TravelPolicy): boolean {
  if (!existing.isCurrent || existing.id === incoming.id) return false;
  if ((existing.appliesTo || "").trim().toLowerCase() !== (incoming.appliesTo || "").trim().toLowerCase()) {
    return false;
  }
  const aFrom = existing.effectiveFrom || "0000-01-01";
  const aTo = existing.effectiveTo || "9999-12-31";
  const bFrom = incoming.effectiveFrom || "0000-01-01";
  const bTo = incoming.effectiveTo || "9999-12-31";
  return aFrom <= bTo && bFrom <= aTo;
}

export function createTravelPolicy(input: {
  name: string;
  policyNumber: string;
  effectiveFrom: string;
  effectiveTo: string;
  appliesTo: string;
  description: string;
  status: TravelPolicyStatus;
  isCurrent: boolean;
}): { ok: true; policy: TravelPolicy } | { ok: false; error: string } {
  if (!input.name.trim()) return { ok: false, error: "Policy Name is required." };
  if (!input.effectiveFrom) return { ok: false, error: "Effective From is required." };
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
    return { ok: false, error: "Effective To cannot be before Effective From." };
  }
  const id = nextTravelPolicyId();
  const skeleton = emptyPolicySkeleton(id, input.name.trim());
  const policy: TravelPolicy = {
    ...skeleton,
    policyNumber: input.policyNumber.trim(),
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    appliesTo: input.appliesTo.trim() || "Sales Force",
    description: input.description.trim(),
    status: input.status,
    isCurrent: input.isCurrent,
  };
  const saved = saveTravelPolicy(policy);
  return { ok: true, policy: saved };
}

export function duplicateTravelPolicy(id: number): { ok: true; policy: TravelPolicy } | { ok: false; error: string } {
  const src = getTravelPolicyById(id);
  if (!src) return { ok: false, error: "Policy not found." };
  const copy: TravelPolicy = {
    ...structuredClone(src),
    id: nextTravelPolicyId(),
    name: `${src.name} (Copy)`,
    policyNumber: src.policyNumber ? `${src.policyNumber}-COPY` : "",
    effectiveFrom: today(),
    effectiveTo: "",
    isCurrent: false,
    status: "inactive",
    claimRefCount: 0,
    ...stampAudit(),
  };
  saveTravelPolicy(copy);
  return { ok: true, policy: copy };
}

export function deleteTravelPolicy(id: number): { ok: true } | { ok: false; error: string; inUse?: boolean } {
  const rec = getTravelPolicyById(id);
  if (!rec) return { ok: false, error: "Policy not found." };
  if (rec.claimRefCount > 0) {
    return { ok: false, error: "This policy is linked to claims. Inactivate or end-date it instead.", inUse: true };
  }
  saveRaw(loadRaw().filter((p) => p.id !== id));
  return { ok: true };
}

export function validateTravelPolicy(p: TravelPolicy): string[] {
  const errors: string[] = [];
  if (!p.name.trim()) errors.push("Policy Name is required.");
  if (!p.effectiveFrom) errors.push("Effective From is required.");
  if (p.effectiveTo && p.effectiveFrom && p.effectiveTo < p.effectiveFrom) {
    errors.push("Effective To cannot be before Effective From.");
  }
  const groupIds = new Set(p.groups.map((g) => g.id));
  const mappedRoles = new Set<string>();
  for (const m of p.roleMappings) {
    const key = (m.designationId != null ? `id:${m.designationId}` : m.designationName.trim().toLowerCase());
    if (mappedRoles.has(key) && key) errors.push(`Duplicate role mapping: ${m.designationName}`);
    mappedRoles.add(key);
    if (!groupIds.has(m.groupId)) errors.push(`Role ${m.designationName} maps to an unknown entitlement group.`);
  }
  const classNames = new Set<string>();
  let fallbacks = 0;
  for (const c of p.cityClasses) {
    const n = c.name.trim().toLowerCase();
    if (classNames.has(n)) errors.push(`Duplicate city classification: ${c.name}`);
    classNames.add(n);
    if (c.isFallback) fallbacks += 1;
  }
  if (fallbacks !== 1) errors.push("Exactly one city classification must be the fallback/default.");
  if (p.exHq.distanceThresholdKm < 0) errors.push("Ex-HQ distance threshold cannot be negative.");
  for (const r of p.kmRates) {
    if (r.ratePerKm < 0) errors.push(`KM rate for ${r.vehicleType} cannot be negative.`);
  }
  if (p.taxi.sharedRatePerKm < 0) errors.push("Shared taxi KM rate cannot be negative.");
  for (const cell of p.lodgingBoarding) {
    if (cell.lodgingLimit < 0 || cell.boardingLimit < 0) errors.push("Lodging/boarding amounts cannot be negative.");
  }
  const slabs = [...p.overnightSlabs].sort((a, b) => a.fromHours - b.fromHours);
  for (const s of slabs) {
    if (s.fromHours >= s.toHours) errors.push(`Overnight slab ${s.fromHours}–${s.toHours} hours is invalid.`);
    if (s.amount < 0) errors.push("Overnight slab amount cannot be negative.");
  }
  for (let i = 1; i < slabs.length; i++) {
    if (slabs[i]!.fromHours < slabs[i - 1]!.toHours) {
      errors.push("Overnight journey slabs overlap.");
      break;
    }
  }
  for (const b of p.timeBands) {
    if (!/^\d{2}:\d{2}$/.test(b.startTime) || !/^\d{2}:\d{2}$/.test(b.endTime)) {
      errors.push(`Time band ${b.category} has an invalid time.`);
    }
  }
  if (p.maxClaimAge.days < 0) errors.push("Claim maximum age cannot be negative.");
  if (p.kmRules.dueDayOfFollowingMonth < 1 || p.kmRules.dueDayOfFollowingMonth > 28) {
    errors.push("KM due day of following month must be between 1 and 28.");
  }
  for (const cr of p.claimRules) {
    if (cr.withinDays < 0 || cr.absoluteMaxDays < 0) errors.push(`Claim rule ${cr.claimType}: deadlines cannot be negative.`);
  }
  if (p.travelAdvance.settlementDays < 0) errors.push("Travel advance settlement days cannot be negative.");
  return errors;
}

export const APPROVER_OPTIONS: { value: ApproverRole; label: string }[] = [
  { value: "reporting_manager", label: "Reporting Manager" },
  { value: "bu_head", label: "BU Head" },
  { value: "sales_head", label: "Sales Head" },
  { value: "hr", label: "HR" },
  { value: "finance", label: "Finance" },
];

export function approverLabel(v: ApproverRole | ""): string {
  if (!v) return "—";
  return APPROVER_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function airTriggerLabel(v: AirEligibilityTrigger): string {
  switch (v) {
    case "always":
      return "Always Allowed";
    case "journey_duration":
      return "Allowed if Road/Rail Journey > X Hours";
    case "manual_approval":
      return "Requires Prior Approval";
    case "not_allowed":
      return "Not Allowed";
    default:
      return v;
  }
}

export function formatInr(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export function newGroupId(): string {
  return nid("g");
}
export function newMappingId(): string {
  return nid("rm");
}
export function newClassId(): string {
  return nid("cc");
}
export function newSlabId(): string {
  return nid("os");
}
export function newBandId(): string {
  return nid("tb");
}
export function newKmId(): string {
  return nid("km");
}
export function newClaimRuleId(): string {
  return nid("cr");
}
export function newExceptionId(): string {
  return nid("ex");
}
export function newExclusionId(): string {
  return nid("excl");
}
export function newGuidanceId(): string {
  return nid("gd");
}

export function blankTravelMode(groupId: string): TravelModeRow {
  return {
    groupId,
    railClass: "",
    airAllowed: false,
    airClass: "Economy",
    airTrigger: "not_allowed",
    airMinJourneyHours: 12,
    airPriorApproval: true,
    destinationConveyance: "",
  };
}

export function ensureMatrixCells(p: TravelPolicy): TravelPolicy {
  const lodgingBoarding = [...p.lodgingBoarding];
  const relativesStay = [...p.relativesStay];
  const fieldConveyance = [...p.fieldConveyance];
  const travelModes = [...p.travelModes];
  const localTravel = [...p.localTravel];
  const incidentals = [...p.incidentals];
  for (const g of p.groups) {
    if (!travelModes.some((r) => r.groupId === g.id)) travelModes.push(blankTravelMode(g.id));
    if (!localTravel.some((r) => r.groupId === g.id)) {
      localTravel.push({
        groupId: g.id,
        mealsMiscPerDay: 0,
        mealsBillsRequired: false,
        nonPeakMode: "",
        peakOddMode: "",
      });
    }
    if (!incidentals.some((r) => r.groupId === g.id)) {
      incidentals.push({ groupId: g.id, amountPerDay: 0, billsRequired: false, travelContext: "Ex-HQ" });
    }
    for (const c of p.cityClasses) {
      if (!lodgingBoarding.some((x) => x.groupId === g.id && x.classId === c.id)) {
        lodgingBoarding.push(lb(g.id, c.id, 0, 0));
      }
      if (!relativesStay.some((x) => x.groupId === g.id && x.classId === c.id)) {
        relativesStay.push(rs(g.id, c.id, 0));
      }
      if (!fieldConveyance.some((x) => x.groupId === g.id && x.classId === c.id)) {
        fieldConveyance.push(fc(g.id, c.id, "fixed", 0, false));
      }
    }
  }
  return { ...p, lodgingBoarding, relativesStay, fieldConveyance, travelModes, localTravel, incidentals };
}
