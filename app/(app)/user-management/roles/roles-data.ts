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
  "Country", "Zone", "State", "Region", "Area", "Territory", "Locality", "None",
];

export const GEO_LEVEL_ORDER: Record<GeoLevel, number> = {
  Country: 8, Zone: 7, State: 6, Region: 5,
  Area: 4, Territory: 3, Locality: 2, None: 0,
};

export interface ApprovalStep {
  uid: string;
  roleId: number;
  roleName: string;
}

export interface Role {
  id: number;
  roleName: string;
  departmentId: number | null;
  department: string;
  description: string;
  /** Geography level for field hierarchy mapping. "None" = non-field role. */
  geoLevel: GeoLevel;
  /**
   * Optional approval chain. Empty array = no approval required.
   * Can be configured at any time — nothing is mandatory.
   */
  approvalChain: ApprovalStep[];
  status: "active" | "inactive" | "archived";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

// ── Mock departments ──────────────────────────────────────────────────────────
export const DEPARTMENTS = [
  { id: 1, name: "Sales" },
  { id: 2, name: "HR" },
  { id: 3, name: "Accounts" },
  { id: 4, name: "Procurement" },
  { id: 5, name: "Field Force" },
  { id: 6, name: "Operations" },
];

// ── Mock user counts per role ─────────────────────────────────────────────────
export const MOCK_USER_COUNTS: Record<number, number> = {
  1: 3,   // Sales Manager
  2: 8,   // Sales Executive
  3: 2,   // KAM
  4: 1,   // SPM
  5: 2,   // HR Admin
  6: 1,   // Accountant
  7: 1,   // Procurement Lead
  8: 5,   // Field Agent
  9: 0,   // TM
  10: 0,  // ASM
  11: 0,  // RSM
};

// ── Seed data ─────────────────────────────────────────────────────────────────
export const SEED_ROLES: Role[] = [
  // ── Sales ────────────────────────────────────────────────────────────────
  {
    id: 1,
    roleName: "Sales Manager",
    departmentId: 1,
    department: "Sales",
    description: "Manages regional sales targets and team performance.",
    geoLevel: "State",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-04-15",
    updatedBy: "Admin",
    updatedDate: "2026-04-15",
  },
  {
    id: 2,
    roleName: "Sales Executive",
    departmentId: 1,
    department: "Sales",
    description: "Handles sales activities and customer account management.",
    geoLevel: "Territory",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-04-20",
    updatedBy: "Admin",
    updatedDate: "2026-04-20",
  },
  {
    id: 3,
    roleName: "KAM",
    departmentId: 1,
    department: "Sales",
    description: "Key Account Manager — owns strategic customer relationships.",
    geoLevel: "None",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-05-01",
    updatedBy: "Admin",
    updatedDate: "2026-05-01",
  },
  {
    id: 4,
    roleName: "SPM",
    departmentId: 1,
    department: "Sales",
    description: "Sales Planning Manager — handles forecasting, target setting, and analytics.",
    geoLevel: "None",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-05-01",
    updatedBy: "Admin",
    updatedDate: "2026-05-01",
  },
  // ── HR ───────────────────────────────────────────────────────────────────
  {
    id: 5,
    roleName: "HR Admin",
    departmentId: 2,
    department: "HR",
    description: "Human resources administration — recruitment, payroll, compliance.",
    geoLevel: "None",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-04-25",
    updatedBy: "Admin",
    updatedDate: "2026-04-25",
  },
  // ── Accounts ─────────────────────────────────────────────────────────────
  {
    id: 6,
    roleName: "Accountant",
    departmentId: 3,
    department: "Accounts",
    description: "Finance accountant handling ledger, reconciliation and reporting.",
    geoLevel: "None",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-25",
    updatedBy: "Admin",
    updatedDate: "2026-05-10",
  },
  // ── Procurement ──────────────────────────────────────────────────────────
  {
    id: 7,
    roleName: "Procurement Lead",
    departmentId: 4,
    department: "Procurement",
    description: "Manages purchase orders, vendor relations and GRN.",
    geoLevel: "None",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-05-02",
    updatedBy: "Admin",
    updatedDate: "2026-05-02",
  },
  // ── Field Force ──────────────────────────────────────────────────────────
  {
    id: 8,
    roleName: "Field Agent",
    departmentId: 5,
    department: "Field Force",
    description: "On-ground field operations and last-mile distribution.",
    geoLevel: "Locality",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 9,
    roleName: "TM",
    departmentId: 5,
    department: "Field Force",
    description: "Territory Manager — manages a defined sales territory.",
    geoLevel: "Territory",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 10,
    roleName: "ASM",
    departmentId: 5,
    department: "Field Force",
    description: "Area Sales Manager — oversees multiple territories.",
    geoLevel: "Area",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 11,
    roleName: "RSM",
    departmentId: 5,
    department: "Field Force",
    description: "Regional Sales Manager — manages multiple areas.",
    geoLevel: "Region",
    approvalChain: [],
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
];

// ── localStorage persistence ──────────────────────────────────────────────────
const STORAGE_KEY = "ds_um_roles";
const ID_KEY      = "ds_um_roles_next_id";
const VERSION_KEY = "ds_um_roles_version";
const STORAGE_VER = "v1";

export function loadRoles(): Role[] {
  if (typeof window === "undefined") return SEED_ROLES;
  try {
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

export function nextRoleId(): number {
  if (typeof window === "undefined") return SEED_ROLES.length + 1;
  const stored = parseInt(localStorage.getItem(ID_KEY) ?? "0", 10);
  return Math.max(stored, SEED_ROLES.length) + 1;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Business logic helpers ────────────────────────────────────────────────────

/**
 * Returns roles that are valid approvers for the given geo level.
 * An approver must be at a strictly higher geo level.
 * If approval is not needed, returns empty array.
 */
export function getValidApproverRoles(
  allRoles: Role[],
  currentGeoLevel: GeoLevel,
  excludeRoleId?: number,
): Role[] {
  if (currentGeoLevel === "None" || currentGeoLevel === "Country") return [];
  const currentOrder = GEO_LEVEL_ORDER[currentGeoLevel];
  return allRoles.filter(r =>
    r.id !== excludeRoleId &&
    r.geoLevel !== "None" &&
    GEO_LEVEL_ORDER[r.geoLevel] > currentOrder &&
    r.status === "active",
  );
}

