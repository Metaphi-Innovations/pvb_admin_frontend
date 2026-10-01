import {
  loadPolicyList,
  policyToday,
  savePolicyList,
  stampNew,
  stampUpdate,
  type PolicyBase,
} from "@/lib/hr/policy-common";
import { loadRoles, SEED_ROLES, type Role } from "@/app/(app)/user-management/roles/roles-data";

// ─── Constants ───────────────────────────────────────────────────────────────

export const SF_ROLE_NAMES = ["RSM", "ZSM", "ASM", "TM", "FMO", "KAM", "DO", "Intern"] as const;
export const CITY_CATEGORIES = ["Mega Metro", "Metro", "Other"] as const;
export type CityCategory = (typeof CITY_CATEGORIES)[number];

export const LIMIT_TYPES = ["Per Day", "Per Claim", "Per KM", "Actual", "Fixed"] as const;
export type LimitType = (typeof LIMIT_TYPES)[number];

export const TRAVEL_TYPES = ["Local Travel", "Outstation Travel"] as const;
export type TravelType = (typeof TRAVEL_TYPES)[number];

export const TRAVEL_MODES = ["Air", "Rail", "Bus"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const TRAVEL_CLASSES: Record<TravelMode, string[]> = {
  Air: ["Economy", "Premium Economy", "Business"],
  Rail: ["Sleeper", "3rd AC", "2nd AC", "1st AC", "Chair Car", "Executive Chair Car"],
  Bus: ["Non-AC Seater", "AC Seater", "Non-AC Sleeper", "AC Sleeper", "Volvo / Luxury"],
};

export const ELIGIBILITY_STATUS = ["Allowed", "Approval Required", "Not Allowed"] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUS)[number];

export const LOCAL_TRAVEL_MODES = ["Auto", "Taxi", "Cab", "Local Train", "Metro", "Bus"] as const;
export const VEHICLE_TYPES = ["Two Wheeler", "Four Wheeler"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const STAY_TYPES = ["Hotel", "Friends / Family / Relative", "Company Guest House"] as const;
export type StayType = (typeof STAY_TYPES)[number];

export const APPROVAL_LEVELS = ["Reporting Manager", "Higher Sales Role", "HR", "Accounts"] as const;

const POLICY_VERSION = "tada_v8";
const VERSION_KEY = "ds_hr_sf_tada_policy_version";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RolePolicyMapping extends PolicyBase {
  roleId: number;
  isSalesForceRole: boolean;
  tadaApplicable: boolean;
  attendanceLinkApplicable: boolean;
  reportingRoleId: number | null;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
}

export interface MappedCityRef {
  state: string;
  city: string;
}

export interface CityCategoryMaster extends PolicyBase {
  categoryName: CityCategory;
  mappedCities: MappedCityRef[];
  remarks: string;
}

export interface ClaimCategoryMaster extends PolicyBase {
  claimCategoryName: string;
  description: string;
  billRequired: boolean;
  limitType: LimitType;
  remarks: string;
}

export interface EntitlementMatrix extends PolicyBase {
  roleId: number;
  cityCategory: CityCategory;
  claimCategoryId: number;
  limitAmount: number;
  limitType: LimitType;
  billRequired: boolean;
  autoApprovalAllowed: boolean;
}

export interface TravelModeRule extends PolicyBase {
  roleId: number;
  travelMode: TravelMode;
  allowedClasses: string[];
  approvalRequiredClasses: string[];
  notAllowedClasses: string[];
  billRequired: boolean;
  autoApprovalAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
}

export interface LodgingRule extends PolicyBase {
  roleId: number;
  cityCategory: CityCategory;
  lodgingLimitPerDay: number;
  billRequired: boolean;
  autoApprovalAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
}

export interface FlatStayRule extends PolicyBase {
  roleId: number;
  cityCategory: CityCategory;
  allowancePerDay: number;
  declarationRequired: boolean;
  billRequired: boolean;
  autoApprovalAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
}

export interface MealsAllowanceRule extends PolicyBase {
  roleId: number;
  cityCategory: CityCategory;
  mealsAllowancePerDay: number;
  billRequired: boolean;
  autoApprovalAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
}

export interface LocalConveyanceRule extends PolicyBase {
  roleId: number;
  cityCategory: CityCategory;
  allowedModes: string[];
  conveyanceLimitPerDay: number;
  billRequired: boolean;
  autoApprovalAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
}

export interface PersonalVehicleKmRule extends PolicyBase {
  roleId: number;
  vehicleType: VehicleType;
  ratePerKm: number;
  maxKmPerDay: number;
  approvalRequiredAboveKm: number;
  autoApprovalAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
}

export interface IncidentalAllowanceRule extends PolicyBase {
  roleId: number;
  cityCategory: CityCategory | "All";
  allowancePerDay: number;
  billRequired: boolean;
  autoApprovalAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
}

export interface AutoValidationSettings {
  autoApprovalEnabled: boolean;
  requireBill: boolean;
  requireDeclaration: boolean;
  blockOnLeave: boolean;
  blockOnDuplicate: boolean;
  remarks: string;
}

export interface ApprovalThresholdRule extends PolicyBase {
  roleId: number | null;
  claimCategoryId: number | null;
  amountFrom: number;
  amountTo: number;
  approvalLevel1: string;
  approvalLevel2: string;
  approvalLevel3: string;
  approvalLevel4: string;
  remarks: string;
}

export interface PolicyAuditEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  details: string;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const KEYS = {
  roleMapping: "ds_sf_tada_role_mapping_v8",
  cities: "ds_sf_tada_city_categories_v8",
  claimCategories: "ds_sf_tada_claim_categories_v8",
  entitlements: "ds_sf_tada_entitlements_v8",
  travelMode: "ds_sf_tada_travel_mode_v8",
  lodging: "ds_sf_tada_lodging_v8",
  flatStay: "ds_sf_tada_flat_stay_v8",
  meals: "ds_sf_tada_meals_v8",
  localConveyance: "ds_sf_tada_local_conveyance_v8",
  personalKm: "ds_sf_tada_personal_km_v8",
  incidental: "ds_sf_tada_incidental_v8",
  autoValidation: "ds_sf_tada_auto_validation_v8",
  approvalThreshold: "ds_sf_tada_approval_threshold_v8",
  audit: "ds_sf_tada_audit_v8",
} as const;

export { stampNew, stampUpdate };

function ensureVersion(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(VERSION_KEY) !== POLICY_VERSION) {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(VERSION_KEY, POLICY_VERSION);
  }
}

function umRoles(): Role[] {
  return typeof window !== "undefined" ? loadRoles() : SEED_ROLES;
}

export function getUmRoleIdByName(name: string): number | null {
  return umRoles().find((r) => r.roleName.toLowerCase() === name.toLowerCase())?.id ?? null;
}

export function getRoleDisplayName(roleId: number): string {
  return umRoles().find((r) => r.id === roleId)?.roleName ?? `Role #${roleId}`;
}

export function getActiveUmRoles(): Role[] {
  return umRoles().filter((r) => r.status === "active");
}

export function getMappableUmRoles(excludeIds: number[] = []): Role[] {
  return getActiveUmRoles().filter((r) => !excludeIds.includes(r.id));
}

/** Sales Force roles from User Management Role Master (not a separate role master). */
export function getSalesForceUmRoles(): Role[] {
  const active = getActiveUmRoles();
  return SF_ROLE_NAMES.map((name) =>
    active.find((r) => r.roleName.toLowerCase() === name.toLowerCase()),
  ).filter((r): r is Role => !!r);
}

export function getUnmappedSalesForceUmRoles(mappedRoleIds: number[]): Role[] {
  return getSalesForceUmRoles().filter((r) => !mappedRoleIds.includes(r.id));
}

export function resolveRoleIdFromDesignation(designation: string): number | null {
  if (!designation.trim()) return null;
  const des = designation.toLowerCase().trim();

  // Prefer parenthetical SF abbreviations: "Area Sales Manager (ASM)" → ASM
  const paren = designation.match(/\(([^)]+)\)/);
  if (paren) {
    const abbr = paren[1].trim();
    const byAbbr = getUmRoleIdByName(abbr);
    if (byAbbr) return byAbbr;
  }

  // Prefer known Sales Force role codes/names before generic partial matches
  const sfNames = [...SF_ROLE_NAMES].sort((a, b) => b.length - a.length);
  for (const name of sfNames) {
    const key = name.toLowerCase();
    if (des.includes(key)) {
      const id = getUmRoleIdByName(name);
      if (id) return id;
    }
  }

  // Longest role name first to avoid "Sales Manager" winning over "Area Sales Manager (ASM)"
  const roles = [...umRoles()].sort((a, b) => b.roleName.length - a.roleName.length);
  return (
    roles.find(
      (r) => des.includes(r.roleName.toLowerCase()) || r.roleName.toLowerCase().includes(des),
    )?.id ?? null
  );
}

function rid(name: string): number {
  return getUmRoleIdByName(name) ?? 0;
}

// ─── Seeds ───────────────────────────────────────────────────────────────────

function buildRoleMappingSeed(): RolePolicyMapping[] {
  const hierarchy: Record<string, string | null> = {
    RSM: "ZSM",
    ZSM: null,
    ASM: "RSM",
    TM: "ASM",
    FMO: "ASM",
    KAM: "RSM",
    DO: "ASM",
    Intern: "TM",
  };
  let id = 1;
  return SF_ROLE_NAMES.map((name) => {
    const roleId = rid(name);
    const rep = hierarchy[name];
    return stampNew<RolePolicyMapping>(
      {
        roleId,
        isSalesForceRole: true,
        tadaApplicable: true,
        attendanceLinkApplicable: true,
        reportingRoleId: rep ? rid(rep) : null,
        effectiveFrom: "2026-01-01",
        effectiveTo: "",
        remarks: "",
      },
      id++,
    );
  }).filter((r) => r.roleId > 0);
}

function buildCityCategorySeed(): CityCategoryMaster[] {
  const rows: Omit<CityCategoryMaster, keyof PolicyBase | "id">[] = [
    {
      categoryName: "Mega Metro",
      mappedCities: [
        { state: "Maharashtra", city: "Mumbai" },
        { state: "Delhi", city: "New Delhi" },
      ],
      remarks: "Tier-1 mega metros",
    },
    {
      categoryName: "Metro",
      mappedCities: [
        { state: "Maharashtra", city: "Pune" },
        { state: "Gujarat", city: "Ahmedabad" },
        { state: "Karnataka", city: "Bengaluru" },
        { state: "Tamil Nadu", city: "Chennai" },
        { state: "Telangana", city: "Hyderabad" },
        { state: "West Bengal", city: "Kolkata" },
      ],
      remarks: "Major metro cities",
    },
    {
      categoryName: "Other",
      mappedCities: [
        { state: "Maharashtra", city: "Nagpur" },
        { state: "Madhya Pradesh", city: "Indore" },
      ],
      remarks: "Explicitly mapped other cities; unmapped cities also default to Other in claims",
    },
  ];
  return rows.map((r, i) => stampNew(r, i + 1));
}

function mappedCityKey(m: MappedCityRef): string {
  return `${m.state.trim().toLowerCase()}|${m.city.trim().toLowerCase()}`;
}

function normalizeCityCategory(r: CityCategoryMaster): CityCategoryMaster {
  const legacy = r as CityCategoryMaster & {
    mappedCityIds?: number[];
    mappedCities?: (MappedCityRef | string)[];
    cityName?: string;
    category?: CityCategory;
  };
  if (Array.isArray(r.mappedCities) && r.mappedCities.every((m) => typeof m === "object" && m.state && m.city)) {
    return { ...r, mappedCities: r.mappedCities, remarks: r.remarks ?? "" };
  }
  const refs: MappedCityRef[] = [];
  if (Array.isArray(legacy.mappedCities)) {
    for (const item of legacy.mappedCities) {
      if (typeof item === "string") refs.push({ state: "", city: item });
      else if (item?.city) refs.push({ state: item.state ?? "", city: item.city });
    }
  } else if (legacy.cityName) {
    refs.push({ state: "", city: legacy.cityName });
  }
  return {
    ...r,
    categoryName: r.categoryName ?? legacy.category ?? "Other",
    mappedCities: refs,
    remarks: r.remarks ?? "",
  };
}

const CLAIM_CATEGORY_SEED: ClaimCategoryMaster[] = ([
  {
    claimCategoryName: "Travel Fare",
    description: "Air, Rail, Bus ticket fare",
    billRequired: true,
    limitType: "Actual",
    remarks: "Mode-wise class eligibility as per Travel Mode Rule",
  },
  {
    claimCategoryName: "Lodging",
    description: "Hotel stay with bill",
    billRequired: true,
    limitType: "Per Day",
    remarks: "Per city category lodging cap",
  },
  {
    claimCategoryName: "Boarding / Meals",
    description: "Daily boarding and meals",
    billRequired: false,
    limitType: "Per Day",
    remarks: "Meals allowance by role and city category",
  },
  {
    claimCategoryName: "Flat Stay Allowance",
    description: "Stay with friends/family with declaration",
    billRequired: false,
    limitType: "Per Day",
    remarks: "Declaration required when claimed",
  },
  {
    claimCategoryName: "Local Conveyance",
    description: "Within-city movement allowance",
    billRequired: false,
    limitType: "Per Day",
    remarks: "Allowed local modes and daily conveyance cap",
  },
  {
    claimCategoryName: "Personal Vehicle KM",
    description: "Two/Four wheeler KM reimbursement",
    billRequired: false,
    limitType: "Per KM",
    remarks: "Rate-based reimbursement with threshold checks",
  },
  {
    claimCategoryName: "Incidental Allowance",
    description: "Daily incidental expenses",
    billRequired: false,
    limitType: "Per Day",
    remarks: "Flat daily incidental amount",
  },
] as (Omit<ClaimCategoryMaster, keyof PolicyBase> & Partial<PolicyBase>)[]).map((c, i) => stampNew<ClaimCategoryMaster>(c, i + 1));

const CC = {
  travelFare: 1,
  lodging: 2,
  boarding: 3,
  flatStay: 4,
  localConveyance: 5,
  personalKm: 6,
  incidental: 7,
};

function buildEntitlementSeed(): EntitlementMatrix[] {
  const rows: Omit<EntitlementMatrix, keyof PolicyBase | "id">[] = [
    { roleId: rid("RSM"), cityCategory: "Mega Metro", claimCategoryId: CC.lodging, limitAmount: 3000, limitType: "Per Day", billRequired: true, autoApprovalAllowed: true },
    { roleId: rid("RSM"), cityCategory: "Metro", claimCategoryId: CC.lodging, limitAmount: 2500, limitType: "Per Day", billRequired: true, autoApprovalAllowed: true },
    { roleId: rid("RSM"), cityCategory: "Other", claimCategoryId: CC.lodging, limitAmount: 2200, limitType: "Per Day", billRequired: true, autoApprovalAllowed: true },
    { roleId: rid("RSM"), cityCategory: "Mega Metro", claimCategoryId: CC.boarding, limitAmount: 500, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
    { roleId: rid("RSM"), cityCategory: "Metro", claimCategoryId: CC.boarding, limitAmount: 450, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
    { roleId: rid("RSM"), cityCategory: "Other", claimCategoryId: CC.boarding, limitAmount: 350, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
    { roleId: rid("ASM"), cityCategory: "Mega Metro", claimCategoryId: CC.lodging, limitAmount: 2400, limitType: "Per Day", billRequired: true, autoApprovalAllowed: true },
    { roleId: rid("ASM"), cityCategory: "Metro", claimCategoryId: CC.lodging, limitAmount: 2000, limitType: "Per Day", billRequired: true, autoApprovalAllowed: true },
    { roleId: rid("ASM"), cityCategory: "Other", claimCategoryId: CC.lodging, limitAmount: 1700, limitType: "Per Day", billRequired: true, autoApprovalAllowed: false },
    { roleId: rid("ASM"), cityCategory: "Mega Metro", claimCategoryId: CC.boarding, limitAmount: 450, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
    { roleId: rid("ASM"), cityCategory: "Metro", claimCategoryId: CC.boarding, limitAmount: 400, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
    { roleId: rid("ASM"), cityCategory: "Other", claimCategoryId: CC.boarding, limitAmount: 300, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
    { roleId: rid("TM"), cityCategory: "Mega Metro", claimCategoryId: CC.lodging, limitAmount: 1800, limitType: "Per Day", billRequired: true, autoApprovalAllowed: false },
    { roleId: rid("TM"), cityCategory: "Metro", claimCategoryId: CC.lodging, limitAmount: 1600, limitType: "Per Day", billRequired: true, autoApprovalAllowed: false },
    { roleId: rid("TM"), cityCategory: "Other", claimCategoryId: CC.lodging, limitAmount: 1500, limitType: "Per Day", billRequired: true, autoApprovalAllowed: false },
    { roleId: rid("TM"), cityCategory: "Mega Metro", claimCategoryId: CC.boarding, limitAmount: 300, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
    { roleId: rid("TM"), cityCategory: "Metro", claimCategoryId: CC.boarding, limitAmount: 275, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
    { roleId: rid("TM"), cityCategory: "Other", claimCategoryId: CC.boarding, limitAmount: 250, limitType: "Per Day", billRequired: false, autoApprovalAllowed: true },
  ];
  return rows.filter((r) => r.roleId > 0).map((r, i) => stampNew<EntitlementMatrix>(r, i + 1));
}

function buildTravelModeSeed(): TravelModeRule[] {
  const rows: Omit<TravelModeRule, keyof PolicyBase | "id">[] = [
    {
      roleId: rid("RSM"),
      travelMode: "Air",
      allowedClasses: ["Economy", "Premium Economy"],
      approvalRequiredClasses: ["Business"],
      notAllowedClasses: [],
      billRequired: true,
      autoApprovalAllowed: false,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("RSM"),
      travelMode: "Rail",
      allowedClasses: ["3rd AC", "2nd AC"],
      approvalRequiredClasses: ["1st AC", "Executive Chair Car"],
      notAllowedClasses: [],
      billRequired: true,
      autoApprovalAllowed: true,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("RSM"),
      travelMode: "Bus",
      allowedClasses: ["AC Sleeper", "Volvo / Luxury"],
      approvalRequiredClasses: [],
      notAllowedClasses: [],
      billRequired: true,
      autoApprovalAllowed: true,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("ASM"),
      travelMode: "Air",
      allowedClasses: ["Economy"],
      approvalRequiredClasses: ["Premium Economy"],
      notAllowedClasses: ["Business"],
      billRequired: true,
      autoApprovalAllowed: false,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("ASM"),
      travelMode: "Rail",
      allowedClasses: ["Sleeper", "3rd AC"],
      approvalRequiredClasses: ["2nd AC"],
      notAllowedClasses: ["1st AC"],
      billRequired: true,
      autoApprovalAllowed: true,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("ASM"),
      travelMode: "Bus",
      allowedClasses: ["AC Seater", "AC Sleeper"],
      approvalRequiredClasses: ["Volvo / Luxury"],
      notAllowedClasses: [],
      billRequired: true,
      autoApprovalAllowed: true,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("TM"),
      travelMode: "Air",
      allowedClasses: [],
      approvalRequiredClasses: ["Economy"],
      notAllowedClasses: ["Premium Economy", "Business"],
      billRequired: true,
      autoApprovalAllowed: false,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("TM"),
      travelMode: "Rail",
      allowedClasses: ["Sleeper", "3rd AC"],
      approvalRequiredClasses: ["2nd AC"],
      notAllowedClasses: ["1st AC", "Executive Chair Car"],
      billRequired: true,
      autoApprovalAllowed: true,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("TM"),
      travelMode: "Bus",
      allowedClasses: ["Non-AC Seater", "AC Seater", "Non-AC Sleeper", "AC Sleeper"],
      approvalRequiredClasses: [],
      notAllowedClasses: ["Volvo / Luxury"],
      billRequired: true,
      autoApprovalAllowed: true,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("Intern"),
      travelMode: "Air",
      allowedClasses: [],
      approvalRequiredClasses: [],
      notAllowedClasses: ["Economy", "Premium Economy", "Business"],
      billRequired: true,
      autoApprovalAllowed: false,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("Intern"),
      travelMode: "Rail",
      allowedClasses: ["Sleeper"],
      approvalRequiredClasses: ["3rd AC"],
      notAllowedClasses: ["2nd AC", "1st AC", "Executive Chair Car"],
      billRequired: true,
      autoApprovalAllowed: false,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    {
      roleId: rid("Intern"),
      travelMode: "Bus",
      allowedClasses: ["Non-AC Seater", "AC Seater"],
      approvalRequiredClasses: [],
      notAllowedClasses: ["AC Sleeper", "Volvo / Luxury"],
      billRequired: true,
      autoApprovalAllowed: false,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
  ];

  return rows.filter((r) => r.roleId > 0).map((r, i) => stampNew<TravelModeRule>(r, i + 1));
}

const LODGING_SEED: LodgingRule[] = ([
  {
    roleId: rid("RSM"),
    cityCategory: "Mega Metro",
    lodgingLimitPerDay: 3000,
    billRequired: true,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
  {
    roleId: rid("ASM"),
    cityCategory: "Metro",
    lodgingLimitPerDay: 2000,
    billRequired: true,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
  {
    roleId: rid("TM"),
    cityCategory: "Other",
    lodgingLimitPerDay: 1500,
    billRequired: true,
    autoApprovalAllowed: false,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
] as (Omit<LodgingRule, keyof PolicyBase> & Partial<PolicyBase>)[]).filter((r) => r.roleId > 0).map((r, i) => stampNew<LodgingRule>(r, i + 1));

const FLAT_STAY_SEED: FlatStayRule[] = ([
  {
    roleId: rid("RSM"),
    cityCategory: "Mega Metro",
    allowancePerDay: 1000,
    declarationRequired: true,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
  {
    roleId: rid("ASM"),
    cityCategory: "Metro",
    allowancePerDay: 700,
    declarationRequired: true,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
  {
    roleId: rid("TM"),
    cityCategory: "Other",
    allowancePerDay: 400,
    declarationRequired: true,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
] as (Omit<FlatStayRule, keyof PolicyBase> & Partial<PolicyBase>)[]).filter((r) => r.roleId > 0).map((r, i) => stampNew<FlatStayRule>(r, i + 1));

const MEALS_ALLOWANCE_SEED: MealsAllowanceRule[] = ([
  {
    roleId: rid("RSM"),
    cityCategory: "Mega Metro",
    mealsAllowancePerDay: 500,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
  {
    roleId: rid("ASM"),
    cityCategory: "Metro",
    mealsAllowancePerDay: 400,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
  {
    roleId: rid("TM"),
    cityCategory: "Other",
    mealsAllowancePerDay: 250,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
] as (Omit<MealsAllowanceRule, keyof PolicyBase> & Partial<PolicyBase>)[]).filter((r) => r.roleId > 0).map((r, i) => stampNew<MealsAllowanceRule>(r, i + 1));

const LOCAL_CONVEYANCE_SEED: LocalConveyanceRule[] = ([
  {
    roleId: rid("RSM"),
    cityCategory: "Mega Metro",
    allowedModes: ["Cab", "Metro", "Taxi"],
    conveyanceLimitPerDay: 1500,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
  {
    roleId: rid("ASM"),
    cityCategory: "Metro",
    allowedModes: ["Cab", "Auto", "Metro"],
    conveyanceLimitPerDay: 1000,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
  {
    roleId: rid("TM"),
    cityCategory: "Other",
    allowedModes: ["Auto", "Bus"],
    conveyanceLimitPerDay: 500,
    billRequired: false,
    autoApprovalAllowed: true,
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    remarks: "",
  },
] as (Omit<LocalConveyanceRule, keyof PolicyBase> & Partial<PolicyBase>)[]).filter((r) => r.roleId > 0).map((r, i) => stampNew<LocalConveyanceRule>(r, i + 1));

const PERSONAL_KM_SEED: PersonalVehicleKmRule[] = ([
  { roleId: rid("RSM"), vehicleType: "Two Wheeler", ratePerKm: 5, maxKmPerDay: 150, approvalRequiredAboveKm: 100, autoApprovalAllowed: true, effectiveFrom: "2026-01-01", effectiveTo: "", remarks: "" },
  { roleId: rid("RSM"), vehicleType: "Four Wheeler", ratePerKm: 12.5, maxKmPerDay: 200, approvalRequiredAboveKm: 120, autoApprovalAllowed: true, effectiveFrom: "2026-01-01", effectiveTo: "", remarks: "" },
  { roleId: rid("ASM"), vehicleType: "Two Wheeler", ratePerKm: 5, maxKmPerDay: 120, approvalRequiredAboveKm: 80, autoApprovalAllowed: true, effectiveFrom: "2026-01-01", effectiveTo: "", remarks: "" },
  { roleId: rid("ASM"), vehicleType: "Four Wheeler", ratePerKm: 12.5, maxKmPerDay: 150, approvalRequiredAboveKm: 100, autoApprovalAllowed: true, effectiveFrom: "2026-01-01", effectiveTo: "", remarks: "" },
  { roleId: rid("TM"), vehicleType: "Two Wheeler", ratePerKm: 5, maxKmPerDay: 100, approvalRequiredAboveKm: 60, autoApprovalAllowed: true, effectiveFrom: "2026-01-01", effectiveTo: "", remarks: "" },
  { roleId: rid("TM"), vehicleType: "Four Wheeler", ratePerKm: 12.5, maxKmPerDay: 120, approvalRequiredAboveKm: 80, autoApprovalAllowed: false, effectiveFrom: "2026-01-01", effectiveTo: "", remarks: "" },
] as (Omit<PersonalVehicleKmRule, keyof PolicyBase> & Partial<PolicyBase>)[]).filter((r) => r.roleId > 0).map((r, i) => stampNew<PersonalVehicleKmRule>(r, i + 1));

const INCIDENTAL_SEED: IncidentalAllowanceRule[] = SF_ROLE_NAMES.map((name, i) =>
  stampNew<IncidentalAllowanceRule>(
    {
      roleId: rid(name),
      cityCategory: "All",
      allowancePerDay: 100,
      billRequired: false,
      autoApprovalAllowed: true,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      remarks: "",
    },
    i + 1,
  ),
).filter((r) => r.roleId > 0);

const AUTO_VALIDATION_SETTINGS_SEED: AutoValidationSettings = {
  autoApprovalEnabled: true,
  requireBill: true,
  requireDeclaration: true,
  blockOnLeave: true,
  blockOnDuplicate: true,
  remarks: "Global auto-validation controls for TA/DA v8",
};

const APPROVAL_THRESHOLD_SEED: ApprovalThresholdRule[] = [
  {
    roleId: null,
    claimCategoryId: null,
    amountFrom: 0,
    amountTo: 5000,
    approvalLevel1: "Reporting Manager",
    approvalLevel2: "",
    approvalLevel3: "",
    approvalLevel4: "",
    remarks: "Default low amount route",
  },
  {
    roleId: null,
    claimCategoryId: null,
    amountFrom: 5000.01,
    amountTo: 20000,
    approvalLevel1: "Reporting Manager",
    approvalLevel2: "Higher Sales Role",
    approvalLevel3: "",
    approvalLevel4: "",
    remarks: "Default medium amount route",
  },
  {
    roleId: null,
    claimCategoryId: null,
    amountFrom: 20000.01,
    amountTo: 9999999,
    approvalLevel1: "Reporting Manager",
    approvalLevel2: "Higher Sales Role",
    approvalLevel3: "HR",
    approvalLevel4: "Accounts",
    remarks: "Default high amount route",
  },
].map((r, i) => stampNew(r, i + 1));

function loadList<T>(key: string, seed: T[]): T[] {
  ensureVersion();
  return loadPolicyList(key, seed);
}

export const loadRolePolicyMappings = () => loadList(KEYS.roleMapping, buildRoleMappingSeed());
export const saveRolePolicyMappings = (l: RolePolicyMapping[]) => savePolicyList(KEYS.roleMapping, l);

export const loadCityCategories = (): CityCategoryMaster[] =>
  loadList(KEYS.cities, buildCityCategorySeed()).map(normalizeCityCategory);

export const saveCityCategories = (l: CityCategoryMaster[]) => savePolicyList(KEYS.cities, l);

export function getMappedCityNames(mapped: MappedCityRef[]): string[] {
  return mapped.map((m) => m.city);
}

export function getStatesCovered(mapped: MappedCityRef[]): string[] {
  return [...new Set(mapped.map((m) => m.state).filter(Boolean))].sort();
}

export function formatStatesCovered(mapped: MappedCityRef[], max = 2): string {
  const states = getStatesCovered(mapped);
  if (!states.length) return "—";
  if (states.length <= max) return states.join(", ");
  return `${states.slice(0, max).join(", ")} +${states.length - max}`;
}

export function groupMappedCitiesByState(mapped: MappedCityRef[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const m of mapped) {
    const state = m.state || "—";
    if (!groups[state]) groups[state] = [];
    groups[state].push(m.city);
  }
  for (const state of Object.keys(groups)) {
    groups[state].sort();
  }
  return groups;
}

export function getCityPreviewFromMappings(mapped: MappedCityRef[], max = 2): string {
  return getCityPreview(getMappedCityNames(mapped), max);
}

export function renameStateInMappings(
  mapped: MappedCityRef[],
  oldState: string,
  newState: string,
): MappedCityRef[] {
  const o = oldState.trim().toLowerCase();
  return mapped.map((m) =>
    m.state.trim().toLowerCase() === o ? { ...m, state: newState.trim() } : m,
  );
}

export function renameCityInMappings(
  mapped: MappedCityRef[],
  state: string,
  oldCity: string,
  newCity: string,
): MappedCityRef[] {
  const st = state.trim().toLowerCase();
  const oc = oldCity.trim().toLowerCase();
  return mapped.map((m) =>
    m.state.trim().toLowerCase() === st && m.city.trim().toLowerCase() === oc
      ? { ...m, city: newCity.trim() }
      : m,
  );
}

export function renameStateInCategoryRecords(
  records: CityCategoryMaster[],
  oldState: string,
  newState: string,
): CityCategoryMaster[] {
  return records.map((r) =>
    stampUpdate({ ...r, mappedCities: renameStateInMappings(r.mappedCities, oldState, newState) }),
  );
}

export function renameCityInCategoryRecords(
  records: CityCategoryMaster[],
  state: string,
  oldCity: string,
  newCity: string,
): CityCategoryMaster[] {
  return records.map((r) =>
    stampUpdate({ ...r, mappedCities: renameCityInMappings(r.mappedCities, state, oldCity, newCity) }),
  );
}

/** Remove city refs from every category, then assign to target category on save. */
export function dedupeCityMappings(
  categories: CityCategoryMaster[],
  targetId: number,
  mappedCities: MappedCityRef[],
): CityCategoryMaster[] {
  const keySet = new Set(mappedCities.map(mappedCityKey));
  return categories.map((cat) => {
    if (cat.id === targetId) {
      return stampUpdate({ ...cat, mappedCities: [...mappedCities] });
    }
    const filtered = cat.mappedCities.filter((m) => !keySet.has(mappedCityKey(m)));
    return filtered.length === cat.mappedCities.length ? cat : stampUpdate({ ...cat, mappedCities: filtered });
  });
}

export function getCityPreview(cities: string[], max = 4): string {
  if (!cities.length) return "—";
  if (cities.length <= max) return cities.join(", ");
  return `${cities.slice(0, max).join(", ")} +${cities.length - max} more`;
}

export function getMissingCityCategoryTypes(records: CityCategoryMaster[]): CityCategory[] {
  return CITY_CATEGORIES.filter((t) => !records.some((r) => r.categoryName === t));
}

export const loadClaimCategories = () => loadList(KEYS.claimCategories, CLAIM_CATEGORY_SEED);
export const saveClaimCategories = (l: ClaimCategoryMaster[]) => savePolicyList(KEYS.claimCategories, l);

export const loadEntitlements = () => loadList(KEYS.entitlements, buildEntitlementSeed());
export const saveEntitlements = (l: EntitlementMatrix[]) => savePolicyList(KEYS.entitlements, l);

export const loadTravelModeRules = () => loadList(KEYS.travelMode, buildTravelModeSeed());
export const saveTravelModeRules = (l: TravelModeRule[]) => savePolicyList(KEYS.travelMode, l);

export const loadLodgingRules = () => loadList(KEYS.lodging, LODGING_SEED);
export const saveLodgingRules = (l: LodgingRule[]) => savePolicyList(KEYS.lodging, l);

export const loadFlatStayRules = () => loadList(KEYS.flatStay, FLAT_STAY_SEED);
export const saveFlatStayRules = (l: FlatStayRule[]) => savePolicyList(KEYS.flatStay, l);

export const loadMealsAllowanceRules = () => loadList(KEYS.meals, MEALS_ALLOWANCE_SEED);
export const saveMealsAllowanceRules = (l: MealsAllowanceRule[]) => savePolicyList(KEYS.meals, l);

export const loadLocalConveyanceRules = () => loadList(KEYS.localConveyance, LOCAL_CONVEYANCE_SEED);
export const saveLocalConveyanceRules = (l: LocalConveyanceRule[]) => savePolicyList(KEYS.localConveyance, l);

export const loadPersonalVehicleKmRules = () => loadList(KEYS.personalKm, PERSONAL_KM_SEED);
export const savePersonalVehicleKmRules = (l: PersonalVehicleKmRule[]) => savePolicyList(KEYS.personalKm, l);

export const loadIncidentalRules = () => loadList(KEYS.incidental, INCIDENTAL_SEED);
export const saveIncidentalRules = (l: IncidentalAllowanceRule[]) => savePolicyList(KEYS.incidental, l);

export function loadAutoValidationSettings(): AutoValidationSettings {
  ensureVersion();
  if (typeof window === "undefined") return AUTO_VALIDATION_SETTINGS_SEED;
  try {
    const raw = localStorage.getItem(KEYS.autoValidation);
    if (!raw) {
      localStorage.setItem(KEYS.autoValidation, JSON.stringify(AUTO_VALIDATION_SETTINGS_SEED));
      return AUTO_VALIDATION_SETTINGS_SEED;
    }
    return { ...AUTO_VALIDATION_SETTINGS_SEED, ...(JSON.parse(raw) as Partial<AutoValidationSettings>) };
  } catch {
    return AUTO_VALIDATION_SETTINGS_SEED;
  }
}

export function saveAutoValidationSettings(settings: AutoValidationSettings): void {
  ensureVersion();
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.autoValidation, JSON.stringify(settings));
}

export const loadApprovalThresholdRules = () => loadList(KEYS.approvalThreshold, APPROVAL_THRESHOLD_SEED);
export const saveApprovalThresholdRules = (l: ApprovalThresholdRule[]) => savePolicyList(KEYS.approvalThreshold, l);

// Backward compatibility with v7 callers.
export const loadTravelClassRules = loadTravelModeRules;
export const saveTravelClassRules = saveTravelModeRules;
export const loadLocalCityTravelRules = loadLocalConveyanceRules;
export const saveLocalCityTravelRules = saveLocalConveyanceRules;
export const loadApprovalRules = loadApprovalThresholdRules;
export const saveApprovalRules = saveApprovalThresholdRules;

const AUDIT_SEED: PolicyAuditEntry[] = [
  { id: 1, timestamp: "2026-06-06 09:00:00", user: "Admin", action: "Created", entity: "Entitlement Matrix", details: "Initial seed — RSM/ASM/TM lodging & boarding limits" },
];

export function loadPolicyAuditLog(): PolicyAuditEntry[] {
  ensureVersion();
  if (typeof window === "undefined") return AUDIT_SEED;
  try {
    const raw = localStorage.getItem(KEYS.audit);
    if (!raw) {
      localStorage.setItem(KEYS.audit, JSON.stringify(AUDIT_SEED));
      return AUDIT_SEED;
    }
    return JSON.parse(raw) as PolicyAuditEntry[];
  } catch {
    return AUDIT_SEED;
  }
}

export function appendPolicyAudit(entry: Omit<PolicyAuditEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  const log = loadPolicyAuditLog();
  const next = {
    ...entry,
    id: (log[0]?.id ?? 0) + 1,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
  };
  localStorage.setItem(KEYS.audit, JSON.stringify([next, ...log].slice(0, 100)));
}

// ─── Lookups ─────────────────────────────────────────────────────────────────

function categoryHasCity(mapped: MappedCityRef[], cityName: string): boolean {
  const normalized = cityName.trim().toLowerCase();
  return mapped.some((m) => m.city.trim().toLowerCase() === normalized);
}

export function getCityCategoryForCity(cityName: string): CityCategory {
  const normalized = cityName.trim().toLowerCase();
  if (!normalized) return "Other";
  const categories = loadCityCategories().filter((c) => c.status === "active");
  const mega = categories.find((c) => c.categoryName === "Mega Metro");
  if (mega && categoryHasCity(mega.mappedCities, cityName)) return "Mega Metro";
  const metro = categories.find((c) => c.categoryName === "Metro");
  if (metro && categoryHasCity(metro.mappedCities, cityName)) return "Metro";
  return "Other";
}

/** Resolve policy city category from claim travel cities (never manual). */
export function resolveCityCategoryFromCities(...cityNames: (string | undefined)[]): CityCategory {
  for (const name of cityNames) {
    if (name?.trim()) return getCityCategoryForCity(name);
  }
  return "Other";
}

export function getClaimCategoryById(id: number): ClaimCategoryMaster | undefined {
  return loadClaimCategories().find((c) => c.id === id);
}

export function getClaimCategoryByName(name: string): ClaimCategoryMaster | undefined {
  return loadClaimCategories().find((c) => c.claimCategoryName === name);
}

export function getRolePolicyMapping(roleId: number): RolePolicyMapping | undefined {
  return loadRolePolicyMappings().find((m) => m.roleId === roleId && m.status === "active");
}

export function isTadaApplicableForRole(roleId: number | null): boolean {
  if (!roleId) return false;
  return getRolePolicyMapping(roleId)?.tadaApplicable === true;
}

export function getSalesForceRoleIds(): number[] {
  return loadRolePolicyMappings()
    .filter((m) => m.status === "active" && m.isSalesForceRole)
    .map((m) => m.roleId);
}

export function getEntitlement(
  roleId: number,
  cityCategory: CityCategory,
  claimCategoryId: number,
): EntitlementMatrix | undefined {
  return loadEntitlements().find(
    (e) =>
      e.status === "active" &&
      e.roleId === roleId &&
      e.cityCategory === cityCategory &&
      e.claimCategoryId === claimCategoryId,
  );
}

function normalizeClassList(list?: string[]): string[] {
  return [...new Set((list ?? []).map((c) => c.trim()).filter(Boolean))];
}

export function validateTravelModeRuleForm(
  form: Partial<TravelModeRule>,
  existing: TravelModeRule[],
  editingId?: number,
): string | null {
  if (!form.roleId) return "Role is required.";
  if (!form.travelMode) return "Travel mode is required.";

  const allowed = normalizeClassList(form.allowedClasses);
  const notAllowed = normalizeClassList(form.notAllowedClasses);
  const overlap = allowed.find((c) => notAllowed.includes(c));
  if (overlap) return `Class "${overlap}" cannot be both allowed and not allowed.`;

  const clash = existing.find(
    (r) =>
      r.id !== editingId &&
      r.status === "active" &&
      r.roleId === form.roleId &&
      r.travelMode === form.travelMode,
  );
  if (clash) return "Same Role + Travel Mode already exists.";

  return null;
}

export function getTravelModeRule(roleId: number, mode: TravelMode): TravelModeRule | undefined {
  return loadTravelModeRules().find(
    (r) => r.status === "active" && r.roleId === roleId && r.travelMode === mode,
  );
}

export function getTravelClassEligibility(
  roleId: number,
  mode: TravelMode,
  travelClass: string,
): EligibilityStatus {
  const rule = getTravelModeRule(roleId, mode);
  if (!rule) return "Not Allowed";
  const cls = travelClass.trim();
  if (rule.notAllowedClasses.includes(cls)) return "Not Allowed";
  if (rule.approvalRequiredClasses.includes(cls)) return "Approval Required";
  if (rule.allowedClasses.includes(cls)) return "Allowed";
  return "Not Allowed";
}

export function getTravelClassRule(
  roleId: number,
  _travelType: TravelType,
  mode: TravelMode,
  travelClass: string,
): TravelModeRule | undefined {
  const rule = getTravelModeRule(roleId, mode);
  if (!rule) return undefined;
  const eligibility = getTravelClassEligibility(roleId, mode, travelClass);
  return eligibility === "Not Allowed" ? undefined : rule;
}

export function getAllowedTravelOptions(roleId: number): { travelMode: TravelMode; travelClass: string }[] {
  const rows: { travelMode: TravelMode; travelClass: string }[] = [];
  for (const rule of loadTravelModeRules()) {
    if (rule.status !== "active" || rule.roleId !== roleId) continue;
    for (const cls of [...rule.allowedClasses, ...rule.approvalRequiredClasses]) {
      rows.push({ travelMode: rule.travelMode, travelClass: cls });
    }
  }
  return rows;
}

export function getLodgingRule(roleId: number, cityCategory: CityCategory): LodgingRule | undefined {
  return loadLodgingRules().find(
    (r) => r.status === "active" && r.roleId === roleId && r.cityCategory === cityCategory,
  );
}

export function getFlatStayRule(roleId: number, cityCategory: CityCategory): FlatStayRule | undefined {
  return loadFlatStayRules().find(
    (r) => r.status === "active" && r.roleId === roleId && r.cityCategory === cityCategory,
  );
}

export function getMealsAllowanceRule(
  roleId: number,
  cityCategory: CityCategory,
): MealsAllowanceRule | undefined {
  return loadMealsAllowanceRules().find(
    (r) => r.status === "active" && r.roleId === roleId && r.cityCategory === cityCategory,
  );
}

export function getLocalConveyanceRule(
  roleId: number,
  cityCategory: CityCategory,
): LocalConveyanceRule | undefined {
  return loadLocalConveyanceRules().find(
    (r) => r.status === "active" && r.roleId === roleId && r.cityCategory === cityCategory,
  );
}

export function getPersonalVehicleKmRule(roleId: number, vehicleType: VehicleType): PersonalVehicleKmRule | undefined {
  return loadPersonalVehicleKmRules().find(
    (r) => r.status === "active" && r.roleId === roleId && r.vehicleType === vehicleType,
  );
}

export function getIncidentalRule(roleId: number, cityCategory: CityCategory): IncidentalAllowanceRule | undefined {
  return loadIncidentalRules().find(
    (r) =>
      r.status === "active" &&
      r.roleId === roleId &&
      (r.cityCategory === cityCategory || r.cityCategory === "All"),
  );
}

function getRuleSpecificity(rule: ApprovalThresholdRule, roleId: number, claimCategoryId?: number | null): number {
  let score = 0;
  if (rule.roleId === roleId) score += 2;
  else if (rule.roleId == null) score += 1;
  if (claimCategoryId != null && rule.claimCategoryId === claimCategoryId) score += 2;
  else if (rule.claimCategoryId == null) score += 1;
  return score;
}

export function resolveApprovalRoute(
  roleId: number,
  amount: number,
  claimCategoryId?: number | null,
): string[] {
  const rules = loadApprovalThresholdRules()
    .filter((r) => r.status === "active")
    .filter((r) => (r.roleId == null || r.roleId === roleId))
    .filter((r) => (r.claimCategoryId == null || (claimCategoryId != null && r.claimCategoryId === claimCategoryId)))
    .filter((r) => amount >= r.amountFrom && amount <= r.amountTo);

  const sorted = rules.sort((a, b) => {
    const specDiff = getRuleSpecificity(b, roleId, claimCategoryId) - getRuleSpecificity(a, roleId, claimCategoryId);
    if (specDiff !== 0) return specDiff;
    return (a.amountTo - a.amountFrom) - (b.amountTo - b.amountFrom);
  });

  const winner = sorted[0];
  if (!winner) return ["Reporting Manager"];
  return [winner.approvalLevel1, winner.approvalLevel2, winner.approvalLevel3, winner.approvalLevel4].filter(Boolean);
}

export function getReportingRoleName(roleId: number): string {
  const mapping = getRolePolicyMapping(roleId);
  return mapping?.reportingRoleId ? getRoleDisplayName(mapping.reportingRoleId) : "—";
}

export function copyEntitlementsFromRole(fromRoleId: number, toRoleId: number): EntitlementMatrix[] {
  const existing = loadEntitlements();
  const source = existing.filter((e) => e.roleId === fromRoleId);
  const withoutTarget = existing.filter((e) => e.roleId !== toRoleId);
  const maxId = existing.reduce((m, e) => Math.max(m, e.id), 0);
  const copied = source.map((e, i) => {
    const { id: _id, createdAt, updatedAt, createdBy, updatedBy, ...rest } = e;
    return stampNew<EntitlementMatrix>({ ...rest, roleId: toRoleId }, maxId + i + 1);
  });
  appendPolicyAudit({
    user: "Admin",
    action: "Copied",
    entity: "Entitlement Matrix",
    details: `${getRoleDisplayName(fromRoleId)} → ${getRoleDisplayName(toRoleId)} (${copied.length} rows)`,
  });
  return [...withoutTarget, ...copied];
}

export const CLAIM_CATEGORY_IDS = CC;
