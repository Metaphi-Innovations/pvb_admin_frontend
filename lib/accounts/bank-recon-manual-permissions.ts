/**
 * Bank reconciliation manual transaction permissions — stubs for future RBAC.
 */

export const BANK_RECON_MANUAL_PERMISSIONS = {
  view: "bank_recon.manual.view",
  create: "bank_recon.manual.create",
  edit: "bank_recon.manual.edit",
  cancel: "bank_recon.manual.cancel",
  attachmentsView: "bank_recon.manual.attachments.view",
  attachmentsAdd: "bank_recon.manual.attachments.add",
  overrideDuplicate: "bank_recon.manual.override_duplicate",
  complete: "bank_recon.completion.complete",
  completeWithDifference: "bank_recon.completion.complete_with_difference",
  reopen: "bank_recon.completion.reopen",
  viewHistory: "bank_recon.completion.view_history",
  downloadReports: "bank_recon.completion.download_reports",
} as const;

/** Stub — integrate with RBAC when available */
export function canViewManualTransactions(): boolean {
  return true;
}

export function canCreateManualTransaction(): boolean {
  return true;
}

export function canEditManualTransaction(): boolean {
  return true;
}

export function canCancelManualTransaction(): boolean {
  return true;
}

export function canOverridePossibleDuplicate(): boolean {
  return false;
}

export function canCompleteReconciliationPermission(): boolean {
  return true;
}

export function canCompleteWithDifferencePermission(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const perms = JSON.parse(localStorage.getItem("ds_accounts_user_permissions") ?? "[]") as string[];
    return perms.includes(BANK_RECON_MANUAL_PERMISSIONS.completeWithDifference) || perms.includes("*");
  } catch {
    return false;
  }
}

export function canReopenReconciliationPermission(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const perms = JSON.parse(localStorage.getItem("ds_accounts_user_permissions") ?? "[]") as string[];
    return perms.includes(BANK_RECON_MANUAL_PERMISSIONS.reopen) || perms.includes("*");
  } catch {
    return false;
  }
}
