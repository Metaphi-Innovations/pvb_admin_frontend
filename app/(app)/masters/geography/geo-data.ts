// ── Geography Master — shared types, seed data, storage helpers ───────────────

export type GeoLevel =
  | "Zone"
  | "Region"
  | "State"
  | "Area"
  | "Territory"
  | "District"
  | "City"
  | "Town"
  | "Pincode";

export interface GeoNode {
  id: number;
  level: GeoLevel;
  name: string;
  parentId: number | null;
  pincode: string;
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export const DEFAULT_GEO_USER = "Admin";

// ── Constants ─────────────────────────────────────────────────────────────────
export const LEVELS: GeoLevel[] = [
  "Zone",
  "Region",
  "State",
  "Area",
  "Territory",
  "District",
  "City",
  "Town",
  "Pincode",
];

export const LEVEL_INDEX: Record<GeoLevel, number> = {
  Zone: 0,
  Region: 1,
  State: 2,
  Area: 3,
  Territory: 4,
  District: 5,
  City: 6,
  Town: 7,
  Pincode: 8,
};

export const PARENT_LEVEL: Record<GeoLevel, GeoLevel | null> = {
  Zone: null,
  Region: "Zone",
  State: "Region",
  Area: "State",
  Territory: "Area",
  District: "Territory",
  City: "District",
  Town: "City",
  Pincode: "Town",
};

export const CHILD_LEVEL: Record<GeoLevel, GeoLevel | null> = {
  Zone: "Region",
  Region: "State",
  State: "Area",
  Area: "Territory",
  Territory: "District",
  District: "City",
  City: "Town",
  Town: "Pincode",
  Pincode: null,
};

/** Bump when hierarchy or schema changes — triggers localStorage reset */
export const GEO_SCHEMA_VERSION = 3;

function seedNode(
  partial: Omit<GeoNode, "createdBy" | "updatedBy"> & Partial<Pick<GeoNode, "createdBy" | "updatedBy">>,
): GeoNode {
  return {
    createdBy: partial.createdBy ?? DEFAULT_GEO_USER,
    updatedBy: partial.updatedBy ?? DEFAULT_GEO_USER,
    ...partial,
  };
}

// ── Seed data ─────────────────────────────────────────────────────────────────
export const SEED_NODES: GeoNode[] = [
  // West Zone chain
  seedNode({ id: 1, level: "Zone", name: "West Zone", parentId: null, pincode: "", status: "active", createdDate: "2024-01-01", updatedDate: "2024-01-01" }),
  seedNode({ id: 2, level: "Zone", name: "South Zone", parentId: null, pincode: "", status: "active", createdDate: "2024-01-01", updatedDate: "2024-01-01" }),
  seedNode({ id: 3, level: "Region", name: "Maharashtra Region", parentId: 1, pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" }),
  seedNode({ id: 4, level: "Region", name: "Karnataka Region", parentId: 2, pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" }),
  seedNode({ id: 5, level: "State", name: "Maharashtra State", parentId: 3, pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" }),
  seedNode({ id: 6, level: "State", name: "Karnataka State", parentId: 4, pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" }),
  seedNode({ id: 7, level: "Area", name: "Pune Area", parentId: 5, pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" }),
  seedNode({ id: 8, level: "Area", name: "Bengaluru Area", parentId: 6, pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" }),
  seedNode({ id: 9, level: "Territory", name: "West Territory", parentId: 7, pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" }),
  seedNode({ id: 10, level: "Territory", name: "South Territory", parentId: 8, pincode: "", status: "inactive", createdDate: "2024-01-04", updatedDate: "2024-06-01", updatedBy: "System Admin" }),
  seedNode({ id: 11, level: "District", name: "Pune District", parentId: 9, pincode: "", status: "active", createdDate: "2024-01-05", updatedDate: "2024-01-05" }),
  seedNode({ id: 12, level: "District", name: "Bengaluru District", parentId: 10, pincode: "", status: "inactive", createdDate: "2024-01-05", updatedDate: "2024-06-01", updatedBy: "System Admin" }),
  seedNode({ id: 13, level: "City", name: "Pune City", parentId: 11, pincode: "", status: "active", createdDate: "2024-01-05", updatedDate: "2024-01-05" }),
  seedNode({ id: 14, level: "City", name: "Bengaluru City", parentId: 12, pincode: "", status: "inactive", createdDate: "2024-01-05", updatedDate: "2024-06-01", updatedBy: "System Admin" }),
  seedNode({ id: 15, level: "Town", name: "Kothrud Town", parentId: 13, pincode: "", status: "active", createdDate: "2024-01-06", updatedDate: "2024-01-06" }),
  seedNode({ id: 16, level: "Town", name: "Whitefield Town", parentId: 14, pincode: "", status: "inactive", createdDate: "2024-01-06", updatedDate: "2024-06-01", updatedBy: "System Admin" }),
  seedNode({ id: 17, level: "Pincode", name: "411038", parentId: 15, pincode: "411038", status: "active", createdDate: "2024-01-07", updatedDate: "2024-01-07" }),
  seedNode({ id: 18, level: "Pincode", name: "560066", parentId: 16, pincode: "560066", status: "inactive", createdDate: "2024-01-07", updatedDate: "2024-06-01", updatedBy: "System Admin" }),
  // Extra pincodes for pagination testing
  seedNode({ id: 19, level: "Pincode", name: "411001", parentId: 15, pincode: "411001", status: "active", createdDate: "2024-02-01", updatedDate: "2024-02-01" }),
  seedNode({ id: 20, level: "Pincode", name: "411002", parentId: 15, pincode: "411002", status: "active", createdDate: "2024-02-01", updatedDate: "2024-02-01" }),
  seedNode({ id: 21, level: "Pincode", name: "411003", parentId: 15, pincode: "411003", status: "active", createdDate: "2024-02-02", updatedDate: "2024-02-02" }),
  // East Zone chain (full 9-level hierarchy)
  seedNode({ id: 22, level: "Zone", name: "East Zone", parentId: null, pincode: "", status: "active", createdDate: "2024-03-01", updatedDate: "2024-03-01" }),
  seedNode({ id: 23, level: "Region", name: "West Bengal Region", parentId: 22, pincode: "", status: "active", createdDate: "2024-03-01", updatedDate: "2024-03-01" }),
  seedNode({ id: 24, level: "State", name: "West Bengal State", parentId: 23, pincode: "", status: "active", createdDate: "2024-03-02", updatedDate: "2024-03-02" }),
  seedNode({ id: 25, level: "Area", name: "Kolkata Area", parentId: 24, pincode: "", status: "active", createdDate: "2024-03-02", updatedDate: "2024-03-02" }),
  seedNode({ id: 26, level: "Territory", name: "Central Territory", parentId: 25, pincode: "", status: "active", createdDate: "2024-03-03", updatedDate: "2024-03-03" }),
  seedNode({ id: 27, level: "District", name: "Kolkata District", parentId: 26, pincode: "", status: "active", createdDate: "2024-03-03", updatedDate: "2024-03-03" }),
  seedNode({ id: 28, level: "City", name: "Kolkata City", parentId: 27, pincode: "", status: "active", createdDate: "2024-03-04", updatedDate: "2024-03-04" }),
  seedNode({ id: 29, level: "Town", name: "Salt Lake Town", parentId: 28, pincode: "", status: "active", createdDate: "2024-03-04", updatedDate: "2024-03-04" }),
  seedNode({ id: 30, level: "Pincode", name: "700091", parentId: 29, pincode: "700091", status: "active", createdDate: "2024-03-05", updatedDate: "2024-03-05" }),
];

// ── localStorage helpers ──────────────────────────────────────────────────────
const GEO_KEY = "ds_geo_nodes";
const GEO_VERSION_KEY = "ds_geo_schema_version";

function normalizeNode(raw: Record<string, unknown>): GeoNode {
  return {
    id: raw.id as number,
    level: raw.level as GeoLevel,
    name: raw.name as string,
    parentId: raw.parentId as number | null,
    pincode: (raw.pincode as string) ?? "",
    status: (raw.status as "active" | "inactive") ?? "active",
    createdBy: (raw.createdBy as string) ?? DEFAULT_GEO_USER,
    createdDate: (raw.createdDate as string) ?? todayStr(),
    updatedBy: (raw.updatedBy as string) ?? DEFAULT_GEO_USER,
    updatedDate: (raw.updatedDate as string) ?? todayStr(),
  };
}

function needsSchemaReset(parsed: unknown[]): boolean {
  const storedVersion =
    typeof window !== "undefined"
      ? Number(localStorage.getItem(GEO_VERSION_KEY) ?? 0)
      : 0;
  if (storedVersion < 2) return true;
  if (parsed.some((n) => (n as { level?: string }).level === "Locality")) return true;
  if (parsed.some((n) => "code" in (n as object))) return true;
  const levels = new Set(parsed.map((n) => (n as { level?: string }).level));
  if (!levels.has("District") || !levels.has("City") || !levels.has("Town")) return true;
  return false;
}

export function loadGeoNodes(): GeoNode[] {
  if (typeof window === "undefined") return [...SEED_NODES];
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      if (needsSchemaReset(parsed)) {
        localStorage.setItem(GEO_KEY, JSON.stringify(SEED_NODES));
        localStorage.setItem(GEO_VERSION_KEY, String(GEO_SCHEMA_VERSION));
        return [...SEED_NODES];
      }
      const nodes = parsed.map((n) => normalizeNode(n as Record<string, unknown>));
      if (Number(localStorage.getItem(GEO_VERSION_KEY) ?? 0) < GEO_SCHEMA_VERSION) {
        localStorage.setItem(GEO_VERSION_KEY, String(GEO_SCHEMA_VERSION));
      }
      return nodes;
    }
  } catch {
    /* ignore */
  }
  localStorage.setItem(GEO_KEY, JSON.stringify(SEED_NODES));
  localStorage.setItem(GEO_VERSION_KEY, String(GEO_SCHEMA_VERSION));
  return [...SEED_NODES];
}

export function saveGeoNodes(nodes: GeoNode[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(nodes));
    localStorage.setItem(GEO_VERSION_KEY, String(GEO_SCHEMA_VERSION));
  } catch {
    /* ignore */
  }
}

// ── Utility helpers ───────────────────────────────────────────────────────────
export function nextGeoId(nodes: GeoNode[]): number {
  return Math.max(0, ...nodes.map((n) => n.id)) + 1;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns [root → ... → node] inclusive */
export function getAncestorPath(node: GeoNode, nodes: GeoNode[]): GeoNode[] {
  const path: GeoNode[] = [];
  let cur: GeoNode | undefined = node;
  while (cur) {
    path.unshift(cur);
    if (cur.parentId === null) break;
    cur = nodes.find((n) => n.id === cur!.parentId);
  }
  return path;
}

/** Direct children only */
export function getChildren(nodeId: number, nodes: GeoNode[]): GeoNode[] {
  return nodes.filter((n) => n.parentId === nodeId);
}

/** All descendants at any depth */
export function getAllDescendants(nodeId: number, nodes: GeoNode[]): GeoNode[] {
  const result: GeoNode[] = [];
  function walk(id: number) {
    for (const child of getChildren(id, nodes)) {
      result.push(child);
      walk(child.id);
    }
  }
  walk(nodeId);
  return result;
}

/** Active children at a specific level under a parent subtree */
export function getActiveChildrenAtLevel(
  parentId: number,
  childLevel: GeoLevel,
  nodes: GeoNode[],
): GeoNode[] {
  const result: GeoNode[] = [];
  function walk(id: number) {
    for (const child of nodes.filter((n) => n.parentId === id && n.status === "active")) {
      if (child.level === childLevel) result.push(child);
      else if (LEVEL_INDEX[child.level] < LEVEL_INDEX[childLevel]) walk(child.id);
    }
  }
  walk(parentId);
  return result;
}

/** True if any descendant at any depth is active */
export function hasActiveDescendants(nodeId: number, nodes: GeoNode[]): boolean {
  for (const child of nodes.filter((n) => n.parentId === nodeId)) {
    if (child.status === "active") return true;
    if (hasActiveDescendants(child.id, nodes)) return true;
  }
  return false;
}

/** Get nodes of a level that are descendants of an ancestor (by name match at ancestor level) */
export function getNodesUnderAncestor(
  ancestorLevel: GeoLevel,
  ancestorName: string,
  targetLevel: GeoLevel,
  nodes?: GeoNode[],
): GeoNode[] {
  const list = nodes ?? loadGeoNodes();
  const ancestor = list.find(
    (n) => n.level === ancestorLevel && n.name === ancestorName && n.status === "active",
  );
  if (!ancestor) return [];
  return getActiveChildrenAtLevel(ancestor.id, targetLevel, list);
}

/** Duplicate check under same parent */
export function findGeoDuplicate(
  level: GeoLevel,
  name: string,
  parentId: number | null,
  nodes: GeoNode[],
  excludeId?: number,
): GeoNode | undefined {
  const trimmed = name.trim().toLowerCase();
  return nodes.find(
    (n) =>
      n.id !== excludeId &&
      n.level === level &&
      n.parentId === parentId &&
      n.name.trim().toLowerCase() === trimmed,
  );
}

/** Validate parent change does not break hierarchy */
export function validateParentChange(
  node: GeoNode,
  newParentId: number | null,
  nodes: GeoNode[],
): string | null {
  const requiredParent = PARENT_LEVEL[node.level];

  if (requiredParent === null) {
    return newParentId !== null ? "Zone nodes cannot have a parent." : null;
  }
  if (newParentId === null) {
    return `Parent (${requiredParent}) is required for ${node.level}.`;
  }
  if (newParentId === node.id) {
    return "A node cannot be its own parent.";
  }

  const newParent = nodes.find((n) => n.id === newParentId);
  if (!newParent) return "Selected parent was not found.";
  if (newParent.level !== requiredParent) {
    return `Parent must be a ${requiredParent}, not ${newParent.level}.`;
  }
  if (newParent.status !== "active") {
    return `Parent "${newParent.name}" is inactive. Activate the parent first.`;
  }

  const descendants = getAllDescendants(node.id, nodes);
  if (descendants.some((d) => d.id === newParentId)) {
    return "Cannot move a node under one of its own descendants.";
  }

  return null;
}

// ── Delete helpers (soft delete with cascade) ─────────────────────────────────

export interface GeoDeletePreview {
  canDelete: boolean;
  reason?: string;
  descendantCount: number;
  activeDescendantCount: number;
}

export type GeoDeleteResult =
  | { ok: true; nodes: GeoNode[]; deactivatedCount: number }
  | { ok: false; reason: string };

/** Preview soft-delete impact */
export function getGeoDeletePreview(nodeId: number, nodes: GeoNode[]): GeoDeletePreview {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    return { canDelete: false, reason: "Geography node not found.", descendantCount: 0, activeDescendantCount: 0 };
  }

  const descendants = getAllDescendants(nodeId, nodes);
  const activeDescendantCount = descendants.filter((d) => d.status === "active").length;

  return {
    canDelete: true,
    descendantCount: descendants.length,
    activeDescendantCount,
  };
}

/**
 * Soft-delete a geography node and cascade-deactivate all descendants.
 */
export function deleteGeoNode(
  nodeId: number,
  nodes: GeoNode[],
  updatedBy = DEFAULT_GEO_USER,
): GeoDeleteResult {
  const preview = getGeoDeletePreview(nodeId, nodes);
  if (!preview.canDelete) {
    return { ok: false, reason: preview.reason ?? "Cannot delete this geography node." };
  }

  const idsToDeactivate = new Set([
    nodeId,
    ...getAllDescendants(nodeId, nodes).map((d) => d.id),
  ]);
  const today = todayStr();

  const updated = nodes.map((n) =>
    idsToDeactivate.has(n.id)
      ? { ...n, status: "inactive" as const, updatedDate: today, updatedBy }
      : n,
  );

  return { ok: true, nodes: updated, deactivatedCount: idsToDeactivate.size };
}

export function resolvePincodeLocation(
  pincode: string,
  nodes?: GeoNode[],
): { city: string; state: string; district: string } | null {
  const list = nodes ?? loadGeoNodes();
  const code = pincode.trim();
  if (!/^\d{6}$/.test(code)) return null;

  const pinNode = list.find(
    (n) => n.level === "Pincode" && n.pincode === code && n.status === "active",
  );
  if (!pinNode) return null;

  let city = "";
  let state = "";
  let district = "";
  let current: GeoNode | undefined = pinNode;

  while (current?.parentId != null) {
    const parent = list.find((n) => n.id === current!.parentId);
    if (!parent) break;
    if (parent.level === "City" || parent.level === "Town") {
      city = parent.name.replace(/\s+(City|Town)$/i, "");
    }
    if (parent.level === "District") {
      district = parent.name.replace(/\s+District$/i, "");
    }
    if (parent.level === "State") {
      state = parent.name.replace(/\s+State$/i, "");
    }
    current = parent;
  }

  if (!city && !state && !district) return null;
  return { city, state, district };
}
