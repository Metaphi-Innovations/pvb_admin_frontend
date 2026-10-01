import {
  getRoleDisplayName,
  loadClaimCategories,
  resolveRoleIdFromDesignation,
  type TravelType,
} from "../../sales-force-policy/tada-policy-data";
import {
  buildClaimValidationInput,
  getPolicyStatus,
  validateClaim,
} from "../../sales-force-policy/tada-policy-validation";
import { claimToForm, type TadaClaim } from "./tada-claim-data";

export type PolicyStatusLabel = "Compliant" | "Non-Compliant" | "Needs Review";

export interface ClaimPolicySnapshot {
  roleName: string;
  claimCategoryName: string;
  travelTypeLabel: string;
  eligibleAmount: number;
  claimedAmount: number;
  excessAmount: number;
  difference: number;
  policyStatus: PolicyStatusLabel;
  autoApprovalEligible: boolean;
  approvalRoute: string[];
  failedRules: string[];
  billRequired: boolean;
  billUploaded: boolean;
}

export function getTravelTypeLabel(claim: TadaClaim): string {
  if (claim.travelTypeLabel) return claim.travelTypeLabel;
  return claim.claimType.includes("local") ? "Local" : "Outstation";
}

export function getClaimCategoryName(claim: TadaClaim): string {
  if (claim.claimCategoryName) return claim.claimCategoryName;
  return claim.expenseDetails[0]?.expenseType ?? "—";
}

export function getClaimRoleName(claim: TadaClaim): string {
  const roleId = claim.roleId ?? resolveRoleIdFromDesignation(claim.designation);
  return roleId ? getRoleDisplayName(roleId) : claim.designation;
}

export function getClaimPolicySnapshot(claim: TadaClaim): ClaimPolicySnapshot {
  const form = claimToForm(claim);
  const preview = validateClaim(buildClaimValidationInput(form));
  const policyStatus = getPolicyStatus(preview.failedRules);
  const cats = loadClaimCategories();
  const cat = cats.find((c) => c.id === form.claimCategoryId);

  return {
    roleName: preview.roleName,
    claimCategoryName: cat?.claimCategoryName ?? getClaimCategoryName(claim),
    travelTypeLabel: form.travelType === "Local Travel" ? "Local" : "Outstation",
    eligibleAmount: preview.eligibleAmount,
    claimedAmount: preview.claimedAmount,
    excessAmount: preview.excessAmount,
    difference: preview.claimedAmount - preview.eligibleAmount,
    policyStatus,
    autoApprovalEligible: preview.autoApprovalEligible,
    approvalRoute: preview.approvalRoute,
    failedRules: preview.failedRules,
    billRequired: preview.billRequired,
    billUploaded: preview.billUploaded,
  };
}

export const POLICY_STATUS_FILTER_OPTIONS = ["all", "Compliant", "Needs Review", "Non-Compliant"] as const;
