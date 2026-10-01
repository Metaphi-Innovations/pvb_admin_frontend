import {
  getEntitlement,
  getFlatStayRule,
  getIncidentalRule,
  getLodgingRule,
  getLocalConveyanceRule,
  getMealsAllowanceRule,
  getPersonalVehicleKmRule,
  getRoleDisplayName,
  getTravelClassEligibility,
  getTravelModeRule,
  isTadaApplicableForRole,
  loadAutoValidationSettings,
  loadClaimCategories,
  resolveApprovalRoute,
  resolveRoleIdFromDesignation,
  type CityCategory,
  type TravelMode,
  type VehicleType,
} from "./tada-policy-data";

/** Shared input shape for claim form → policy engine (no hardcoded limits). */
export interface ClaimFormPolicyFields {
  roleId: number | null;
  designation: string;
  travelType: string;
  cityCategory: CityCategory;
  claimCategoryId: number;
  claimedAmount: number;
  travelMode?: TravelMode;
  travelClass?: string;
  stayType?: string;
  vehicleType?: VehicleType;
  km?: number;
  nights?: number;
  incidentalDays?: number;
  attachments: { id: string }[];
  declarationAccepted: boolean;
}

export function buildClaimValidationInput(form: ClaimFormPolicyFields): ClaimValidationInput {
  const cat = loadClaimCategories().find((c) => c.id === form.claimCategoryId);
  const days =
    cat?.claimCategoryName === "Lodging" || cat?.claimCategoryName === "Flat Stay Allowance"
      ? form.nights ?? 0
      : form.incidentalDays ?? 0;

  return {
    roleId: form.roleId,
    designation: form.designation,
    travelType: form.travelType,
    cityCategory: form.cityCategory,
    claimCategoryId: form.claimCategoryId,
    claimedAmount: form.claimedAmount,
    travelMode: form.travelMode,
    travelClass: form.travelClass,
    stayType: form.stayType,
    vehicleType: form.vehicleType,
    km: form.km,
    days: days || 1,
    hasBill: form.attachments.length > 0,
    hasDeclaration: form.declarationAccepted,
  };
}

export function computePolicyEligibleAmount(form: ClaimFormPolicyFields): number {
  return validateClaim(buildClaimValidationInput(form)).eligibleAmount;
}

export function getPolicyStatus(failedRules: string[]): "Compliant" | "Non-Compliant" | "Needs Review" {
  if (failedRules.length === 0) return "Compliant";
  const softOnly = failedRules.every(
    (r) =>
      r === FAILED_MESSAGES.travelClassNeedsApproval ||
      r === FAILED_MESSAGES.autoApprovalDisabled,
  );
  return softOnly ? "Needs Review" : "Non-Compliant";
}

export interface ClaimValidationInput {
  roleId: number | null;
  designation: string;
  travelType: string;
  cityCategory: CityCategory;
  claimCategoryId: number;
  claimedAmount: number;
  travelMode?: TravelMode;
  travelClass?: string;
  stayType?: string;
  vehicleType?: VehicleType;
  km?: number;
  days?: number;
  hasBill: boolean;
  hasDeclaration: boolean;
}

export interface ClaimValidationResult {
  roleName: string;
  eligibleAmount: number;
  claimedAmount: number;
  excessAmount: number;
  cityCategory: CityCategory;
  travelModeStatus: string;
  travelClassStatus: string;
  billRequired: boolean;
  billUploaded: boolean;
  declarationRequired: boolean;
  declarationCompleted: boolean;
  autoApprovalEligible: boolean;
  approvalRoute: string[];
  failedRules: string[];
}

export const FAILED_MESSAGES = {
  notEligible: "Role is not eligible for TA/DA",
  categoryNotConfigured: "Claim category is not configured for this role and city",
  exceedsLimit: "Claimed amount exceeds eligible entitlement limit",
  travelClassNotAllowed: "Travel class not allowed for this role",
  travelClassNeedsApproval: "Travel class requires approval",
  billMissing: "Bill missing",
  declarationMissing: "Declaration missing for flat stay allowance",
  kmExceedsLimit: "Personal vehicle KM exceeds allowed limit",
  duplicateClaim: "Duplicate claim found",
  overlapsLeave: "Claim overlaps leave date",
  autoApprovalDisabled: "Auto approval disabled for this rule",
  guestHouseNotAllowed: "Lodging claim not allowed for Company Guest House unless configured",
} as const;

export function validateClaim(
  input: ClaimValidationInput,
  opts?: { isDuplicate?: boolean; overlapsLeave?: boolean },
): ClaimValidationResult {
  const roleId = input.roleId ?? resolveRoleIdFromDesignation(input.designation);
  const failedRules: string[] = [];
  let eligibleAmount = 0;
  let billRequired = false;
  let declarationRequired = false;
  let travelModeStatus = "—";
  let travelClassStatus = "—";

  if (!roleId || !isTadaApplicableForRole(roleId)) {
    failedRules.push(FAILED_MESSAGES.notEligible);
    return result(input, roleId, eligibleAmount, billRequired, declarationRequired, travelModeStatus, travelClassStatus, failedRules);
  }

  const claimCat = loadClaimCategories().find((c) => c.id === input.claimCategoryId);
  const catName = claimCat?.claimCategoryName ?? "";
  const entitlement = getEntitlement(roleId, input.cityCategory, input.claimCategoryId);

  if (catName === "Lodging" && input.stayType === "Hotel") {
    const lodging = getLodgingRule(roleId, input.cityCategory);
    eligibleAmount = (lodging?.lodgingLimitPerDay ?? entitlement?.limitAmount ?? 0) * (input.days ?? 1);
    billRequired = lodging?.billRequired ?? true;
  } else if (catName === "Flat Stay Allowance" || input.stayType === "Friends / Family / Relative") {
    const flat = getFlatStayRule(roleId, input.cityCategory);
    eligibleAmount = (flat?.allowancePerDay ?? entitlement?.limitAmount ?? 0) * (input.days ?? 1);
    declarationRequired = flat?.declarationRequired ?? true;
    billRequired = flat?.billRequired ?? false;
  } else if (catName === "Local Conveyance") {
    const conv = getLocalConveyanceRule(roleId, input.cityCategory);
    eligibleAmount = conv?.conveyanceLimitPerDay ?? 0;
    billRequired = conv?.billRequired ?? false;
  } else if (catName === "Boarding / Meals") {
    const meals = getMealsAllowanceRule(roleId, input.cityCategory);
    eligibleAmount = (meals?.mealsAllowancePerDay ?? entitlement?.limitAmount ?? 0) * (input.days ?? 1);
    billRequired = meals?.billRequired ?? entitlement?.billRequired ?? false;
  } else if (catName === "Personal Vehicle KM" && input.vehicleType && input.km) {
    const kmRule = getPersonalVehicleKmRule(roleId, input.vehicleType);
    eligibleAmount = (kmRule?.ratePerKm ?? 0) * input.km;
    if (kmRule && input.km > kmRule.maxKmPerDay) failedRules.push(FAILED_MESSAGES.kmExceedsLimit);
    billRequired = false;
  } else if (catName === "Incidental Allowance") {
    const inc = getIncidentalRule(roleId, input.cityCategory);
    eligibleAmount = (inc?.allowancePerDay ?? 100) * (input.days ?? 1);
    billRequired = inc?.billRequired ?? false;
  } else if (entitlement) {
    eligibleAmount = entitlement.limitAmount;
    if (input.days && entitlement.limitType === "Per Day") eligibleAmount *= input.days;
    billRequired = entitlement.billRequired;
  } else if (catName === "Travel Fare") {
    eligibleAmount = input.claimedAmount;
    billRequired = claimCat?.billRequired ?? true;
  } else {
    failedRules.push(FAILED_MESSAGES.categoryNotConfigured);
  }

  let travelClassAutoAllowed = true;
  if (input.travelMode && input.travelClass) {
    travelModeStatus = input.travelMode;
    const eligibility = getTravelClassEligibility(roleId, input.travelMode, input.travelClass);
    travelClassStatus = eligibility;
    const rule = getTravelModeRule(roleId, input.travelMode);
    if (eligibility === "Not Allowed") {
      failedRules.push(FAILED_MESSAGES.travelClassNotAllowed);
      travelClassAutoAllowed = false;
    }
    if (eligibility === "Approval Required") {
      failedRules.push(FAILED_MESSAGES.travelClassNeedsApproval);
      travelClassAutoAllowed = false;
    }
    if (rule?.billRequired) billRequired = true;
    if (rule && !rule.autoApprovalAllowed) travelClassAutoAllowed = false;
  }

  if (input.stayType === "Company Guest House") {
    failedRules.push(FAILED_MESSAGES.guestHouseNotAllowed);
  }

  if (eligibleAmount > 0 && input.claimedAmount > eligibleAmount) {
    failedRules.push(FAILED_MESSAGES.exceedsLimit);
  }
  if (billRequired && !input.hasBill) failedRules.push(FAILED_MESSAGES.billMissing);
  if (declarationRequired && !input.hasDeclaration) failedRules.push(FAILED_MESSAGES.declarationMissing);
  if (opts?.isDuplicate) failedRules.push(FAILED_MESSAGES.duplicateClaim);
  if (opts?.overlapsLeave) failedRules.push(FAILED_MESSAGES.overlapsLeave);

  const settings = loadAutoValidationSettings();
  const entitlementAuto = entitlement?.autoApprovalAllowed ?? settings.autoApprovalEnabled;
  const autoEnabled = settings.autoApprovalEnabled && entitlementAuto && travelClassAutoAllowed;

  const autoApprovalEligible =
    autoEnabled &&
    failedRules.filter(
      (f) =>
        f !== FAILED_MESSAGES.travelClassNeedsApproval &&
        f !== FAILED_MESSAGES.autoApprovalDisabled,
    ).length === 0;

  if (!autoApprovalEligible && !failedRules.includes(FAILED_MESSAGES.autoApprovalDisabled) && !autoEnabled) {
    failedRules.push(FAILED_MESSAGES.autoApprovalDisabled);
  }

  return result(
    input,
    roleId,
    eligibleAmount,
    billRequired,
    declarationRequired,
    travelModeStatus,
    travelClassStatus,
    [...new Set(failedRules)],
    autoApprovalEligible,
  );
}

function result(
  input: ClaimValidationInput,
  roleId: number | null,
  eligibleAmount: number,
  billRequired: boolean,
  declarationRequired: boolean,
  travelModeStatus: string,
  travelClassStatus: string,
  failedRules: string[],
  autoApprovalEligible = false,
): ClaimValidationResult {
  return {
    roleName: roleId ? getRoleDisplayName(roleId) : "—",
    eligibleAmount,
    claimedAmount: input.claimedAmount,
    excessAmount: Math.max(0, input.claimedAmount - eligibleAmount),
    cityCategory: input.cityCategory,
    travelModeStatus,
    travelClassStatus,
    billRequired,
    billUploaded: input.hasBill,
    declarationRequired,
    declarationCompleted: input.hasDeclaration,
    autoApprovalEligible,
    approvalRoute: roleId ? resolveApprovalRoute(roleId, input.claimedAmount, input.claimCategoryId) : ["Reporting Manager"],
    failedRules,
  };
}
