"use client";

import React from "react";
import { usePermissions } from "@/lib/auth/permissions-context";

interface ModuleGuardProps {
  module: string;
  /** Alternate module codes (e.g. usermanagement / userManagement). */
  aliases?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/** Show children only if the user has access to the module (any submodule). */
export function ModuleGuard({
  module,
  aliases = [],
  fallback = null,
  children,
}: ModuleGuardProps) {
  const { isLoading, canAccessModule } = usePermissions();

  if (isLoading) return null;

  const allowed =
    canAccessModule(module) || aliases.some((alias) => canAccessModule(alias));

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
