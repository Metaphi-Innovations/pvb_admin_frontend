// ── Types ─────────────────────────────────────────────────────────────────────

export type GeoLevel =
  | "Country"
  | "Zone"
  | "State"
  | "Region"
  | "Area"
  | "Territory"
  | "Locality"
  | "None";

export const GEO_LEVELS: GeoLevel[] = [
  "Country",
  "Zone",
  "State",
  "Region",
  "Area",
  "Territory",
  "Locality",
  "None",
];

/** Higher number = higher in hierarchy (broader scope). None = 0 (not in hierarchy). */
export const GEO_LEVEL_ORDER: Record<GeoLevel, number> = {
  Country:   8,
  Zone:      7,
  State:     6,
  Region:    5,
  Area:      4,
  Territory: 3,
  Locality:  2,
  None:      0,
};

export const GEO_LEVEL_LABEL: Record<GeoLevel, string> = {
  Country:   "Country",
  Zone:      "Zone",
  State:     "State",
  Region:    "Region",
  Area:      "Area",
  Territory: "Territory",
  Locality:  "Locality",
  None:      "None (Functional)",
};

export interface ApprovalStep {
  /** Client-only stable key for React rendering. */
  uid: string;
  roleId: number;
  roleName: string;
}

export interface Role {
  id: number;
  roleName: string;
  description: string;
  geoLevel: GeoLevel;
  approvalChain: ApprovalStep[];
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

// ── Storage key ───────────────────────────────────────────────────────────────
const STORAGE_KEY   = "ds_roles_master";
const ID_KEY        = "ds_roles_next_id";
const VERSION_KEY   = "ds_roles_version";
const STORAGE_VER   = "v2"; // bump this whenever SEED_ROLES changes

// ── Helpers ───────────────────────────────────────────────────────────────────
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function makeUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nextRoleId(roles: Role[]): number {
  if (typeof window === "undefined") return 13;
  const stored = parseInt(localStorage.getItem(ID_KEY) ?? "0", 10);
  const maxFromData = roles.reduce((m, r) => Math.max(m, r.id), 0);
  return Math.max(stored, maxFromData) + 1;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_ROLES: Role[] = [
  {
    id: 1,
    roleName: "TM",
    description: "Manages sales in assigned territory. Front-line sales representative.",
    geoLevel: "Territory",
    approvalChain: [
      { uid: "s1-1", roleId: 3, roleName: "ASM" },
      { uid: "s1-2", roleId: 4, roleName: "RSM" },
      { uid: "s1-3", roleId: 5, roleName: "ZSM" },
      { uid: "s1-4", roleId: 6, roleName: "NSM" },
    ],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 2,
    roleName: "FMO",
    description: "Manages marketing activities in territory. Field Marketing Officer.",
    geoLevel: "Territory",
    approvalChain: [
      { uid: "s2-1", roleId: 3, roleName: "ASM" },
      { uid: "s2-2", roleId: 4, roleName: "RSM" },
      { uid: "s2-3", roleId: 5, roleName: "ZSM" },
      { uid: "s2-4", roleId: 6, roleName: "NSM" },
    ],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 3,
    roleName: "ASM",
    description: "Manages sales across multiple territories. Area Sales Manager.",
    geoLevel: "Area",
    approvalChain: [
      { uid: "s3-1", roleId: 4, roleName: "RSM" },
      { uid: "s3-2", roleId: 5, roleName: "ZSM" },
      { uid: "s3-3", roleId: 6, roleName: "NSM" },
    ],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 4,
    roleName: "RSM",
    description: "Manages sales across multiple areas. Regional Sales Manager.",
    geoLevel: "Region",
    approvalChain: [
      { uid: "s4-1", roleId: 5, roleName: "ZSM" },
      { uid: "s4-2", roleId: 6, roleName: "NSM" },
    ],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 5,
    roleName: "ZSM",
    description: "Manages sales across the entire zone. Zonal Sales Manager.",
    geoLevel: "Zone",
    approvalChain: [
      { uid: "s5-1", roleId: 6, roleName: "NSM" },
    ],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 6,
    roleName: "NSM",
    description: "Head of all national sales operations. Top-level sales role.",
    geoLevel: "Country",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 7,
    roleName: "DO",
    description: "On-ground operations and last-mile distribution officer.",
    geoLevel: "Locality",
    approvalChain: [
      { uid: "s7-1", roleId: 1, roleName: "TM" },
      { uid: "s7-1b", roleId: 2, roleName: "FMO" },
      { uid: "s7-2", roleId: 3, roleName: "ASM" },
      { uid: "s7-3", roleId: 4, roleName: "RSM" },
      { uid: "s7-4", roleId: 5, roleName: "ZSM" },
      { uid: "s7-5", roleId: 6, roleName: "NSM" },
    ],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 8,
    roleName: "Intern",
    description: "Intern in field operations. Supervised by Territory Manager.",
    geoLevel: "Locality",
    approvalChain: [
      { uid: "s8-1", roleId: 1, roleName: "TM" },
      { uid: "s8-1b", roleId: 2, roleName: "FMO" },
      { uid: "s8-2", roleId: 3, roleName: "ASM" },
      { uid: "s8-3", roleId: 4, roleName: "RSM" },
      { uid: "s8-4", roleId: 5, roleName: "ZSM" },
      { uid: "s8-5", roleId: 6, roleName: "NSM" },
    ],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 9,
    roleName: "HR Manager",
    description: "Human resources management. Handles recruitment, payroll, and employee relations.",
    geoLevel: "None",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 10,
    roleName: "Accounts Manager",
    description: "Financial and accounts management. Manages ledgers, invoices, and reconciliation.",
    geoLevel: "None",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 11,
    roleName: "Procurement Manager",
    description: "Procurement and vendor management. Handles purchase orders and GRN.",
    geoLevel: "None",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
  {
    id: 12,
    roleName: "Order Manager",
    description: "Order management and fulfillment. Manages sales orders end-to-end.",
    geoLevel: "None",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
  },
];

// ── Mock user counts per role (in real app: DB query) ─────────────────────────
export const MOCK_USER_COUNTS: Record<number, number> = {
  1: 8,   // TM
  2: 3,   // FMO
  3: 4,   // ASM
  4: 2,   // RSM
  5: 1,   // ZSM
  6: 1,   // NSM
  7: 5,   // DO
  8: 4,   // Intern
  9: 2,   // HR Manager
  10: 1,  // Accounts Manager
  11: 0,  // Procurement Manager
  12: 0,  // Order Manager
};

// ── LocalStorage persistence ──────────────────────────────────────────────────
export function loadRoles(): Role[] {
  if (typeof window === "undefined") return SEED_ROLES;
  try {
    // Version guard — bust stale cache whenever seed data changes
    if (localStorage.getItem(VERSION_KEY) !== STORAGE_VER) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ID_KEY);
      localStorage.setItem(VERSION_KEY, STORAGE_VER);
      return SEED_ROLES;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_ROLES;
    return JSON.parse(raw) as Role[];
  } catch {
    return SEED_ROLES;
  }
}

export function saveRoles(roles: Role[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  const maxId = roles.reduce((m, r) => Math.max(m, r.id), 0);
  localStorage.setItem(ID_KEY, String(maxId));
}

// ── Business logic helpers ────────────────────────────────────────────────────

/**
 * Returns roles that are valid as approvers for a given geography level.
 * Approver must have a geoLevel strictly higher in the hierarchy.
 */
export function getValidApproverRoles(
  allRoles: Role[],
  currentGeoLevel: GeoLevel,
  excludeRoleId?: number,
): Role[] {
  if (currentGeoLevel === "None" || currentGeoLevel === "Country") return [];
  const currentOrder = GEO_LEVEL_ORDER[currentGeoLevel];
  return allRoles.filter(
    r =>
      r.id !== excludeRoleId &&
      r.geoLevel !== "None" &&
      GEO_LEVEL_ORDER[r.geoLevel] > currentOrder &&
      r.status === "active",
  );
}

/** True if the geoLevel requires an approval chain (NOT None and NOT Country). */
export function requiresApprovalChain(geoLevel: GeoLevel): boolean {
  return geoLevel !== "None" && geoLevel !== "Country";
}

/** Validate a single approval step against the current role's geo level. */
export function isValidApprover(
  approverRole: Role,
  currentGeoLevel: GeoLevel,
): boolean {
  if (currentGeoLevel === "None" || approverRole.geoLevel === "None") return false;
  return GEO_LEVEL_ORDER[approverRole.geoLevel] > GEO_LEVEL_ORDER[currentGeoLevel];
}

/** Format the approval chain as a short display string. */
export function formatChain(chain: ApprovalStep[], maxShow = 4): string {
  if (chain.length === 0) return "None";
  const names = chain.map(s => s.roleName);
  if (names.length <= maxShow) return names.join(" → ");
  return `${names.slice(0, maxShow - 1).join(" → ")} → … (${names.length} steps)`;
}
