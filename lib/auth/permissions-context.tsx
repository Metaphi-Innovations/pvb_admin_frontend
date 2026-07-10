"use client";

import React, {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { useAuth } from "@/lib/auth/auth-context";
import { getPermissionScopeKey } from "@/lib/auth/route-permissions";
import {
  canAccessModule as checkModule,
  canAccessSubmodule as checkSubmodule,
  canApprove as checkApprove,
  canCreate as checkCreate,
  canDelete as checkDelete,
  canEdit as checkEdit,
  canExport as checkExport,
  canImport as checkImport,
  canPerform as checkPerform,
  canView as checkView,
  hasAllPermissions as checkAll,
  hasAnyPermission as checkAny,
  hasPermission as checkOne,
  type PermissionAction,
  type WebPermissionTree,
} from "@/lib/auth/permissions";

export interface PermissionsContextValue {
  permissions: WebPermissionTree | null;
  isLoading: boolean;
  error: string | null;
  permissionScopeKey: string;
  refresh: () => Promise<WebPermissionTree | null>;
  canAccessModule: (module: string) => boolean;
  canAccessSubmodule: (module: string, submodule: string) => boolean;
  canView: (module: string, submodule: string) => boolean;
  canCreate: (module: string, submodule: string) => boolean;
  canEdit: (module: string, submodule: string) => boolean;
  canDelete: (module: string, submodule: string) => boolean;
  canExport: (module: string, submodule: string) => boolean;
  canApprove: (module: string, submodule: string) => boolean;
  canImport: (module: string, submodule: string) => boolean;
  canPerform: (module: string, submodule: string, action: PermissionAction | string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

/** Dedupes concurrent permission fetches (e.g. React Strict Mode double-mount). */
const permissionInflight = new Map<string, Promise<WebPermissionTree>>();

function getPermissionFetchKey(userId: string, scopeKey: string): string {
  return `${userId}:${scopeKey}`;
}

function fetchPermissionsOnce(userId: string, fetchKey: string): Promise<WebPermissionTree> {
  const existing = permissionInflight.get(fetchKey);
  if (existing) return existing;

  const promise = AuthService.fetchUserPermissions(userId).finally(() => {
    if (permissionInflight.get(fetchKey) === promise) {
      permissionInflight.delete(fetchKey);
    }
  });

  permissionInflight.set(fetchKey, promise);
  return promise;
}

function PermissionsProviderInner({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const permissionScopeKey = useMemo(() => {
    const search = tab ? `?tab=${tab}` : "";
    return getPermissionScopeKey(pathname || "/", search);
  }, [pathname, tab]);

  const [permissions, setPermissions] = useState<WebPermissionTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const lastFetchedKeyRef = useRef<string | null>(null);

  const fetchPermissions = useCallback(
    async (options?: { force?: boolean }): Promise<WebPermissionTree | null> => {
      const userId = user?.user_id;
      if (!userId) {
        setPermissions(null);
        setError(null);
        setIsLoading(false);
        lastFetchedKeyRef.current = null;
        return null;
      }

      const fetchKey = getPermissionFetchKey(userId, permissionScopeKey);
      if (!options?.force && lastFetchedKeyRef.current === fetchKey) {
        return permissions;
      }

      if (options?.force) {
        permissionInflight.delete(fetchKey);
        lastFetchedKeyRef.current = null;
      }

      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const tree = await fetchPermissionsOnce(userId, fetchKey);
        if (requestId !== requestIdRef.current) return null;
        lastFetchedKeyRef.current = fetchKey;
        setPermissions(tree);
        return tree;
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return null;
        const message =
          (err as { message?: string })?.message ||
          (err as { error?: string })?.error ||
          "Failed to load permissions";
        setError(message);
        setPermissions({});
        return {};
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [user?.user_id, permissionScopeKey, permissions],
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) {
      setPermissions(null);
      setIsLoading(false);
      setError(null);
      lastFetchedKeyRef.current = null;
      return;
    }

    const fetchKey = getPermissionFetchKey(user.user_id, permissionScopeKey);
    if (lastFetchedKeyRef.current === fetchKey) {
      return;
    }

    let active = true;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    fetchPermissionsOnce(user.user_id, fetchKey)
      .then((tree) => {
        if (!active || requestId !== requestIdRef.current) return;
        lastFetchedKeyRef.current = fetchKey;
        setPermissions(tree);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active || requestId !== requestIdRef.current) return;
        const message =
          (err as { message?: string })?.message ||
          (err as { error?: string })?.error ||
          "Failed to load permissions";
        setError(message);
        setPermissions({});
      })
      .finally(() => {
        if (active && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [permissionScopeKey, isAuthenticated, user?.user_id]);

  const refresh = useCallback(
    () => fetchPermissions({ force: true }),
    [fetchPermissions],
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      isLoading,
      error,
      permissionScopeKey,
      refresh,
      canAccessModule: (module: string) => checkModule(permissions, module),
      canAccessSubmodule: (module: string, submodule: string) =>
        checkSubmodule(permissions, module, submodule),
      canView: (module: string, submodule: string) => checkView(permissions, module, submodule),
      canCreate: (module: string, submodule: string) => checkCreate(permissions, module, submodule),
      canEdit: (module: string, submodule: string) => checkEdit(permissions, module, submodule),
      canDelete: (module: string, submodule: string) => checkDelete(permissions, module, submodule),
      canExport: (module: string, submodule: string) => checkExport(permissions, module, submodule),
      canApprove: (module: string, submodule: string) =>
        checkApprove(permissions, module, submodule),
      canImport: (module: string, submodule: string) => checkImport(permissions, module, submodule),
      canPerform: (module: string, submodule: string, action: PermissionAction | string) =>
        checkPerform(permissions, module, submodule, action),
      hasPermission: (permission: string) => checkOne(permissions, permission),
      hasAnyPermission: (list: string[]) => checkAny(permissions, list),
      hasAllPermissions: (list: string[]) => checkAll(permissions, list),
    }),
    [permissions, isLoading, error, permissionScopeKey, refresh],
  );

  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
}

/**
 * Fetches permissions once per module/submodule scope change.
 * Examples: /masters/brands → /masters/crops, /user-management/roles?tab=templates
 */
export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">
          Loading permissions…
        </div>
      }
    >
      <PermissionsProviderInner>{children}</PermissionsProviderInner>
    </Suspense>
  );
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return ctx;
}

export function usePermissionsOptional(): PermissionsContextValue | null {
  return useContext(PermissionsContext);
}
