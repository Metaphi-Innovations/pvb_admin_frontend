import {
  CITY_CATEGORY_POLICY_OPTIONS,
  CLAIM_TYPE_OPTIONS,
  CURRENT_USER,
  LOCAL_CONVEYANCE_MODE_OPTIONS,
  SF_ROLE_OPTIONS,
  TRAVEL_CLASS_OPTIONS,
  VEHICLE_TYPE_POLICY_OPTIONS,
} from "@/lib/hr/config";
import {
  loadPolicyList,
  nextPolicyId,
  policyToday,
  savePolicyList,
  stampNew,
  stampUpdate,
  type PolicyBase,
  type PolicyStatus,
} from "@/lib/hr/policy-common";

export type { PolicyStatus };

// ── A. Role / Grade Entitlement ─────────────────────────────────────────────
export interface RoleEntitlement extends PolicyBase {
  designation: string;
  travelClass: string;
  airTravelAllowed: boolean;
  localConveyanceMode: string;
}

const ROLE_KEY = "ds_hr_role_entitlement_v1";
const ROLE_SEED: RoleEntitlement[] = SF_ROLE_OPTIONS.map((d, i) =>
  stampNew<RoleEntitlement>(
    {
      designation: d,
      travelClass: i === 0 ? "Business" : "Economy",
      airTravelAllowed: i <= 1,
      localConveyanceMode: i <= 2 ? "Auto / Taxi" : "Own Vehicle",
    },
    i + 1,
  ),
);

export const loadRoleEntitlements = () => loadPolicyList(ROLE_KEY, ROLE_SEED);
export const saveRoleEntitlements = (l: RoleEntitlement[]) => savePolicyList(ROLE_KEY, l);

// ── B. City Category Master ─────────────────────────────────────────────────
export interface CityCategoryMaster extends PolicyBase {
  cityName: string;
  cityCategory: string;
}

const CITY_KEY = "ds_hr_city_category_v1";
const CITY_SEED: CityCategoryMaster[] = [
  stampNew({ cityName: "Mumbai", cityCategory: "Mega Metro" }, 1),
  stampNew({ cityName: "Delhi NCR", cityCategory: "Mega Metro" }, 2),
  stampNew({ cityName: "Pune", cityCategory: "Metro" }, 3),
  stampNew({ cityName: "Nagpur", cityCategory: "Others" }, 4),
  stampNew({ cityName: "Wardha", cityCategory: "Others" }, 5),
];

export const loadCityCategories = () => loadPolicyList(CITY_KEY, CITY_SEED);
export const saveCityCategories = (l: CityCategoryMaster[]) => savePolicyList(CITY_KEY, l);

// ── C. Lodging & Boarding ───────────────────────────────────────────────────
export interface LodgingBoardingPolicy extends PolicyBase {
  designation: string;
  cityCategory: string;
  lodgingLimit: number;
  boardingLimit: number;
}

const LB_KEY = "ds_hr_lodging_boarding_v1";
const LB_SEED: LodgingBoardingPolicy[] = [
  stampNew({ designation: "Territory Manager", cityCategory: "Mega Metro", lodgingLimit: 3500, boardingLimit: 800 }, 1),
  stampNew({ designation: "Territory Manager", cityCategory: "Metro", lodgingLimit: 2800, boardingLimit: 700 }, 2),
  stampNew({ designation: "Territory Manager", cityCategory: "Others", lodgingLimit: 2000, boardingLimit: 600 }, 3),
  stampNew({ designation: "Area Sales Manager", cityCategory: "Mega Metro", lodgingLimit: 4500, boardingLimit: 1000 }, 4),
];

export const loadLodgingBoarding = () => loadPolicyList(LB_KEY, LB_SEED);
export const saveLodgingBoarding = (l: LodgingBoardingPolicy[]) => savePolicyList(LB_KEY, l);

// ── D. Local Travel Policy ────────────────────────────────────────────────────
export interface LocalTravelPolicy extends PolicyBase {
  designation: string;
  cityCategory: string;
  mealsMiscAmount: number;
  nonPeakHoursMode: string;
  peakOddHoursMode: string;
}

const LT_KEY = "ds_hr_local_travel_v1";
const LT_SEED: LocalTravelPolicy[] = [
  stampNew({
    designation: "Territory Manager",
    cityCategory: "Metro",
    mealsMiscAmount: 350,
    nonPeakHoursMode: "Auto / Taxi",
    peakOddHoursMode: "Auto / Taxi",
  }, 1),
];

export const loadLocalTravel = () => loadPolicyList(LT_KEY, LT_SEED);
export const saveLocalTravel = (l: LocalTravelPolicy[]) => savePolicyList(LT_KEY, l);

// ── E. KM Reimbursement ─────────────────────────────────────────────────────
export interface KmReimbursementPolicy extends PolicyBase {
  vehicleType: string;
  ratePerKm: number;
  approvalRequired: boolean;
}

const KM_KEY = "ds_hr_km_reimbursement_v1";
const KM_SEED: KmReimbursementPolicy[] = [
  stampNew({ vehicleType: "Two-Wheeler", ratePerKm: 5, approvalRequired: false }, 1),
  stampNew({ vehicleType: "Four-Wheeler", ratePerKm: 12, approvalRequired: true }, 2),
];

export const loadKmReimbursement = () => loadPolicyList(KM_KEY, KM_SEED);
export const saveKmReimbursement = (l: KmReimbursementPolicy[]) => savePolicyList(KM_KEY, l);

// ── F. Incidental Allowance ───────────────────────────────────────────────────
export interface IncidentalPolicy extends PolicyBase {
  designation: string;
  incidentalAmountPerDay: number;
  billsRequired: boolean;
}

const INC_KEY = "ds_hr_incidental_v1";
const INC_SEED: IncidentalPolicy[] = [
  stampNew({ designation: "Territory Manager", incidentalAmountPerDay: 200, billsRequired: false }, 1),
  stampNew({ designation: "Area Sales Manager", incidentalAmountPerDay: 300, billsRequired: false }, 2),
];

export const loadIncidental = () => loadPolicyList(INC_KEY, INC_SEED);
export const saveIncidental = (l: IncidentalPolicy[]) => savePolicyList(INC_KEY, l);

// ── G. Claim Type Master ──────────────────────────────────────────────────────
export interface ClaimTypeMaster extends PolicyBase {
  claimTypeName: string;
  claimTypeCode: string;
  billsRequired: boolean;
  approvalRequired: boolean;
}

const CT_KEY = "ds_hr_claim_type_master_v1";
const CT_SEED: ClaimTypeMaster[] = CLAIM_TYPE_OPTIONS.map((c, i) =>
  stampNew<ClaimTypeMaster>(
    {
      claimTypeName: c.label,
      claimTypeCode: c.code,
      billsRequired: c.billsRequired,
      approvalRequired: c.code !== "km_reimbursement",
    },
    i + 1,
  ),
);

export const loadClaimTypes = () => loadPolicyList(CT_KEY, CT_SEED);
export const saveClaimTypes = (l: ClaimTypeMaster[]) => savePolicyList(CT_KEY, l);

export { nextPolicyId, stampNew, stampUpdate, policyToday, CURRENT_USER };
export {
  CITY_CATEGORY_POLICY_OPTIONS,
  TRAVEL_CLASS_OPTIONS,
  LOCAL_CONVEYANCE_MODE_OPTIONS,
  VEHICLE_TYPE_POLICY_OPTIONS,
  SF_ROLE_OPTIONS,
};
