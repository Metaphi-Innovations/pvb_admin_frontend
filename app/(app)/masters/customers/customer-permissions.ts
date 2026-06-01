// ── Customer Master — permission keys (CRUD only, no export/import) ─────────

import { loadEmployees } from "../../user-management/employee/employee-data";
import type { SubmodulePermission } from "../../user-management/employee/employee-data";

/** Web portal permission registry ids */
export const CUSTOMER_PERM_MODULE = "masters";
export const CUSTOMER_PERM_SUBMODULE = "customerMaster";

/** Actions exposed for Customer Master (matches PERMISSION_REGISTRY) */
export type CustomerPermAction = "view" | "create" | "edit" | "delete";

export const CUSTOMER_PERM_ACTIONS: CustomerPermAction[] = ["view", "create", "edit", "delete"];

export const CUSTOMER_PERM_LABELS: Record<CustomerPermAction, string> = {
  view: "View / Read",
  create: "Create",
  edit: "Update",
  delete: "Delete",
};

const SESSION_USER_KEY = "ds_session_user_id";

/** Demo session user — defaults to first employee until login session is wired */
export function getSessionUserId(): number {
  if (typeof window === "undefined") return 1;
  const raw = localStorage.getItem(SESSION_USER_KEY);
  const id = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(id) ? id : 1;
}

export function setSessionUserId(id: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_USER_KEY, String(id));
}

function getCustomerSubmodulePerm(): SubmodulePermission | null {
  const employees = loadEmployees();
  const user = employees.find((e) => e.id === getSessionUserId());
  const perm = user?.permissions?.web?.[CUSTOMER_PERM_MODULE]?.[CUSTOMER_PERM_SUBMODULE];
  return perm ?? null;
}

/**
 * Check Customer Master permission.
 * If the user has no permissions object or no customerMaster row yet, allow access (dev default).
 */
export function hasCustomerPermission(action: CustomerPermAction): boolean {
  if (typeof window === "undefined") return true;

  const employees = loadEmployees();
  const user = employees.find((e) => e.id === getSessionUserId());
  if (!user?.permissions?.web) return true;

  const mod = user.permissions.web[CUSTOMER_PERM_MODULE];
  if (!mod) return true;

  const sub = mod[CUSTOMER_PERM_SUBMODULE];
  if (!sub) return true;

  return Boolean(sub[action]);
}

export function readCustomerPermissions() {
  return {
    canView: hasCustomerPermission("view"),
    canCreate: hasCustomerPermission("create"),
    canEdit: hasCustomerPermission("edit"),
    canDelete: hasCustomerPermission("delete"),
  };
}
