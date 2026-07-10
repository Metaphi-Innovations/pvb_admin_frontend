"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/lib/auth/permissions-context";
import { canAny } from "@/lib/auth/permissions";
import { resolveRouteRule, type ModuleSubmoduleRef } from "@/lib/auth/route-permissions";
import type { PermissionAction } from "@/lib/auth/permissions";

interface RouteGuardProps {
  children: React.ReactNode;
  /** Override: module + submodule candidates for this subtree. */
  module?: string;
  submodule?: string;
  candidates?: ModuleSubmoduleRef[];
  action?: PermissionAction;
  unauthorizedHref?: string;
  loginHref?: string;
}

/**
 * On every route change: waits for the permissions API response, then
 * allows render only if Module + Submodule view (or action) is granted.
 */
export function RouteGuard({
  children,
  module,
  submodule,
  candidates: candidatesProp,
  action = "view",
  unauthorizedHref = "/unauthorized",
  loginHref = "/login",
}: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: permsLoading } = usePermissions();

  const rule = resolveRouteRule(pathname || "/");
  const candidates: ModuleSubmoduleRef[] =
    candidatesProp ??
    (module && submodule
      ? [{ module, submodule }]
      : rule?.candidates ?? []);
  const requiredAction = action ?? rule?.action ?? "view";

  const checksReady = !authLoading && (!isAuthenticated || !permsLoading);

  const allowed =
    !isAuthenticated
      ? false
      : candidates.length === 0
        ? true
        : canAny(permissions, candidates, requiredAction);

  useEffect(() => {
    if (!checksReady) return;
    if (!isAuthenticated) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`${loginHref}${next}`);
      return;
    }
    if (!allowed) {
      router.replace(unauthorizedHref);
    }
  }, [
    checksReady,
    isAuthenticated,
    allowed,
    router,
    loginHref,
    unauthorizedHref,
    pathname,
  ]);

  if (!checksReady) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (!isAuthenticated || !allowed) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
