"use client";

import { usePermissionsOptional } from "@/lib/auth";

const COA_MODULE = "accounts";
const COA_SUBMODULE = "chart_of_accounts";

/**
 * Chart of Accounts permission check against real web RBAC
 * (`accounts.chart_of_accounts.*`). Optimistic while permissions load
 * (same pattern as bank accounts).
 */
export function useCanCoa(action: "view" | "create" | "edit" | "delete"): boolean {
  const permissions = usePermissionsOptional();
  if (!permissions || permissions.isLoading) return true;

  switch (action) {
    case "view":
      return permissions.canView(COA_MODULE, COA_SUBMODULE);
    case "create":
      return permissions.canCreate(COA_MODULE, COA_SUBMODULE);
    case "edit":
      return permissions.canEdit(COA_MODULE, COA_SUBMODULE);
    case "delete":
      return permissions.canDelete(COA_MODULE, COA_SUBMODULE);
    default:
      return false;
  }
}
