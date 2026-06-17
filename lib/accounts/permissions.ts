import { loadEmployees } from "@/app/(app)/user-management/employee/employee-data";
import type { SubmodulePermission } from "@/app/(app)/user-management/employee/employee-data";

export const COA_PERM_MODULE = "accounts";
export const COA_PERM_SUBMODULE = "chartOfAccounts";

export type CoaPermAction = "view" | "create" | "edit" | "delete";

const SESSION_USER_KEY = "ds_session_user_id";

function getSessionUserId(): number {
  if (typeof window === "undefined") return 1;
  const raw = localStorage.getItem(SESSION_USER_KEY);
  const id = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(id) ? id : 1;
}

function getCoaSubmodulePerm(): SubmodulePermission | null {
  const employees = loadEmployees();
  const user = employees.find((e) => e.id === getSessionUserId());
  return user?.permissions?.web?.[COA_PERM_MODULE]?.[COA_PERM_SUBMODULE] ?? null;
}

/** Demo default: full access when permission row is absent */
export function canCoa(action: CoaPermAction): boolean {
  const perm = getCoaSubmodulePerm();
  if (!perm) return true;
  return !!perm[action];
}
