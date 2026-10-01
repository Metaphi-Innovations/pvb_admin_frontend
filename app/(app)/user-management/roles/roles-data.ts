// ── Types ─────────────────────────────────────────────────────────────────────

export type GeoLevel =
  | "Country"
  | "Zone"
  | "Region"
  | "State"
  | "Area"
  | "Territory"
  | "District"
  | "City"
  | "Town"
  | "None";

export const GEO_LEVELS: GeoLevel[] = [
  "Country", "Zone", "Region", "State", "Area", "Territory", "District", "City", "Town", "None",
];

export const GEO_LEVEL_ORDER: Record<GeoLevel, number> = {
  Country: 10, Zone: 9, Region: 8, State: 7, Area: 6, Territory: 5,
  District: 4, City: 3, Town: 2, None: 0,
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
  { id: 1, name: "Accounts" },
  { id: 2, name: "HR" },
  { id: 3, name: "Procurement" },
  { id: 4, name: "Warehouse" },
  { id: 5, name: "Admin" },
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
  12: 0,  // ZSM
  13: 0,  // FMO
  14: 0,  // DO
  15: 0,  // Intern
};

// ── Seed data ─────────────────────────────────────────────────────────────────
export const SEED_ROLES: Role[] = [
  // ── Sales (legacy — department removed) ─────────────────────────────────
  {
    id: 1,
    roleName: "Sales Manager",
    departmentId: null,
    department: "—",
    description: "Manages regional sales targets and team performance.",
    geoLevel: "State",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-15",
    updatedBy: "Admin",
    updatedDate: "2026-04-15",
  },
  {
    id: 2,
    roleName: "Sales Executive",
    departmentId: null,
    department: "—",
    description: "Handles sales activities and customer account management.",
    geoLevel: "Territory",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-20",
    updatedBy: "Admin",
    updatedDate: "2026-04-20",
  },
  {
    id: 3,
    roleName: "KAM",
    departmentId: null,
    department: "—",
    description: "Key Account Manager — owns strategic customer relationships.",
    geoLevel: "None",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-05-01",
    updatedBy: "Admin",
    updatedDate: "2026-05-01",
  },
  {
    id: 4,
    roleName: "SPM",
    departmentId: null,
    department: "—",
    description: "Sales Planning Manager — handles forecasting, target setting, and analytics.",
    geoLevel: "None",
    approvalChain: [],
    status: "inactive",
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
    departmentId: 1,
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
    departmentId: 3,
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
  // ── Field Force (legacy — department removed) ────────────────────────────
  {
    id: 8,
    roleName: "Field Agent",
    departmentId: null,
    department: "—",
    description: "On-ground field operations and last-mile distribution.",
    geoLevel: "Town",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 9,
    roleName: "TM",
    departmentId: null,
    department: "—",
    description: "Territory Manager — manages a defined sales territory.",
    geoLevel: "Territory",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 10,
    roleName: "ASM",
    departmentId: null,
    department: "—",
    description: "Area Sales Manager — oversees multiple territories.",
    geoLevel: "Area",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 11,
    roleName: "RSM",
    departmentId: null,
    department: "—",
    description: "Regional Sales Manager — manages multiple areas.",
    geoLevel: "Region",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 12,
    roleName: "ZSM",
    departmentId: null,
    department: "—",
    description: "Zonal Sales Manager — manages multiple regions.",
    geoLevel: "Zone",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 13,
    roleName: "FMO",
    departmentId: null,
    department: "—",
    description: "Field Marketing Officer — on-ground marketing activities.",
    geoLevel: "Territory",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 14,
    roleName: "DO",
    departmentId: null,
    department: "—",
    description: "District Officer — district-level field operations.",
    geoLevel: "Area",
    approvalChain: [],
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-04-10",
    updatedBy: "Admin",
    updatedDate: "2026-04-10",
  },
  {
    id: 15,
    roleName: "Intern",
    departmentId: null,
    department: "—",
    description: "Sales Force intern — limited travel and expense eligibility.",
    geoLevel: "Town",
    approvalChain: [],
    status: "inactive",
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
const STORAGE_VER = "v6";

export function loadRoles(): Role[] {
  if (typeof window === "undefined") return SEED_ROLES;
  try {
    if (localStorage.getItem(VERSION_KEY) !== STORAGE_VER) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ID_KEY);
      localStorage.removeItem("ds_role_permission_templates");
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

// ── Permission Template Persistence ───────────────────────────────────────────
const PERM_TEMPLATES_KEY = "ds_role_permission_templates";

export interface RolePermissionTemplate {
  roleId: number;
  accessType: "web" | "mobile" | "none";
  webPermissions: any;
  mobilePermissions: any;
  createdAt?: string;
  updatedAt?: string;
}

function getSeedTemplates(): Record<number, RolePermissionTemplate> {
  const templates: Record<number, RolePermissionTemplate> = {};
  const today = "2026-06-15";

  for (let i = 1; i <= 15; i++) {
    templates[i] = {
      roleId: i,
      accessType: "none",
      webPermissions: [],
      mobilePermissions: [],
      createdAt: today,
      updatedAt: today,
    };
  }

  // 1: Sales Manager
  templates[1].accessType = "web";
  templates[1].webPermissions = [
    { moduleKey: "sales.salesOrder", actionKey: "view" },
    { moduleKey: "sales.salesOrder", actionKey: "create" },
    { moduleKey: "sales.salesOrder", actionKey: "edit" },
    { moduleKey: "sales.salesOrder", actionKey: "approve" },
    { moduleKey: "sales.salesOrder", actionKey: "export" },
    { moduleKey: "sales.invoice", actionKey: "view" },
    { moduleKey: "sales.invoice", actionKey: "create" },
    { moduleKey: "sales.invoice", actionKey: "edit" },
    { moduleKey: "sales.invoice", actionKey: "approve" },
    { moduleKey: "sales.invoice", actionKey: "export" },
    { moduleKey: "sales.dispatch", actionKey: "view" },
    { moduleKey: "sales.dispatch", actionKey: "create" },
    { moduleKey: "sales.dispatch", actionKey: "edit" },
    { moduleKey: "sales.dispatch", actionKey: "approve" },
    { moduleKey: "sales.dispatch", actionKey: "export" },
    { moduleKey: "sales.collections", actionKey: "view" },
    { moduleKey: "sales.collections", actionKey: "create" },
    { moduleKey: "sales.collections", actionKey: "edit" },
    { moduleKey: "sales.collections", actionKey: "approve" },
    { moduleKey: "sales.collections", actionKey: "export" },
    { moduleKey: "sales.targets", actionKey: "view" },
    { moduleKey: "sales.targets", actionKey: "create" },
    { moduleKey: "sales.targets", actionKey: "edit" },
    { moduleKey: "sales.targets", actionKey: "delete" },
    { moduleKey: "sales.targets", actionKey: "import" },
    { moduleKey: "sales.targets", actionKey: "export" },
    { moduleKey: "sales.beatPlan", actionKey: "view" },
    { moduleKey: "sales.beatPlan", actionKey: "create" },
    { moduleKey: "sales.beatPlan", actionKey: "edit" },
    { moduleKey: "sales.beatPlan", actionKey: "approve" },
    { moduleKey: "sales.beatPlan", actionKey: "export" },
    { moduleKey: "masters.customerMaster", actionKey: "view" },
    { moduleKey: "masters.customerMaster", actionKey: "create" },
    { moduleKey: "masters.customerMaster", actionKey: "edit" },
    { moduleKey: "masters.distributors", actionKey: "view" },
    { moduleKey: "masters.distributors", actionKey: "create" },
    { moduleKey: "masters.distributors", actionKey: "edit" },
    { moduleKey: "masters.distributors", actionKey: "export" },
    { moduleKey: "masters.retailers", actionKey: "view" },
    { moduleKey: "masters.retailers", actionKey: "create" },
    { moduleKey: "masters.retailers", actionKey: "edit" },
    { moduleKey: "masters.retailers", actionKey: "export" },
    { moduleKey: "reports.salesReports", actionKey: "view" },
    { moduleKey: "reports.salesReports", actionKey: "export" },
  ];

  // 2: Sales Executive
  templates[2].accessType = "web";
  templates[2].webPermissions = [
    { moduleKey: "sales.salesOrder", actionKey: "view" },
    { moduleKey: "sales.salesOrder", actionKey: "create" },
    { moduleKey: "sales.salesOrder", actionKey: "edit" },
    { moduleKey: "sales.invoice", actionKey: "view" },
    { moduleKey: "sales.invoice", actionKey: "create" },
    { moduleKey: "sales.collections", actionKey: "view" },
    { moduleKey: "sales.collections", actionKey: "create" },
    { moduleKey: "sales.collections", actionKey: "edit" },
    { moduleKey: "sales.beatPlan", actionKey: "view" },
    { moduleKey: "sales.beatPlan", actionKey: "create" },
    { moduleKey: "sales.beatPlan", actionKey: "edit" },
    { moduleKey: "masters.customerMaster", actionKey: "view" },
    { moduleKey: "masters.distributors", actionKey: "view" },
    { moduleKey: "masters.retailers", actionKey: "view" },
  ];

  // 3: KAM
  templates[3].accessType = "web";
  templates[3].webPermissions = [
    { moduleKey: "masters.customerMaster", actionKey: "view" },
    { moduleKey: "masters.customerMaster", actionKey: "create" },
    { moduleKey: "masters.customerMaster", actionKey: "edit" },
    { moduleKey: "masters.distributors", actionKey: "view" },
    { moduleKey: "masters.retailers", actionKey: "view" },
    { moduleKey: "sales.salesOrder", actionKey: "view" },
    { moduleKey: "sales.salesOrder", actionKey: "create" },
    { moduleKey: "sales.salesOrder", actionKey: "edit" },
    { moduleKey: "sales.invoice", actionKey: "view" },
    { moduleKey: "sales.collections", actionKey: "view" },
  ];

  // 4: SPM
  templates[4].accessType = "web";
  templates[4].webPermissions = [
    { moduleKey: "sales.targets", actionKey: "view" },
    { moduleKey: "sales.targets", actionKey: "create" },
    { moduleKey: "sales.targets", actionKey: "edit" },
    { moduleKey: "sales.targets", actionKey: "delete" },
    { moduleKey: "sales.targets", actionKey: "import" },
    { moduleKey: "sales.targets", actionKey: "export" },
    { moduleKey: "reports.salesReports", actionKey: "view" },
    { moduleKey: "reports.salesReports", actionKey: "export" },
    { moduleKey: "reports.dashboards", actionKey: "view" },
    { moduleKey: "reports.dashboards", actionKey: "export" },
  ];

  // 5: HR Admin
  templates[5].accessType = "web";
  templates[5].webPermissions = [
    { moduleKey: "hr.employee", actionKey: "view" },
    { moduleKey: "hr.employee", actionKey: "create" },
    { moduleKey: "hr.employee", actionKey: "edit" },
    { moduleKey: "hr.employee", actionKey: "approve" },
    { moduleKey: "hr.employee", actionKey: "export" },
    { moduleKey: "hr.employee", actionKey: "import" },
    { moduleKey: "hr.attendance", actionKey: "view" },
    { moduleKey: "hr.attendance", actionKey: "create" },
    { moduleKey: "hr.attendance", actionKey: "edit" },
    { moduleKey: "hr.attendance", actionKey: "approve" },
    { moduleKey: "hr.attendance", actionKey: "export" },
    { moduleKey: "hr.leaveManagement", actionKey: "view" },
    { moduleKey: "hr.leaveManagement", actionKey: "create" },
    { moduleKey: "hr.leaveManagement", actionKey: "edit" },
    { moduleKey: "hr.leaveManagement", actionKey: "delete" },
    { moduleKey: "hr.leaveManagement", actionKey: "approve" },
    { moduleKey: "hr.leaveManagement", actionKey: "export" },
    { moduleKey: "hr.payroll", actionKey: "view" },
    { moduleKey: "hr.payroll", actionKey: "create" },
    { moduleKey: "hr.payroll", actionKey: "edit" },
    { moduleKey: "hr.payroll", actionKey: "approve" },
    { moduleKey: "hr.payroll", actionKey: "export" },
    { moduleKey: "hr.expenseClaims", actionKey: "view" },
    { moduleKey: "hr.expenseClaims", actionKey: "create" },
    { moduleKey: "hr.expenseClaims", actionKey: "edit" },
    { moduleKey: "hr.expenseClaims", actionKey: "delete" },
    { moduleKey: "hr.expenseClaims", actionKey: "approve" },
    { moduleKey: "hr.expenseClaims", actionKey: "export" },
    { moduleKey: "userManagement.geography", actionKey: "view" },
    { moduleKey: "userManagement.geography", actionKey: "create" },
    { moduleKey: "userManagement.geography", actionKey: "edit" },
    { moduleKey: "userManagement.geography", actionKey: "delete" },
    { moduleKey: "userManagement.geography", actionKey: "export" },
    { moduleKey: "userManagement.department", actionKey: "view" },
    { moduleKey: "userManagement.department", actionKey: "create" },
    { moduleKey: "userManagement.department", actionKey: "edit" },
    { moduleKey: "userManagement.department", actionKey: "delete" },
    { moduleKey: "userManagement.roles", actionKey: "view" },
    { moduleKey: "userManagement.roles", actionKey: "create" },
    { moduleKey: "userManagement.roles", actionKey: "edit" },
    { moduleKey: "userManagement.roles", actionKey: "delete" },
    { moduleKey: "userManagement.user", actionKey: "view" },
    { moduleKey: "userManagement.user", actionKey: "create" },
    { moduleKey: "userManagement.user", actionKey: "edit" },
    { moduleKey: "userManagement.user", actionKey: "delete" },
    { moduleKey: "userManagement.user", actionKey: "approve" },
    { moduleKey: "userManagement.user", actionKey: "export" },
    { moduleKey: "userManagement.user", actionKey: "import" },
    { moduleKey: "reports.hrReports", actionKey: "view" },
    { moduleKey: "reports.hrReports", actionKey: "export" },
  ];

  // 6: Accountant
  templates[6].accessType = "web";
  templates[6].webPermissions = [
    { moduleKey: "accounts.journalEntry", actionKey: "view" },
    { moduleKey: "accounts.journalEntry", actionKey: "create" },
    { moduleKey: "accounts.journalEntry", actionKey: "edit" },
    { moduleKey: "accounts.journalEntry", actionKey: "delete" },
    { moduleKey: "accounts.journalEntry", actionKey: "approve" },
    { moduleKey: "accounts.journalEntry", actionKey: "export" },
    { moduleKey: "accounts.paymentVoucher", actionKey: "view" },
    { moduleKey: "accounts.paymentVoucher", actionKey: "create" },
    { moduleKey: "accounts.paymentVoucher", actionKey: "edit" },
    { moduleKey: "accounts.paymentVoucher", actionKey: "delete" },
    { moduleKey: "accounts.paymentVoucher", actionKey: "approve" },
    { moduleKey: "accounts.paymentVoucher", actionKey: "export" },
    { moduleKey: "accounts.receiptVoucher", actionKey: "view" },
    { moduleKey: "accounts.receiptVoucher", actionKey: "create" },
    { moduleKey: "accounts.receiptVoucher", actionKey: "edit" },
    { moduleKey: "accounts.receiptVoucher", actionKey: "delete" },
    { moduleKey: "accounts.receiptVoucher", actionKey: "approve" },
    { moduleKey: "accounts.receiptVoucher", actionKey: "export" },
    { moduleKey: "accounts.chartOfAccounts", actionKey: "view" },
    { moduleKey: "accounts.chartOfAccounts", actionKey: "create" },
    { moduleKey: "accounts.chartOfAccounts", actionKey: "edit" },
    { moduleKey: "accounts.chartOfAccounts", actionKey: "delete" },
    { moduleKey: "accounts.chartOfAccounts", actionKey: "export" },
    { moduleKey: "accounts.ledger", actionKey: "view" },
    { moduleKey: "accounts.ledger", actionKey: "export" },
    { moduleKey: "accounts.outstanding", actionKey: "view" },
    { moduleKey: "accounts.outstanding", actionKey: "export" },
    { moduleKey: "accounts.accountReports", actionKey: "view" },
    { moduleKey: "accounts.accountReports", actionKey: "export" },
    { moduleKey: "procurement.purchaseRequisition", actionKey: "view" },
    { moduleKey: "procurement.purchaseOrder", actionKey: "view" },
    { moduleKey: "procurement.vendorBill", actionKey: "view" },
    { moduleKey: "procurement.vendorBill", actionKey: "approve" },
    { moduleKey: "procurement.vendorBill", actionKey: "export" },
    { moduleKey: "reports.accountsReports", actionKey: "view" },
    { moduleKey: "reports.accountsReports", actionKey: "export" },
  ];

  // 7: Procurement Lead
  templates[7].accessType = "web";
  templates[7].webPermissions = [
    { moduleKey: "procurement.purchaseRequisition", actionKey: "view" },
    { moduleKey: "procurement.purchaseRequisition", actionKey: "create" },
    { moduleKey: "procurement.purchaseRequisition", actionKey: "edit" },
    { moduleKey: "procurement.purchaseRequisition", actionKey: "delete" },
    { moduleKey: "procurement.purchaseRequisition", actionKey: "approve" },
    { moduleKey: "procurement.purchaseRequisition", actionKey: "export" },
    { moduleKey: "procurement.rfq", actionKey: "view" },
    { moduleKey: "procurement.rfq", actionKey: "create" },
    { moduleKey: "procurement.rfq", actionKey: "edit" },
    { moduleKey: "procurement.rfq", actionKey: "delete" },
    { moduleKey: "procurement.rfq", actionKey: "approve" },
    { moduleKey: "procurement.rfq", actionKey: "export" },
    { moduleKey: "procurement.purchaseOrder", actionKey: "view" },
    { moduleKey: "procurement.purchaseOrder", actionKey: "create" },
    { moduleKey: "procurement.purchaseOrder", actionKey: "edit" },
    { moduleKey: "procurement.purchaseOrder", actionKey: "delete" },
    { moduleKey: "procurement.purchaseOrder", actionKey: "approve" },
    { moduleKey: "procurement.purchaseOrder", actionKey: "export" },
    { moduleKey: "procurement.grn", actionKey: "view" },
    { moduleKey: "procurement.grn", actionKey: "create" },
    { moduleKey: "procurement.grn", actionKey: "edit" },
    { moduleKey: "procurement.grn", actionKey: "delete" },
    { moduleKey: "procurement.grn", actionKey: "approve" },
    { moduleKey: "procurement.grn", actionKey: "export" },
    { moduleKey: "procurement.vendorBill", actionKey: "view" },
    { moduleKey: "procurement.vendorBill", actionKey: "create" },
    { moduleKey: "procurement.vendorBill", actionKey: "edit" },
    { moduleKey: "procurement.vendorBill", actionKey: "delete" },
    { moduleKey: "procurement.vendorBill", actionKey: "approve" },
    { moduleKey: "procurement.vendorBill", actionKey: "export" },
    { moduleKey: "procurement.vendorReturn", actionKey: "view" },
    { moduleKey: "procurement.vendorReturn", actionKey: "create" },
    { moduleKey: "procurement.vendorReturn", actionKey: "edit" },
    { moduleKey: "procurement.vendorReturn", actionKey: "delete" },
    { moduleKey: "procurement.vendorReturn", actionKey: "approve" },
    { moduleKey: "procurement.vendorReturn", actionKey: "export" },
    { moduleKey: "procurement.vendorManagement", actionKey: "view" },
    { moduleKey: "procurement.vendorManagement", actionKey: "create" },
    { moduleKey: "procurement.vendorManagement", actionKey: "edit" },
    { moduleKey: "procurement.vendorManagement", actionKey: "delete" },
    { moduleKey: "procurement.vendorManagement", actionKey: "export" },
    { moduleKey: "procurement.stockLedger", actionKey: "view" },
    { moduleKey: "procurement.stockLedger", actionKey: "export" },
    { moduleKey: "masters.vendorCategory", actionKey: "view" },
    { moduleKey: "masters.vendorCategory", actionKey: "create" },
    { moduleKey: "masters.vendorCategory", actionKey: "edit" },
    { moduleKey: "masters.vendorCategory", actionKey: "delete" },
    { moduleKey: "masters.warehouseMaster", actionKey: "view" },
    { moduleKey: "masters.warehouseMaster", actionKey: "create" },
    { moduleKey: "masters.warehouseMaster", actionKey: "edit" },
    { moduleKey: "masters.warehouseMaster", actionKey: "delete" },
    { moduleKey: "masters.productMaster", actionKey: "view" },
    { moduleKey: "masters.productMaster", actionKey: "create" },
    { moduleKey: "masters.productMaster", actionKey: "edit" },
    { moduleKey: "masters.productMaster", actionKey: "delete" },
    { moduleKey: "reports.procurementReports", actionKey: "view" },
    { moduleKey: "reports.procurementReports", actionKey: "export" },
  ];

  // 8: Field Agent
  templates[8].accessType = "mobile";
  templates[8].mobilePermissions = [
    { moduleKey: "fieldOps.mobileLogin", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "create" },
    { moduleKey: "fieldOps.beatPlanning", actionKey: "view" },
    { moduleKey: "fieldOps.beatPlanning", actionKey: "create" },
    { moduleKey: "fieldOps.beatPlanExecution", actionKey: "view" },
    { moduleKey: "fieldOps.beatPlanExecution", actionKey: "create" },
    { moduleKey: "fieldOps.locationTracking", actionKey: "view" },
    { moduleKey: "fieldOps.locationTracking", actionKey: "create" },
    { moduleKey: "fieldOps.routeTracking", actionKey: "view" },
    { moduleKey: "fieldOps.routeTracking", actionKey: "create" },
    { moduleKey: "fieldOps.gpsCapture", actionKey: "create" },
    { moduleKey: "salesOps.productCatalogue", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "create" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "view" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "create" },
  ];

  // 9: TM
  templates[9].accessType = "mobile";
  templates[9].mobilePermissions = [
    { moduleKey: "fieldOps.mobileLogin", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "create" },
    { moduleKey: "fieldOps.beatPlanning", actionKey: "view" },
    { moduleKey: "fieldOps.beatPlanning", actionKey: "create" },
    { moduleKey: "fieldOps.beatPlanning", actionKey: "edit" },
    { moduleKey: "fieldOps.beatPlanExecution", actionKey: "view" },
    { moduleKey: "fieldOps.beatPlanExecution", actionKey: "create" },
    { moduleKey: "fieldOps.beatPlanExecution", actionKey: "edit" },
    { moduleKey: "salesOps.orderTaking", actionKey: "view" },
    { moduleKey: "salesOps.orderTaking", actionKey: "create" },
    { moduleKey: "salesOps.orderTaking", actionKey: "edit" },
    { moduleKey: "salesOps.collectionEntry", actionKey: "view" },
    { moduleKey: "salesOps.collectionEntry", actionKey: "create" },
    { moduleKey: "salesOps.collectionEntry", actionKey: "edit" },
    { moduleKey: "salesOps.leadCreation", actionKey: "view" },
    { moduleKey: "salesOps.leadCreation", actionKey: "create" },
    { moduleKey: "salesOps.leadCreation", actionKey: "edit" },
    { moduleKey: "salesOps.productCatalogue", actionKey: "view" },
    { moduleKey: "masterAccess.customerMaster", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "create" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "view" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "create" },
  ];

  // 10: ASM
  templates[10].accessType = "web";
  templates[10].webPermissions = [
    { moduleKey: "sales.salesOrder", actionKey: "view" },
    { moduleKey: "sales.salesOrder", actionKey: "approve" },
    { moduleKey: "sales.salesOrder", actionKey: "export" },
    { moduleKey: "sales.beatPlan", actionKey: "view" },
    { moduleKey: "sales.beatPlan", actionKey: "approve" },
    { moduleKey: "sales.beatPlan", actionKey: "export" },
    { moduleKey: "sales.targets", actionKey: "view" },
    { moduleKey: "sales.targets", actionKey: "export" },
    { moduleKey: "reports.salesReports", actionKey: "view" },
    { moduleKey: "reports.salesReports", actionKey: "export" },
    { moduleKey: "reports.fieldForceReports", actionKey: "view" },
    { moduleKey: "reports.fieldForceReports", actionKey: "export" },
  ];

  // 11: RSM
  templates[11].accessType = "web";
  templates[11].webPermissions = [
    { moduleKey: "sales.salesOrder", actionKey: "view" },
    { moduleKey: "sales.salesOrder", actionKey: "approve" },
    { moduleKey: "sales.salesOrder", actionKey: "export" },
    { moduleKey: "sales.beatPlan", actionKey: "view" },
    { moduleKey: "sales.beatPlan", actionKey: "approve" },
    { moduleKey: "sales.beatPlan", actionKey: "export" },
    { moduleKey: "sales.targets", actionKey: "view" },
    { moduleKey: "sales.targets", actionKey: "export" },
    { moduleKey: "reports.salesReports", actionKey: "view" },
    { moduleKey: "reports.salesReports", actionKey: "export" },
    { moduleKey: "reports.fieldForceReports", actionKey: "view" },
    { moduleKey: "reports.fieldForceReports", actionKey: "export" },
  ];

  // 12: ZSM
  templates[12].accessType = "web";
  templates[12].webPermissions = [
    { moduleKey: "sales.salesOrder", actionKey: "view" },
    { moduleKey: "sales.salesOrder", actionKey: "approve" },
    { moduleKey: "sales.salesOrder", actionKey: "export" },
    { moduleKey: "sales.beatPlan", actionKey: "view" },
    { moduleKey: "sales.beatPlan", actionKey: "approve" },
    { moduleKey: "sales.beatPlan", actionKey: "export" },
    { moduleKey: "sales.targets", actionKey: "view" },
    { moduleKey: "sales.targets", actionKey: "export" },
    { moduleKey: "reports.salesReports", actionKey: "view" },
    { moduleKey: "reports.salesReports", actionKey: "export" },
    { moduleKey: "reports.fieldForceReports", actionKey: "view" },
    { moduleKey: "reports.fieldForceReports", actionKey: "export" },
  ];

  // 13: FMO
  templates[13].accessType = "mobile";
  templates[13].mobilePermissions = [
    { moduleKey: "fieldOps.mobileLogin", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "create" },
    { moduleKey: "fieldOps.beatPlanning", actionKey: "view" },
    { moduleKey: "fieldOps.beatPlanning", actionKey: "create" },
    { moduleKey: "fieldOps.beatPlanExecution", actionKey: "view" },
    { moduleKey: "fieldOps.beatPlanExecution", actionKey: "create" },
    { moduleKey: "salesOps.leadCreation", actionKey: "view" },
    { moduleKey: "salesOps.leadCreation", actionKey: "create" },
    { moduleKey: "salesOps.leadCreation", actionKey: "edit" },
    { moduleKey: "salesOps.productCatalogue", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "create" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "view" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "create" },
  ];

  // 14: DO
  templates[14].accessType = "mobile";
  templates[14].mobilePermissions = [
    { moduleKey: "fieldOps.mobileLogin", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "create" },
    { moduleKey: "farmerOps.farmerCreation", actionKey: "view" },
    { moduleKey: "farmerOps.farmerCreation", actionKey: "create" },
    { moduleKey: "farmerOps.farmerCreation", actionKey: "edit" },
    { moduleKey: "farmerOps.farmerSurvey", actionKey: "view" },
    { moduleKey: "farmerOps.farmerSurvey", actionKey: "create" },
    { moduleKey: "farmerOps.farmerSurvey", actionKey: "edit" },
    { moduleKey: "farmerOps.demoScheduling", actionKey: "view" },
    { moduleKey: "farmerOps.demoScheduling", actionKey: "create" },
    { moduleKey: "farmerOps.demoExecution", actionKey: "view" },
    { moduleKey: "farmerOps.demoExecution", actionKey: "create" },
    { moduleKey: "farmerOps.demoReporting", actionKey: "view" },
    { moduleKey: "farmerOps.demoReporting", actionKey: "create" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "create" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "view" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "create" },
  ];

  // 15: Intern
  templates[15].accessType = "mobile";
  templates[15].mobilePermissions = [
    { moduleKey: "fieldOps.mobileLogin", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "view" },
    { moduleKey: "fieldOps.attendance", actionKey: "create" },
    { moduleKey: "salesOps.productCatalogue", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "view" },
    { moduleKey: "hrOps.leaveApplication", actionKey: "create" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "view" },
    { moduleKey: "hrOps.expenseEntry", actionKey: "create" },
  ];

  return templates;
}

export function loadPermissionTemplates(): Record<string | number, RolePermissionTemplate> {
  if (typeof window === "undefined") return getSeedTemplates();
  try {
    const raw = localStorage.getItem(PERM_TEMPLATES_KEY);
    const seeded = getSeedTemplates();
    
    let parsed: Record<string | number, RolePermissionTemplate> = {};
    if (raw && raw !== "{}" && raw !== "null" && raw !== "undefined") {
      try {
        parsed = JSON.parse(raw) as Record<string | number, RolePermissionTemplate>;
      } catch (e) {
        parsed = {};
      }
    }

    let merged = false;
    for (const keyStr of Object.keys(seeded)) {
      const key = Number(keyStr);
      const seedVal = seeded[key];
      const saved = parsed[key] || parsed[keyStr];

      // Check if saved has any permissions configured
      const hasWebPerms = saved && Array.isArray(saved.webPermissions) && saved.webPermissions.length > 0;
      const hasMobilePerms = saved && Array.isArray(saved.mobilePermissions) && saved.mobilePermissions.length > 0;
      const hasSavedPermissions = hasWebPerms || hasMobilePerms;

      if (!saved || !hasSavedPermissions) {
        parsed[key] = seedVal;
        merged = true;
      }
    }

    if (merged) {
      localStorage.setItem(PERM_TEMPLATES_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return getSeedTemplates();
  }
}

export function savePermissionTemplates(templates: Record<string | number, RolePermissionTemplate>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERM_TEMPLATES_KEY, JSON.stringify(templates));
  } catch {}
}

// ── New Standalone Permission Template Flow ──────────────────────────────────
export interface PermissionTemplate {
  id: string;
  templateName: string;
  accessType: "web" | "mobile";
  webPermissions: { moduleKey: string; actionKey: string }[];
  mobilePermissions: { moduleKey: string; actionKey: string }[];
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

const NEW_TEMPLATES_KEY = "ds_permission_templates";

const SEED_NEW_TEMPLATES: PermissionTemplate[] = [
  {
    id: "1",
    templateName: "Sales Manager Template",
    accessType: "web",
    webPermissions: [
      { moduleKey: "sales.salesOrder", actionKey: "view" },
      { moduleKey: "sales.salesOrder", actionKey: "create" },
      { moduleKey: "sales.salesOrder", actionKey: "edit" },
      { moduleKey: "sales.salesOrder", actionKey: "approve" },
      { moduleKey: "sales.salesOrder", actionKey: "export" },
      { moduleKey: "sales.invoice", actionKey: "view" },
      { moduleKey: "sales.invoice", actionKey: "create" },
      { moduleKey: "sales.invoice", actionKey: "edit" },
      { moduleKey: "sales.invoice", actionKey: "approve" },
      { moduleKey: "sales.invoice", actionKey: "export" },
      { moduleKey: "sales.dispatch", actionKey: "view" },
      { moduleKey: "sales.dispatch", actionKey: "create" },
      { moduleKey: "sales.dispatch", actionKey: "edit" },
      { moduleKey: "sales.dispatch", actionKey: "approve" },
      { moduleKey: "sales.dispatch", actionKey: "export" },
      { moduleKey: "sales.collections", actionKey: "view" },
      { moduleKey: "sales.collections", actionKey: "create" },
      { moduleKey: "sales.collections", actionKey: "edit" },
      { moduleKey: "sales.collections", actionKey: "approve" },
      { moduleKey: "sales.collections", actionKey: "export" },
      { moduleKey: "sales.targets", actionKey: "view" },
      { moduleKey: "sales.targets", actionKey: "create" },
      { moduleKey: "sales.targets", actionKey: "edit" },
      { moduleKey: "sales.targets", actionKey: "delete" },
      { moduleKey: "sales.targets", actionKey: "import" },
      { moduleKey: "sales.targets", actionKey: "export" },
      { moduleKey: "sales.beatPlan", actionKey: "view" },
      { moduleKey: "sales.beatPlan", actionKey: "create" },
      { moduleKey: "sales.beatPlan", actionKey: "edit" },
      { moduleKey: "sales.beatPlan", actionKey: "approve" },
      { moduleKey: "sales.beatPlan", actionKey: "export" },
      { moduleKey: "masters.customerMaster", actionKey: "view" },
      { moduleKey: "masters.customerMaster", actionKey: "create" },
      { moduleKey: "masters.customerMaster", actionKey: "edit" },
      { moduleKey: "masters.distributors", actionKey: "view" },
      { moduleKey: "masters.distributors", actionKey: "create" },
      { moduleKey: "masters.distributors", actionKey: "edit" },
      { moduleKey: "masters.distributors", actionKey: "export" },
      { moduleKey: "masters.retailers", actionKey: "view" },
      { moduleKey: "masters.retailers", actionKey: "create" },
      { moduleKey: "masters.retailers", actionKey: "edit" },
      { moduleKey: "masters.retailers", actionKey: "export" },
      { moduleKey: "reports.salesReports", actionKey: "view" },
      { moduleKey: "reports.salesReports", actionKey: "export" },
    ],
    mobilePermissions: [],
    status: "Active",
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
  },
  {
    id: "2",
    templateName: "Field Agent Template",
    accessType: "mobile",
    webPermissions: [],
    mobilePermissions: [
      { moduleKey: "fieldOps.mobileLogin", actionKey: "view" },
      { moduleKey: "fieldOps.attendance", actionKey: "view" },
      { moduleKey: "fieldOps.attendance", actionKey: "create" },
      { moduleKey: "fieldOps.beatPlanning", actionKey: "view" },
      { moduleKey: "fieldOps.beatPlanning", actionKey: "create" },
      { moduleKey: "fieldOps.beatPlanExecution", actionKey: "view" },
      { moduleKey: "fieldOps.beatPlanExecution", actionKey: "create" },
      { moduleKey: "fieldOps.locationTracking", actionKey: "view" },
      { moduleKey: "fieldOps.locationTracking", actionKey: "create" },
      { moduleKey: "fieldOps.routeTracking", actionKey: "view" },
      { moduleKey: "fieldOps.routeTracking", actionKey: "create" },
      { moduleKey: "fieldOps.gpsCapture", actionKey: "create" },
      { moduleKey: "salesOps.productCatalogue", actionKey: "view" },
      { moduleKey: "hrOps.leaveApplication", actionKey: "view" },
      { moduleKey: "hrOps.leaveApplication", actionKey: "create" },
      { moduleKey: "hrOps.expenseEntry", actionKey: "view" },
      { moduleKey: "hrOps.expenseEntry", actionKey: "create" },
    ],
    status: "Active",
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
  },
  {
    id: "3",
    templateName: "HR Admin Template",
    accessType: "web",
    webPermissions: [
      { moduleKey: "hr.employee", actionKey: "view" },
      { moduleKey: "hr.employee", actionKey: "create" },
      { moduleKey: "hr.employee", actionKey: "edit" },
      { moduleKey: "hr.employee", actionKey: "approve" },
      { moduleKey: "hr.employee", actionKey: "export" },
      { moduleKey: "hr.employee", actionKey: "import" },
      { moduleKey: "hr.attendance", actionKey: "view" },
      { moduleKey: "hr.attendance", actionKey: "create" },
      { moduleKey: "hr.attendance", actionKey: "edit" },
      { moduleKey: "hr.attendance", actionKey: "approve" },
      { moduleKey: "hr.attendance", actionKey: "export" },
      { moduleKey: "hr.leaveManagement", actionKey: "view" },
      { moduleKey: "hr.leaveManagement", actionKey: "create" },
      { moduleKey: "hr.leaveManagement", actionKey: "edit" },
      { moduleKey: "hr.leaveManagement", actionKey: "delete" },
      { moduleKey: "hr.leaveManagement", actionKey: "approve" },
      { moduleKey: "hr.leaveManagement", actionKey: "export" },
      { moduleKey: "hr.payroll", actionKey: "view" },
      { moduleKey: "hr.payroll", actionKey: "create" },
      { moduleKey: "hr.payroll", actionKey: "edit" },
      { moduleKey: "hr.payroll", actionKey: "approve" },
      { moduleKey: "hr.payroll", actionKey: "export" },
      { moduleKey: "hr.expenseClaims", actionKey: "view" },
      { moduleKey: "hr.expenseClaims", actionKey: "create" },
      { moduleKey: "hr.expenseClaims", actionKey: "edit" },
      { moduleKey: "hr.expenseClaims", actionKey: "delete" },
      { moduleKey: "hr.expenseClaims", actionKey: "approve" },
      { moduleKey: "hr.expenseClaims", actionKey: "export" },
      { moduleKey: "userManagement.geography", actionKey: "view" },
      { moduleKey: "userManagement.geography", actionKey: "create" },
      { moduleKey: "userManagement.geography", actionKey: "edit" },
      { moduleKey: "userManagement.geography", actionKey: "delete" },
      { moduleKey: "userManagement.geography", actionKey: "export" },
      { moduleKey: "userManagement.department", actionKey: "view" },
      { moduleKey: "userManagement.department", actionKey: "create" },
      { moduleKey: "userManagement.department", actionKey: "edit" },
      { moduleKey: "userManagement.department", actionKey: "delete" },
      { moduleKey: "userManagement.roles", actionKey: "view" },
      { moduleKey: "userManagement.roles", actionKey: "create" },
      { moduleKey: "userManagement.roles", actionKey: "edit" },
      { moduleKey: "userManagement.roles", actionKey: "delete" },
      { moduleKey: "userManagement.user", actionKey: "view" },
      { moduleKey: "userManagement.user", actionKey: "create" },
      { moduleKey: "userManagement.user", actionKey: "edit" },
      { moduleKey: "userManagement.user", actionKey: "delete" },
      { moduleKey: "userManagement.user", actionKey: "approve" },
      { moduleKey: "userManagement.user", actionKey: "export" },
      { moduleKey: "userManagement.user", actionKey: "import" },
      { moduleKey: "reports.hrReports", actionKey: "view" },
      { moduleKey: "reports.hrReports", actionKey: "export" },
    ],
    mobilePermissions: [],
    status: "Active",
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
  }
];

export function loadNewPermissionTemplates(): PermissionTemplate[] {
  if (typeof window === "undefined") return SEED_NEW_TEMPLATES;
  try {
    const raw = localStorage.getItem(NEW_TEMPLATES_KEY);
    if (!raw) {
      localStorage.setItem(NEW_TEMPLATES_KEY, JSON.stringify(SEED_NEW_TEMPLATES));
      return SEED_NEW_TEMPLATES;
    }
    return JSON.parse(raw) as PermissionTemplate[];
  } catch {
    return SEED_NEW_TEMPLATES;
  }
}

export function saveNewPermissionTemplates(templates: PermissionTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NEW_TEMPLATES_KEY, JSON.stringify(templates));
  } catch {}
}

export function nextTemplateId(): string {
  const templates = loadNewPermissionTemplates();
  const ids = templates.map(t => parseInt(t.id)).filter(n => !isNaN(n));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return String(max + 1);
}



