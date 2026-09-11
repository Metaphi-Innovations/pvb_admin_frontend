/**
 * Accounts module permission code constants.
 * COA / bank account UI gates use real web RBAC via `useCanCoa` and
 * `usePermissions` (`chart_of_accounts`, `bank_accounts`). Codes below remain
 * for legacy localStorage helpers (e.g. posting-engine advisory checks).
 */

import {
  canCreate,
  canDelete,
  canEdit,
  canView,
  type WebPermissionTree,
} from "@/lib/auth/permissions";

export const ACCOUNTS_PERMISSIONS = {
  // Chart of Accounts (canonical registry keys)
  COA_VIEW: "accounts.chart_of_accounts.view",
  COA_LEDGER_CREATE: "accounts.chart_of_accounts.create",
  COA_SUB_LEDGER_CREATE: "accounts.chart_of_accounts.create",
  COA_LEDGER_EDIT: "accounts.chart_of_accounts.edit",
  COA_LEDGER_DELETE: "accounts.chart_of_accounts.delete",

  // Vouchers
  VOUCHER_VIEW: "accounts.voucher.view",
  VOUCHER_CREATE: "accounts.voucher.create",
  VOUCHER_EDIT: "accounts.voucher.edit",
  VOUCHER_DELETE: "accounts.voucher.delete",
  VOUCHER_APPROVE: "accounts.voucher.approve",
  VOUCHER_POST: "accounts.voucher.post",
  VOUCHER_CANCEL: "accounts.voucher.cancel",

  // Masters
  FY_MANAGE: "accounts.fy.manage",
  VOUCHER_TYPE_CONFIGURE: "accounts.voucher_type.configure",
  COST_CENTER_MANAGE: "accounts.cost_center.manage",
  BANK_ACCOUNT_MANAGE: "accounts.bank_accounts.edit",
  BANK_ACCOUNT_VIEW: "accounts.bank_accounts.view",
  BANK_ACCOUNT_CREATE: "accounts.bank_accounts.create",
  BANK_ACCOUNT_UPDATE: "accounts.bank_accounts.edit",
  SETTINGS_MANAGE: "accounts.settings.manage",

  // Reports
  REPORT_VIEW: "accounts.report.view",
  REPORT_EXPORT: "accounts.report.export",

  // Banking
  BANK_RECONCILE: "accounts.bank.reconcile",

  // Receivables / Payables
  RECEIVABLES_VIEW: "accounts.receivables.view",
  PAYABLES_VIEW: "accounts.payables.view",
  COLLECTION_TRACK: "accounts.collection.track",
} as const;

export type AccountsPermissionCode =
  (typeof ACCOUNTS_PERMISSIONS)[keyof typeof ACCOUNTS_PERMISSIONS];

/** Default permission sets by role archetype */
export const ROLE_PERMISSION_PRESETS: Record<string, AccountsPermissionCode[]> = {
  accounts_admin: Object.values(ACCOUNTS_PERMISSIONS),
  accounts_manager: [
    ACCOUNTS_PERMISSIONS.COA_VIEW,
    ACCOUNTS_PERMISSIONS.COA_LEDGER_CREATE,
    ACCOUNTS_PERMISSIONS.COA_SUB_LEDGER_CREATE,
    ACCOUNTS_PERMISSIONS.COA_LEDGER_EDIT,
    ACCOUNTS_PERMISSIONS.VOUCHER_VIEW,
    ACCOUNTS_PERMISSIONS.VOUCHER_CREATE,
    ACCOUNTS_PERMISSIONS.VOUCHER_EDIT,
    ACCOUNTS_PERMISSIONS.VOUCHER_APPROVE,
    ACCOUNTS_PERMISSIONS.VOUCHER_POST,
    ACCOUNTS_PERMISSIONS.REPORT_VIEW,
    ACCOUNTS_PERMISSIONS.REPORT_EXPORT,
    ACCOUNTS_PERMISSIONS.RECEIVABLES_VIEW,
    ACCOUNTS_PERMISSIONS.PAYABLES_VIEW,
    ACCOUNTS_PERMISSIONS.BANK_RECONCILE,
    ACCOUNTS_PERMISSIONS.BANK_ACCOUNT_VIEW,
    ACCOUNTS_PERMISSIONS.BANK_ACCOUNT_CREATE,
    ACCOUNTS_PERMISSIONS.BANK_ACCOUNT_UPDATE,
  ],
  accounts_clerk: [
    ACCOUNTS_PERMISSIONS.COA_VIEW,
    ACCOUNTS_PERMISSIONS.VOUCHER_VIEW,
    ACCOUNTS_PERMISSIONS.VOUCHER_CREATE,
    ACCOUNTS_PERMISSIONS.VOUCHER_EDIT,
    ACCOUNTS_PERMISSIONS.REPORT_VIEW,
    ACCOUNTS_PERMISSIONS.RECEIVABLES_VIEW,
    ACCOUNTS_PERMISSIONS.PAYABLES_VIEW,
  ],
  accounts_viewer: [
    ACCOUNTS_PERMISSIONS.COA_VIEW,
    ACCOUNTS_PERMISSIONS.VOUCHER_VIEW,
    ACCOUNTS_PERMISSIONS.REPORT_VIEW,
    ACCOUNTS_PERMISSIONS.RECEIVABLES_VIEW,
    ACCOUNTS_PERMISSIONS.PAYABLES_VIEW,
  ],
};

const STORAGE_KEY = "ds_accounts_user_permissions";

/** Dev fallback — grant all permissions until auth integration */
export function getUserAccountsPermissions(): AccountsPermissionCode[] {
  if (typeof window === "undefined") return ROLE_PERMISSION_PRESETS.accounts_admin;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AccountsPermissionCode[];
  } catch {
    /* use default */
  }
  return ROLE_PERMISSION_PRESETS.accounts_admin;
}

export function hasAccountsPermission(code: AccountsPermissionCode): boolean {
  return getUserAccountsPermissions().includes(code);
}

export function requireAccountsPermission(
  code: AccountsPermissionCode,
): { allowed: boolean; message: string } {
  const allowed = hasAccountsPermission(code);
  return {
    allowed,
    message: allowed
      ? ""
      : `You do not have permission (${code}) to perform this action.`,
  };
}

/** COA CRUD against real web permission tree (`accounts.chart_of_accounts`). */
export function canCoa(
  action: "view" | "create" | "edit" | "delete",
  permissions: WebPermissionTree | null | undefined,
): boolean {
  switch (action) {
    case "view":
      return canView(permissions, "accounts", "chart_of_accounts");
    case "create":
      return canCreate(permissions, "accounts", "chart_of_accounts");
    case "edit":
      return canEdit(permissions, "accounts", "chart_of_accounts");
    case "delete":
      return canDelete(permissions, "accounts", "chart_of_accounts");
    default:
      return false;
  }
}
