"use client";

export { PermissionGuard } from "@/components/auth/PermissionGuard";
export { RouteGuard } from "@/components/auth/RouteGuard";
export { ModuleGuard } from "@/components/auth/ModuleGuard";
export { SubmoduleGuard } from "@/components/auth/SubmoduleGuard";
export { AuthGate } from "@/components/auth/AuthGate";
export { GuestGate } from "@/components/auth/GuestGate";
export {
  useAuth,
  useAuthOptional,
  AuthProvider,
  usePermissions,
  PermissionsProvider,
  canView,
  canCreate,
  canEdit,
  canDelete,
  canExport,
  canApprove,
  canImport,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/lib/auth";
