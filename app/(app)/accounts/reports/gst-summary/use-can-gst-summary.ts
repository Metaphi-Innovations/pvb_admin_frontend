"use client";

import { usePermissionsOptional } from "@/lib/auth";

const MODULE = "accounts";
const SUBMODULE = "gst_summary";

/**
 * GST Summary RBAC against `accounts.gst_summary.*`.
 * Optimistic while permissions load (same pattern as COA / bank accounts).
 */
export function useCanGstSummary(
  action: "view" | "create" | "edit" | "delete",
): boolean {
  const permissions = usePermissionsOptional();
  if (!permissions || permissions.isLoading) return true;

  switch (action) {
    case "view":
      return permissions.canView(MODULE, SUBMODULE);
    case "create":
      return permissions.canCreate(MODULE, SUBMODULE);
    case "edit":
      return permissions.canEdit(MODULE, SUBMODULE);
    case "delete":
      return permissions.canDelete(MODULE, SUBMODULE);
    default:
      return false;
  }
}
