import {
  canonicalizeModuleId,
  isLegacySubmoduleKey,
  toCanonicalSubmoduleId,
} from "@/lib/auth/permission-aliases";

/**
 * Hierarchical web permissions from backend:
 * Module → Submodule → Actions
 *
 * { [module]: { [submodule]: { view?, create?, edit|update?, delete?, export?, approve?, import? } } }
 */
export type WebPermissionTree = Record<
  string,
  Record<string, Record<string, boolean>>
>;

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "update"
  | "delete"
  | "approve"
  | "export"
  | "import"
  | "lookup";

/** Actions that unlock module/nav access. `lookup` alone must never open Masters. */
const MODULE_ACCESS_ACTIONS = new Set([
  "view",
  "create",
  "edit",
  "update",
  "delete",
  "approve",
  "export",
  "import",
]);

function actionMatches(stored: string, requested: string): boolean {
  const a = stored.toLowerCase();
  const b = requested.toLowerCase();
  if (a === b) return true;
  if ((a === "edit" && b === "update") || (a === "update" && b === "edit")) return true;
  return false;
}

function findKey(obj: Record<string, unknown>, key: string): string | undefined {
  const lower = key.toLowerCase();
  return Object.keys(obj).find((k) => k.toLowerCase() === lower);
}

function getModuleNode(
  permissions: WebPermissionTree | null | undefined,
  module: string,
): Record<string, Record<string, boolean>> | null {
  if (!permissions || !module) return null;
  const canonicalMod = canonicalizeModuleId(module);
  const key =
    findKey(permissions as Record<string, unknown>, canonicalMod) ??
    findKey(permissions as Record<string, unknown>, module);
  if (!key) return null;
  const node = permissions[key];
  return node && typeof node === "object" ? node : null;
}

function getSubmoduleActions(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): Record<string, boolean> | null {
  const mod = getModuleNode(permissions, module);
  if (!mod || !submodule) return null;
  const canonicalSub = toCanonicalSubmoduleId(module, submodule);
  const key =
    findKey(mod as Record<string, unknown>, canonicalSub) ??
    findKey(mod as Record<string, unknown>, submodule);
  if (!key) return null;
  const actions = mod[key];
  return actions && typeof actions === "object" ? actions : null;
}

function hasModuleAccessAction(actions: Record<string, boolean> | null | undefined): boolean {
  if (!actions) return false;
  for (const [key, enabled] of Object.entries(actions)) {
    if (enabled !== true) continue;
    if (MODULE_ACCESS_ACTIONS.has(key.toLowerCase())) return true;
  }
  return false;
}

/** Module access = at least one submodule has a non-lookup management action. */
export function canAccessModule(
  permissions: WebPermissionTree | null | undefined,
  module: string,
): boolean {
  const mod = getModuleNode(permissions, module);
  if (!mod) return false;
  for (const actions of Object.values(mod)) {
    if (hasModuleAccessAction(actions)) return true;
  }
  return false;
}

/**
 * Submodule access = submodule exists with at least one management action.
 * Lookup-only grants do NOT count (dropdown deps must not open Masters pages).
 */
export function canAccessSubmodule(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): boolean {
  return hasModuleAccessAction(getSubmoduleActions(permissions, module, submodule));
}

/** Check a specific action on module + submodule. */
export function canPerform(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
  action: PermissionAction | string,
): boolean {
  const actions = getSubmoduleActions(permissions, module, submodule);
  if (!actions) return false;
  for (const [key, enabled] of Object.entries(actions)) {
    if (enabled === true && actionMatches(key, action)) return true;
  }
  return false;
}

export function canView(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): boolean {
  return canPerform(permissions, module, submodule, "view");
}

export function canCreate(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): boolean {
  return canPerform(permissions, module, submodule, "create");
}

export function canEdit(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): boolean {
  return (
    canPerform(permissions, module, submodule, "edit") ||
    canPerform(permissions, module, submodule, "update")
  );
}

export function canDelete(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): boolean {
  return canPerform(permissions, module, submodule, "delete");
}

export function canExport(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): boolean {
  return canPerform(permissions, module, submodule, "export");
}

export function canApprove(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): boolean {
  return canPerform(permissions, module, submodule, "approve");
}

export function canImport(
  permissions: WebPermissionTree | null | undefined,
  module: string,
  submodule: string,
): boolean {
  return canPerform(permissions, module, submodule, "import");
}

/**
 * Dot-path helper: "module.submodule.action" or try alternatives.
 * Kept for nav/route maps that still use string keys.
 */
export function hasPermission(
  permissions: WebPermissionTree | null | undefined,
  permission: string,
): boolean {
  if (!permissions || !permission) return false;
  const parts = permission.split(".").filter(Boolean);
  if (parts.length < 2) return false;

  if (parts.length === 2) {
    // module.action — treat as any submodule under module with that action
    const [module, action] = parts;
    const mod = getModuleNode(permissions, module);
    if (!mod) return false;
    for (const [sub, actions] of Object.entries(mod)) {
      if (canPerform(permissions, module, sub, action)) return true;
    }
    return false;
  }

  const [module, submodule, ...rest] = parts;
  return canPerform(permissions, module, submodule, rest.join("."));
}

export function hasAnyPermission(
  permissions: WebPermissionTree | null | undefined,
  required: string[],
): boolean {
  if (!required.length) return true;
  return required.some((p) => hasPermission(permissions, p));
}

export function hasAllPermissions(
  permissions: WebPermissionTree | null | undefined,
  required: string[],
): boolean {
  if (!required.length) return true;
  return required.every((p) => hasPermission(permissions, p));
}

/** True if any of the module/submodule candidates allow the action. */
export function canAny(
  permissions: WebPermissionTree | null | undefined,
  candidates: Array<{ module: string; submodule: string }>,
  action: PermissionAction | string = "view",
): boolean {
  if (!candidates.length) return true;
  return candidates.some((c) => canPerform(permissions, c.module, c.submodule, action));
}

export function normalizeWebPermissions(raw: unknown): WebPermissionTree {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  // Unwrap if API returned the full UserPermission row
  const maybeWrapped = raw as Record<string, unknown>;
  const tree =
    maybeWrapped.web_permission && typeof maybeWrapped.web_permission === "object"
      ? maybeWrapped.web_permission
      : raw;

  if (!tree || typeof tree !== "object" || Array.isArray(tree)) return {};

  const out: WebPermissionTree = {};
  for (const [mod, subs] of Object.entries(tree as Record<string, unknown>)) {
    // Backend stores auto-lookup bookkeeping under __meta — never treat as an app module.
    if (mod === "__meta") continue;
    if (!subs || typeof subs !== "object" || Array.isArray(subs)) continue;
    const canonicalMod = canonicalizeModuleId(mod);
    if (!out[canonicalMod]) out[canonicalMod] = {};
    for (const [sub, actions] of Object.entries(subs as Record<string, unknown>)) {
      // Drop legacy alias keys so incomplete UI revoke (canonical cleared, alias left)
      // no longer keeps the parent module unlocked.
      if (isLegacySubmoduleKey(canonicalMod, sub) || isLegacySubmoduleKey(mod, sub)) {
        continue;
      }
      if (!actions || typeof actions !== "object" || Array.isArray(actions)) continue;
      const normalized: Record<string, boolean> = {};
      for (const [action, enabled] of Object.entries(actions as Record<string, unknown>)) {
        if (enabled !== true) continue;
        const key = action.toLowerCase() === "update" ? "edit" : action;
        normalized[key] = true;
      }
      if (!Object.keys(normalized).length) continue;
      const existing = out[canonicalMod][sub] ?? {};
      out[canonicalMod][sub] = { ...existing, ...normalized };
    }
  }
  return out;
}
