/**
 * Accounts module RBAC permission codes.
 * Wire to role_permissions in production; client checks are advisory until auth is integrated.
 */

export const ACCOUNTS_PERMISSIONS = {
  // Chart of Accounts
  COA_VIEW: "accounts.coa.view",
  COA_LEDGER_CREATE: "accounts.coa.ledger.create",
  COA_SUB_LEDGER_CREATE: "accounts.coa.sub_ledger.create",
  COA_LEDGER_EDIT: "accounts.coa.ledger.edit",
  COA_LEDGER_DELETE: "accounts.coa.ledger.delete",

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
  BANK_ACCOUNT_MANAGE: "accounts.bank_account.manage",
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

/** COA ledger CRUD permission shorthand */
export function canCoa(action: "view" | "create" | "edit" | "delete"): boolean {
  const map = {
    view: ACCOUNTS_PERMISSIONS.COA_VIEW,
    create: ACCOUNTS_PERMISSIONS.COA_LEDGER_CREATE,
    edit: ACCOUNTS_PERMISSIONS.COA_LEDGER_EDIT,
    delete: ACCOUNTS_PERMISSIONS.COA_LEDGER_DELETE,
  } as const;
  return hasAccountsPermission(map[action]);
}
