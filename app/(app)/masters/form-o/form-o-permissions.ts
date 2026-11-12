"use client";

import { useMemo } from "react";
import { usePermissionsOptional } from "@/lib/auth/permissions-context";

export const FORM_O_PERM_MODULE = "masters";
export const FORM_O_PERM_SUBMODULE = "formO";

export type FormOPermissionFlags = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

/**
 * Form O permission flags from the live auth permission tree.
 * While permissions are loading (or provider missing), allow UI so RouteGuard/API remain the hard gate.
 */
export function useFormOPermissions(): FormOPermissionFlags {
  const permissions = usePermissionsOptional();

  return useMemo(() => {
    if (!permissions || permissions.isLoading) {
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      };
    }

    return {
      canView: permissions.canView(FORM_O_PERM_MODULE, FORM_O_PERM_SUBMODULE),
      canCreate: permissions.canCreate(FORM_O_PERM_MODULE, FORM_O_PERM_SUBMODULE),
      canEdit: permissions.canEdit(FORM_O_PERM_MODULE, FORM_O_PERM_SUBMODULE),
      canDelete: permissions.canDelete(FORM_O_PERM_MODULE, FORM_O_PERM_SUBMODULE),
    };
  }, [permissions]);
}
