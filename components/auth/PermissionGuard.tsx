"use client";

import React from "react";
import { usePermissions } from "@/lib/auth/permissions-context";
import type { PermissionAction } from "@/lib/auth/permissions";

interface PermissionGuardProps {
  module: string;
  submodule: string;
  /** Default: view */
  action?: PermissionAction | string;
  fallback?: React.ReactNode;
  disableInstead?: boolean;
  children: React.ReactNode;
}

/**
 * UI gate for a Module → Submodule → Action check against the latest
 * permissions API response (via PermissionsProvider).
 */
export function PermissionGuard({
  module,
  submodule,
  action = "view",
  fallback = null,
  disableInstead = false,
  children,
}: PermissionGuardProps) {
  const { isLoading, canPerform } = usePermissions();

  if (isLoading) {
    return disableInstead ? (
      <span className="pointer-events-none opacity-50">{children}</span>
    ) : null;
  }

  const allowed = canPerform(module, submodule, action);

  if (!allowed) {
    if (disableInstead) {
      return <span className="pointer-events-none opacity-50">{children}</span>;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
