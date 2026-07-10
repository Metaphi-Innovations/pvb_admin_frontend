"use client";

import React from "react";
import { usePermissions } from "@/lib/auth/permissions-context";

interface SubmoduleGuardProps {
  module: string;
  submodule: string;
  /** Alternate module/submodule pairs. */
  alternatives?: Array<{ module: string; submodule: string }>;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Show children only if the user has access to the submodule.
 * Module access alone is not enough.
 */
export function SubmoduleGuard({
  module,
  submodule,
  alternatives = [],
  fallback = null,
  children,
}: SubmoduleGuardProps) {
  const { isLoading, canAccessSubmodule } = usePermissions();

  if (isLoading) return null;

  const allowed =
    canAccessSubmodule(module, submodule) ||
    alternatives.some((a) => canAccessSubmodule(a.module, a.submodule));

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
