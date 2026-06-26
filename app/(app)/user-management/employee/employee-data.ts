// ── Employee Master — types, seed data, validation, and storage helpers ──────

import { loadRoles, loadPermissionTemplates } from "../roles/roles-data";
import type { EmployeeDocument, EmployeeActivityEntry } from "./employee-documents";

export type { EmployeeDocument, EmployeeActivityEntry } from "./employee-documents";
export {
  applyEmployeeStatusChange,
  canActivateEmployee,
  computeProfileCompletion,
  ALL_EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_DOCUMENT_TYPE_GROUPS,
  EMPLOYEE_DOCUMENT_MAX_BYTES,
  EMPLOYEE_DOCUMENT_ACCEPT,
  PROFILE_DOCUMENT_TYPES,
  DOCUMENT_STATUS_STYLES,
  newDocumentId,
} from "./employee-documents";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoleType = "Field User" | "Admin User";
export type SalesType = "Retail Sales" | "Institutional Sales";

// ── Permission types ──────────────────────────────────────────────────────────

export type WebAction    = "view" | "create" | "edit" | "delete" | "approve" | "export" | "import";
export type MobileAction = "view" | "create" | "edit" | "delete" | "approve";

export interface SubmodulePermission {
  view: boolean; create: boolean; edit: boolean; delete: boolean;
  approve: boolean; export: boolean; import: boolean;
}

export interface MobileFeaturePermission {
  view: boolean; create: boolean; edit: boolean; delete: boolean; approve: boolean;
}

export interface UserPermissions {
  web:    Record<string, Record<string, SubmodulePermission>>;
  mobile: Record<string, Record<string, MobileFeaturePermission>>;
}

// ── Permission sub-types for registry ─────────────────────────────────────────

export interface PermSubmodule  { id: string; label: string; actions: WebAction[] }
export interface PermModule     { id: string; label: string; submodules: PermSubmodule[] }
export interface MobileFeatureDef { id: string; label: string; actions: MobileAction[] }
export interface MobileGroupDef { id: string; label: string; features: MobileFeatureDef[] }

export interface Employee {
  id: number;
  employeeId: string;           // Auto-generated EMP-0001
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;                // Unique
  mobile: string;               // 10-digit, unique
  password?: string;
  countryCode?: string;         // e.g. "+91"
  alternativeMobile?: string;
  bloodGroup: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown";
  gender?: "Male" | "Female" | "Other";
  dob?: string;
  // Employment
  departmentId: number | null;
  department: string;
  employeeType?: "Full-time" | "Part-time" | "Contract" | "Trainee";
  roleType?: RoleType;
  salesType?: SalesType;
  roleId: number | null;
  role: string;
  reportingManagerId: number | null;
  reportingManager: string;
  status: "active" | "inactive" | "draft" | "archived";
  joiningDate: string;
  // Address (structured — preferred)
  currentAddressLine1?: string;
  currentAddressLine2?: string;
  currentPincode?: string;
  currentCity?: string;
  currentTown?: string;
  currentDistrict?: string;
  currentState?: string;
  /** @deprecated use currentCity / currentTown */
  currentCityTownLocality?: string;
  permanentAddressLine1?: string;
  permanentAddressLine2?: string;
  permanentPincode?: string;
  permanentCity?: string;
  permanentTown?: string;
  permanentDistrict?: string;
  permanentState?: string;
  /** @deprecated use permanentCity / permanentTown */
  permanentCityTownLocality?: string;
  emergencyAddressLine1?: string;
  emergencyAddressLine2?: string;
  emergencyPincode?: string;
  emergencyCity?: string;
  emergencyTown?: string;
  emergencyDistrict?: string;
  emergencyState?: string;
  /** @deprecated use emergencyCity / emergencyTown */
  emergencyCityTownLocality?: string;
  /** @deprecated legacy geo-node IDs */
  currentStateId?: number | null;
  currentCityId?: number | null;
  currentPincodeId?: number | null;
  permanentStateId?: number | null;
  permanentCityId?: number | null;
  permanentPincodeId?: number | null;
  emergencyStateId?: number | null;
  emergencyCityId?: number | null;
  emergencyPincodeId?: number | null;
  sameAsCurrentAddress?: boolean;
  // Address (legacy flat strings — kept for display / exports)
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContactName: string;
  emergencyContactMobile: string;
  emergencyContactRelation: "Spouse" | "Parent" | "Sibling" | "Child" | "Friend" | "Other";
  emergencyContactAddress?: string;
  // Geography (Field Users)
  geoZone?: string;
  geoRegion?: string;
  geoState?: string;
  geoArea?: string;
  territory?: string;
  geoDistrict?: string;
  geoCity?: string;
  geoTown?: string;
  /** @deprecated use geoTown */
  geoLocality?: string;
  geoMappings?: Array<{
    geoZone?: string;
    geoRegion?: string;
    geoState?: string;
    geoArea?: string;
    territory?: string;
    geoDistrict?: string;
    geoCity?: string;
    geoTown?: string;
    /** @deprecated use geoTown */
    geoLocality?: string;
  }>;
  // Permissions
  permissions?: UserPermissions;
  // Approval Chain
  approvalLevel1Id?: number | null;
  approvalLevel1Name?: string;
  approvalLevel1Role?: string;
  approvalLevel2Id?: number | null;
  approvalLevel2Name?: string;
  approvalLevel2Role?: string;
  approvalLevel3Id?: number | null;
  approvalLevel3Name?: string;
  approvalLevel3Role?: string;
  // Legacy fields (kept for backward compat)
  designation?: string;
  branch?: string;
  workLocation?: string;
  city?: string;
  pincode?: string;
  address?: string;
  state?: string;
  relativeName?: string;
  correspondenceAddress?: string;
  remarks?: string;
  profilePhotoPath?: string;
  documents?: EmployeeDocument[];
  activityLog?: EmployeeActivityEntry[];
  // Audit
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  lastStatusChange: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
export const GENDERS = ["Male", "Female", "Other"];
export const EMPLOYEE_TYPES = ["Full-time", "Part-time", "Contract", "Trainee"];
export const RELATIONS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];
export const ROLE_TYPES: RoleType[] = ["Field User", "Admin User"];
export const SALES_TYPES: SalesType[] = ["Retail Sales", "Institutional Sales"];

export const COUNTRY_CODES = [
  { code: "+91",  label: "+91  India" },
  { code: "+1",   label: "+1   USA / Canada" },
  { code: "+44",  label: "+44  UK" },
  { code: "+61",  label: "+61  Australia" },
  { code: "+971", label: "+971 UAE" },
  { code: "+65",  label: "+65  Singapore" },
  { code: "+60",  label: "+60  Malaysia" },
];

// ── Role Definitions ──────────────────────────────────────────────────────────

export const RETAIL_SALES_ROLES = [
  { id: 101, name: "DO",     fullName: "Distribution Officer (DO)" },
  { id: 102, name: "Intern", fullName: "Intern" },
  { id: 103, name: "TM",     fullName: "Territory Manager (TM)" },
  { id: 104, name: "FMO",    fullName: "Field Marketing Officer (FMO)" },
  { id: 105, name: "ASM",    fullName: "Area Sales Manager (ASM)" },
  { id: 106, name: "RSM",    fullName: "Regional Sales Manager (RSM)" },
  { id: 107, name: "ZSM",    fullName: "Zonal Sales Manager (ZSM)" },
  { id: 108, name: "NSM",    fullName: "National Sales Manager (NSM)" },
];

// Hierarchy: NSM/SPM → ZSM → RSM → ASM/KAM → TM → FMO → DO/Intern
export const INSTITUTIONAL_SALES_ROLES = [
  { id: 108, name: "NSM",    fullName: "National Sales Manager (NSM)" },
  { id: 110, name: "SPM",    fullName: "Senior Planning Manager (SPM)" },
  { id: 107, name: "ZSM",    fullName: "Zonal Sales Manager (ZSM)" },
  { id: 106, name: "RSM",    fullName: "Regional Sales Manager (RSM)" },
  { id: 105, name: "ASM",    fullName: "Area Sales Manager (ASM)" },
  { id: 109, name: "KAM",    fullName: "Key Account Manager (KAM)" },
  { id: 103, name: "TM",     fullName: "Territory Manager (TM)" },
  { id: 104, name: "FMO",    fullName: "Field Marketing Officer (FMO)" },
  { id: 101, name: "DO",     fullName: "Distribution Officer (DO)" },
  { id: 102, name: "Intern", fullName: "Intern" },
];

// Admin User roles — includes national-level heads; no geography mapping required
export const ADMIN_ROLES = [
  { id: 301, name: "NSM",                fullName: "National Sales Manager (NSM)" },
  { id: 302, name: "SPM",                fullName: "Senior Planning Manager (SPM)" },
  { id: 201, name: "Procurement Head",   fullName: "Procurement Head" },
  { id: 202, name: "Accounts Manager",   fullName: "Accounts Manager" },
  { id: 203, name: "HR Admin",           fullName: "HR Admin" },
  { id: 204, name: "Operations Manager", fullName: "Operations Manager" },
  { id: 205, name: "Finance Manager",    fullName: "Finance Manager" },
  { id: 206, name: "Back Office Manager",fullName: "Back Office Manager" },
];

// Geography fields required per field role (top-down hierarchy)
export const ROLE_GEO_FIELDS: Record<string, string[]> = {
  "NSM":    [],                                                       // National — no geo mapping
  "SPM":    [],                                                       // National — no geo mapping (Institutional top level)
  "ZSM":    ["Zone"],                                                 // Zonal
  "RSM":    ["Zone", "Region"],                                       // Regional
  "ASM":    ["Zone", "Region", "State", "Area"],
  "KAM":    ["Zone", "Region", "State", "Area"],
  "TM":     ["Zone", "Region", "State", "Area", "Territory"],
  "FMO":    ["Zone", "Region", "State", "Area", "Territory"],
  "DO":     ["Zone", "Region", "State", "Area", "Territory", "District", "City", "Town"],
  "Intern": ["Zone", "Region", "State", "Area", "Territory", "District", "City", "Town"],
};

// ── Web Portal Permission Registry ─────────────────────────────────────────────
// Add new modules / submodules here — the UI and defaults auto-reflect instantly.

export const PERMISSION_REGISTRY: PermModule[] = [
  {
    id: "userManagement", label: "User Management",
    submodules: [
      { id: "geography",  label: "Geography",  actions: ["view","create","edit","delete","export"] },
      { id: "department", label: "Department", actions: ["view","create","edit","delete"] },
      { id: "roles",      label: "Roles",      actions: ["view","create","edit","delete"] },
      { id: "user",       label: "User",       actions: ["view","create","edit","delete","approve","export","import"] },
    ],
  },
  {
    id: "masters", label: "Masters",
    submodules: [
      { id: "cropMaster",       label: "Crop Master",       actions: ["view","create","edit","delete","export","import"] },
      { id: "productMaster",    label: "Product Master",    actions: ["view","create","edit","delete","export","import"] },
      { id: "brandMaster",      label: "Brand Master",      actions: ["view","create","edit","delete","export"] },
      { id: "categoryMaster",   label: "Category Master",   actions: ["view","create","edit","delete"] },
      { id: "hsnTax",           label: "HSN / Tax",         actions: ["view","create","edit","delete","export"] },
      { id: "customerCategory", label: "Customer Category", actions: ["view","create","edit","delete"] },
      { id: "customerMaster",   label: "Customer Master",   actions: ["view","create","edit","delete"] },
      { id: "vendorCategory",   label: "Supplier Category",   actions: ["view","create","edit","delete"] },
      { id: "warehouseMaster",  label: "Warehouse",         actions: ["view","create","edit","delete"] },
      { id: "uomMaster",        label: "Units of Measure",  actions: ["view","create","edit","delete"] },
      { id: "distributors",     label: "Distributors",      actions: ["view","create","edit","delete","export"] },
      { id: "retailers",        label: "Retailers",         actions: ["view","create","edit","delete","export"] },
    ],
  },
  {
    id: "procurement", label: "Procurement",
    submodules: [
      { id: "purchaseRequisition", label: "Purchase Requisition", actions: ["view","create","edit","delete","approve","export"] },
      { id: "rfq",                 label: "RFQ",                  actions: ["view","create","edit","delete","approve","export"] },
      { id: "purchaseOrder",       label: "Purchase Order",       actions: ["view","create","edit","delete","approve","export"] },
      { id: "grn",                 label: "Goods Receipt (GRN)",  actions: ["view","create","edit","delete","approve","export"] },
      { id: "vendorBill",          label: "Supplier Bills",         actions: ["view","create","edit","delete","approve","export"] },
      { id: "vendorReturn",        label: "Supplier Returns",       actions: ["view","create","edit","delete","approve","export"] },
      { id: "vendorManagement",    label: "Supplier Management",    actions: ["view","create","edit","delete","export"] },
      { id: "stockLedger",         label: "Stock Ledger",         actions: ["view","export"] },
    ],
  },
  {
    id: "sales", label: "Sales",
    submodules: [
      { id: "salesOrder",  label: "Sales Orders",  actions: ["view","create","edit","delete","approve","export"] },
      { id: "invoice",     label: "Invoices",      actions: ["view","create","edit","delete","approve","export"] },
      { id: "dispatch",    label: "Dispatch",      actions: ["view","create","edit","delete","approve","export"] },
      { id: "collections", label: "Collections",   actions: ["view","create","edit","delete","approve","export"] },
      { id: "targets",     label: "Targets",       actions: ["view","create","edit","delete","import","export"] },
      { id: "beatPlan",    label: "Beat Plan",     actions: ["view","create","edit","delete","approve","export"] },
    ],
  },
  {
    id: "hr", label: "HR",
    submodules: [
      { id: "employee",        label: "Employee",        actions: ["view","create","edit","delete","approve","export","import"] },
      { id: "attendance",      label: "Attendance",      actions: ["view","create","edit","approve","export"] },
      { id: "leaveManagement", label: "Leave Management",actions: ["view","create","edit","delete","approve","export"] },
      { id: "payroll",         label: "Payroll",         actions: ["view","create","edit","approve","export"] },
      { id: "expenseClaims",   label: "Expense Claims",  actions: ["view","create","edit","delete","approve","export"] },
    ],
  },
  {
    id: "accounts", label: "Accounts",
    submodules: [
      { id: "journalEntry",   label: "Journal Entry",   actions: ["view","create","edit","delete","approve","export"] },
      { id: "paymentVoucher", label: "Payment Voucher", actions: ["view","create","edit","delete","approve","export"] },
      { id: "receiptVoucher", label: "Receipt Voucher", actions: ["view","create","edit","delete","approve","export"] },
      { id: "chartOfAccounts", label: "Chart of Accounts", actions: ["view","create","edit","delete","export"] },
      { id: "ledger",         label: "Ledger",          actions: ["view","export"] },
      { id: "outstanding",    label: "Outstanding",     actions: ["view","export"] },
      { id: "accountReports", label: "Reports",         actions: ["view","export"] },
    ],
  },
  {
    id: "farmer", label: "Farmer",
    submodules: [
      { id: "farmerRegistry",    label: "Farmer Registry",    actions: ["view","create","edit","delete","approve","export","import"] },
      { id: "fieldSurveys",      label: "Field Surveys",      actions: ["view","create","edit","delete","approve","export"] },
      { id: "cropCalendar",      label: "Crop Calendar",      actions: ["view","create","edit","delete","export"] },
      { id: "inputDistribution", label: "Input Distribution", actions: ["view","create","edit","delete","approve","export"] },
      { id: "fpoManagement",     label: "FPO Management",     actions: ["view","create","edit","delete","approve","export"] },
    ],
  },
  {
    id: "events", label: "Events",
    submodules: [
      { id: "events",          label: "Events",     actions: ["view","create","edit","delete","approve","export"] },
      { id: "eventAttendance", label: "Attendance", actions: ["view","create","edit","export"] },
      { id: "eventFeedback",   label: "Feedback",   actions: ["view","export"] },
    ],
  },
  {
    id: "reports", label: "Reports",
    submodules: [
      { id: "salesReports",       label: "Sales Reports",       actions: ["view","export"] },
      { id: "procurementReports", label: "Procurement Reports", actions: ["view","export"] },
      { id: "hrReports",          label: "HR Reports",          actions: ["view","export"] },
      { id: "accountsReports",    label: "Accounts Reports",    actions: ["view","export"] },
      { id: "fieldForceReports",  label: "Field Force Reports", actions: ["view","export"] },
      { id: "farmerReports",      label: "Farmer Reports",      actions: ["view","export"] },
      { id: "dashboards",         label: "Dashboards",          actions: ["view","export"] },
    ],
  },
];

// ── Mobile App Permission Registry ─────────────────────────────────────────────
// Add new mobile features here — the UI auto-reflects instantly.

export const MOBILE_PERMISSION_REGISTRY: MobileGroupDef[] = [
  {
    id: "fieldOps", label: "Field Operations",
    features: [
      { id: "mobileLogin",       label: "Mobile Login",        actions: ["view"] },
      { id: "attendance",        label: "Attendance Marking",  actions: ["view","create"] },
      { id: "beatPlanning",      label: "Beat Planning",       actions: ["view","create","edit","delete"] },
      { id: "beatPlanExecution", label: "Beat Plan Execution", actions: ["view","create","edit"] },
      { id: "locationTracking",  label: "Location Tracking",   actions: ["view","create"] },
      { id: "routeTracking",     label: "Route Tracking",      actions: ["view","create"] },
      { id: "gpsCapture",        label: "GPS Capture",         actions: ["create"] },
    ],
  },
  {
    id: "salesOps", label: "Sales & Orders",
    features: [
      { id: "orderTaking",      label: "Order Taking",      actions: ["view","create","edit","delete"] },
      { id: "collectionEntry",  label: "Collection Entry",  actions: ["view","create","edit"] },
      { id: "leadCreation",     label: "Lead Creation",     actions: ["view","create","edit","delete"] },
      { id: "productCatalogue", label: "Product Catalogue", actions: ["view"] },
    ],
  },
  {
    id: "masterAccess", label: "Master Data Access",
    features: [
      { id: "customerMaster",      label: "Customer Master Access",  actions: ["view","create","edit","delete"] },
      { id: "productMaster",       label: "Product Master Access",   actions: ["view"] },
      { id: "distributorCreation", label: "Distributor Creation",    actions: ["view","create","edit"] },
      { id: "retailerCreation",    label: "Retailer Creation",       actions: ["view","create","edit"] },
      { id: "customerCreation",    label: "Customer Creation",       actions: ["view","create","edit","delete"] },
    ],
  },
  {
    id: "farmerOps", label: "Farmer Operations",
    features: [
      { id: "farmerCreation", label: "Farmer Creation",  actions: ["view","create","edit","delete"] },
      { id: "farmerSurvey",   label: "Farmer Survey",    actions: ["view","create","edit","delete"] },
      { id: "demoScheduling", label: "Demo Scheduling",  actions: ["view","create","edit","delete"] },
      { id: "demoExecution",  label: "Demo Execution",   actions: ["view","create","edit"] },
      { id: "demoReporting",  label: "Demo Reporting",   actions: ["view","create","edit"] },
    ],
  },
  {
    id: "hrOps", label: "HR & Expenses",
    features: [
      { id: "leaveApplication", label: "Leave Application", actions: ["view","create","edit","delete"] },
      { id: "leaveApproval",    label: "Leave Approval",    actions: ["view","approve"] },
      { id: "expenseEntry",     label: "Expense Entry",     actions: ["view","create","edit","delete"] },
      { id: "expenseApproval",  label: "Expense Approval",  actions: ["view","approve"] },
    ],
  },
  {
    id: "dataOps", label: "Data & Uploads",
    features: [
      { id: "databaseCreation", label: "Database Creation", actions: ["view","create"] },
      { id: "databaseImport",   label: "Database Import",   actions: ["create"] },
      { id: "photoUpload",      label: "Photo Upload",      actions: ["create"] },
      { id: "documentUpload",   label: "Document Upload",   actions: ["create"] },
      { id: "offlineMode",      label: "Offline Mode",      actions: ["view"] },
      { id: "syncData",         label: "Sync Data",         actions: ["view","create"] },
    ],
  },
];

// ── Permission helpers ─────────────────────────────────────────────────────────

export function defaultSubPerm(): SubmodulePermission {
  return { view: false, create: false, edit: false, delete: false, approve: false, export: false, import: false };
}

export function defaultMobilePerm(): MobileFeaturePermission {
  return { view: false, create: false, edit: false, delete: false, approve: false };
}

export function defaultPermissions(): UserPermissions {
  const web: Record<string, Record<string, SubmodulePermission>> = {};
  PERMISSION_REGISTRY.forEach(mod => {
    web[mod.id] = {};
    mod.submodules.forEach(sub => { web[mod.id][sub.id] = defaultSubPerm(); });
  });
  const mobile: Record<string, Record<string, MobileFeaturePermission>> = {};
  MOBILE_PERMISSION_REGISTRY.forEach(grp => {
    mobile[grp.id] = {};
    grp.features.forEach(f => { mobile[grp.id][f.id] = defaultMobilePerm(); });
  });
  return { web, mobile };
}

export function fullPermissions(): UserPermissions {
  const web: Record<string, Record<string, SubmodulePermission>> = {};
  PERMISSION_REGISTRY.forEach(mod => {
    web[mod.id] = {};
    mod.submodules.forEach(sub => {
      web[mod.id][sub.id] = { view: true, create: true, edit: true, delete: true, approve: true, export: true, import: true };
    });
  });
  const mobile: Record<string, Record<string, MobileFeaturePermission>> = {};
  MOBILE_PERMISSION_REGISTRY.forEach(grp => {
    mobile[grp.id] = {};
    grp.features.forEach(f => { mobile[grp.id][f.id] = { view: true, create: true, edit: true, delete: true, approve: true }; });
  });
  return { web, mobile };
}

/** Safely migrate old-format or null permissions to the current structure. */
export function migratePermissions(raw: any): UserPermissions {
  if (raw && typeof raw === "object" && "web" in raw && "mobile" in raw)
    return raw as UserPermissions;
  return defaultPermissions();
}

/** Auto-suggest sensible defaults based on selected role. Admin can override after. */
export function roleDefaultPermissions(role: string): UserPermissions {
  const p = defaultPermissions();
  try {
    const roles = loadRoles();
    const templates = loadPermissionTemplates();
    
    // Find the role in roles-data.ts by matching roleName or role string
    const matchedRole = roles.find(r => r.roleName.toLowerCase() === role.toLowerCase());
    if (!matchedRole) {
      // Fallback to SPM/NSM check
      if (["NSM", "SPM"].includes(role)) {
        return fullPermissions();
      }
      return p;
    }
    
    const template = templates[matchedRole.id] || templates[String(matchedRole.id)];
    if (!template) return p;

    if (template.accessType === "web" && Array.isArray(template.webPermissions)) {
      template.webPermissions.forEach((perm: any) => {
        let mKey = perm.moduleKey || perm.module || perm.moduleId || perm.moduleName;
        const aKey = perm.actionKey || perm.action || perm.permission;
        if (mKey && aKey) {
          if (mKey === "sales.customers") {
            mKey = "masters.customerMaster";
          }
          const parts = mKey.split(".");
          if (parts.length >= 2) {
            const modId = parts[0];
            const subId = parts[1];
            if (p.web[modId] && p.web[modId][subId]) {
              (p.web[modId][subId] as any)[aKey] = true;
            }
          }
        }
      });
    } else if (template.accessType === "mobile" && Array.isArray(template.mobilePermissions)) {
      template.mobilePermissions.forEach((perm: any) => {
        const mKey = perm.moduleKey || perm.module || perm.moduleId || perm.moduleName;
        const aKey = perm.actionKey || perm.action || perm.permission;
        if (mKey && aKey) {
          const parts = mKey.split(".");
          if (parts.length >= 2) {
            const grpId = parts[0];
            const featId = parts[1];
            if (p.mobile[grpId] && p.mobile[grpId][featId]) {
              (p.mobile[grpId][featId] as any)[aKey] = true;
            }
          }
        }
      });
    }
  } catch (err) {
    console.error("Error loading dynamic role defaults:", err);
  }
  return p;
}

// Legacy compat
export const ROLE_TYPE_ROLES: Record<RoleType, string[]> = {
  "Field User":  ["DO", "Intern", "TM", "FMO", "ASM", "KAM", "RSM", "ZSM", "NSM", "SPM"],
  "Admin User":  ["NSM", "SPM", "Procurement Head", "Accounts Manager", "HR Admin", "Operations Manager", "Finance Manager", "Back Office Manager"],
};

// ── Utility Functions ─────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nextEmployeeId(employees: Employee[]): string {
  const ids = employees
    .map(e => parseInt(e.employeeId.replace("EMP-", "")))
    .filter(n => !isNaN(n));
  const maxId = Math.max(0, ...ids);
  return `EMP-${String(maxId + 1).padStart(4, "0")}`;
}

export function getNextId(employees: Employee[]): number {
  return Math.max(0, ...employees.map(e => e.id)) + 1;
}

// ── Validation Functions ──────────────────────────────────────────────────────

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Invalid email format";
  return null;
}

export function validateEmailUnique(email: string, employees: Employee[], excludeId?: number): string | null {
  const exists = employees.some(
    e => e.email.toLowerCase() === email.toLowerCase() && e.id !== excludeId
  );
  return exists ? "Email already in use" : null;
}

export function formatEmployeeRoleLabel(employee: Pick<Employee, "roleType" | "role">): string {
  const role = employee.role?.trim();
  const roleType = employee.roleType?.trim();
  if (roleType && role) return `${roleType} - ${role}`;
  return role || roleType || "—";
}

export function formatEmployeeMobile(
  mobile?: string,
  countryCode = "+91",
): string {
  const digits = (mobile || "").replace(/\D/g, "");
  if (!digits) return "—";
  const code = countryCode || "+91";
  return `${code} ${digits}`;
}

export function validateMobile(mobile: string): string | null {
  if (!mobile.trim()) return "Mobile is required";
  if (!/^\d{10}$/.test(mobile)) return "Must be exactly 10 digits";
  if (!/^[6-9]/.test(mobile)) return "Must start with 6–9";
  return null;
}

export function validateMobileUnique(mobile: string, employees: Employee[], excludeId?: number): string | null {
  const exists = employees.some(
    e => e.mobile === mobile && e.id !== excludeId
  );
  return exists ? "Mobile number already in use" : null;
}

export function validateCircularReporting(
  employeeId: number,
  reportingManagerId: number | null,
  employees: Employee[]
): string | null {
  if (!reportingManagerId) return null;
  if (employeeId === reportingManagerId) return "Cannot report to yourself";
  const visited = new Set<number>();
  let current: number | null = reportingManagerId;
  while (current !== null) {
    if (visited.has(current)) return "Circular reporting detected";
    visited.add(current);
    const emp = employees.find(e => e.id === current);
    if (!emp) break;
    current = emp.reportingManagerId || null;
  }
  return null;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 1,
    employeeId: "EMP-0001",
    firstName: "Rajesh",
    lastName: "Kumar",
    fullName: "Rajesh Kumar",
    email: "rajesh.kumar@paramverse.bio",
    mobile: "9876543210",
    countryCode: "+91",
    alternativeMobile: "9988776655",
    bloodGroup: "B+",
    gender: "Male",
    dob: "1985-05-15",
    employeeType: "Full-time",
    departmentId: 1,
    department: "Sales",
    branch: "Mumbai HO",
    roleType: "Field User",
    salesType: "Retail Sales",
    roleId: 106,
    role: "RSM",
    geoZone: "West",
    geoRegion: "Mumbai",
    territory: "Mumbai Region",
    emergencyContactName: "Priya Kumar",
    emergencyContactMobile: "9876543215",
    emergencyContactRelation: "Spouse",
    emergencyContactAddress: "123 Business Park, Mumbai 400001",
    currentAddress: "123 Business Park, Mumbai 400001",
    permanentAddress: "Flat 101, Star Heights, FC Road, Pune 411004",
    geoMappings: [
      {
        geoZone: "West",
        geoRegion: "Mumbai",
        geoArea: "Central Mumbai",
        territory: "Mumbai Region",
        geoTown: "Kothrud Town",
      }
    ],
    approvalLevel1Id: 4,
    approvalLevel1Name: "Priya Patel",
    approvalLevel1Role: "HR Manager",
    approvalLevel2Id: 5,
    approvalLevel2Name: "Arjun Verma",
    approvalLevel2Role: "Accounts Manager",
    permissions: fullPermissions(),
    reportingManagerId: null,
    reportingManager: "",
    status: "active",
    joiningDate: "2018-03-20",
    createdBy: "Admin",
    createdDate: "2024-01-10",
    updatedBy: "Admin",
    updatedDate: "2024-01-10",
    lastStatusChange: "2024-01-10",
    documents: [
      {
        id: "doc-seed-1",
        documentName: "Aadhaar Card",
        documentType: "Aadhaar Card",
        documentNumber: "XXXX-XXXX-1234",
        status: "verified",
        fileName: "rajesh-aadhaar.pdf",
        fileUrl: "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDMgM10+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNC9Sb290IDEgMCBSL0luZm8gNCAwIFI+PgpzdGFydHhyZWYKMTg5CiUlRU9G",
        mimeType: "application/pdf",
        uploadedBy: "Admin",
        uploadedOn: "2024-01-10",
        verifiedBy: "Priya Patel",
        verifiedDate: "2024-01-11",
      },
      {
        id: "doc-seed-2",
        documentName: "PAN Card",
        documentType: "PAN Card",
        documentNumber: "ABCDE1234F",
        status: "uploaded",
        fileName: "rajesh-pan.jpg",
        fileUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDAQwNDR8REiUeHyAeJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pJS4pL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
        mimeType: "image/jpeg",
        uploadedBy: "Admin",
        uploadedOn: "2024-01-10",
      },
      {
        id: "doc-seed-3",
        documentName: "Photograph",
        documentType: "Photograph",
        status: "uploaded",
        fileName: "rajesh-photo.png",
        fileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mimeType: "image/png",
        uploadedBy: "Admin",
        uploadedOn: "2024-01-10",
      },
    ],
    activityLog: [],
  },
  {
    id: 2, employeeId: "EMP-0002", firstName: "Anjali", lastName: "Sharma",
    fullName: "Anjali Sharma", email: "anjali.sharma@paramverse.bio",
    mobile: "9876543211", countryCode: "+91", bloodGroup: "O+", gender: "Female",
    dob: "1990-08-22", employeeType: "Full-time",
    departmentId: 1, department: "Sales", roleType: "Field User",
    salesType: "Retail Sales", roleId: 105, role: "ASM",
    geoZone: "West", geoRegion: "Mumbai", geoArea: "Central Mumbai",
    territory: "Dadar-Parel Territory",
    emergencyContactName: "Vikram Sharma", emergencyContactMobile: "9876543216",
    emergencyContactRelation: "Parent",
    currentAddress: "456 Corporate Tower, Mumbai 400014",
    reportingManagerId: 1, reportingManager: "Rajesh Kumar", status: "active",
    joiningDate: "2020-06-15", createdBy: "Admin", createdDate: "2024-01-12",
    updatedBy: "Admin", updatedDate: "2024-01-12", lastStatusChange: "2024-01-12",
  },
  {
    id: 3, employeeId: "EMP-0003", firstName: "Deepak", lastName: "Singh",
    fullName: "Deepak Singh", email: "deepak.singh@paramverse.bio",
    mobile: "9876543212", countryCode: "+91", bloodGroup: "A+", gender: "Male",
    dob: "1988-11-10", employeeType: "Full-time",
    departmentId: 5, department: "Field Force", roleType: "Field User",
    salesType: "Retail Sales", roleId: 101, role: "DO",
    geoZone: "West", geoRegion: "Mumbai", geoArea: "Central Mumbai",
    territory: "West Territory", geoTown: "Kothrud Town",
    emergencyContactName: "Neha Singh", emergencyContactMobile: "9876543217",
    emergencyContactRelation: "Spouse",
    currentAddress: "789 Residential Complex, Mumbai 400019",
    reportingManagerId: 2, reportingManager: "Anjali Sharma", status: "active",
    joiningDate: "2021-02-10", createdBy: "Admin", createdDate: "2024-01-15",
    updatedBy: "Admin", updatedDate: "2024-01-15", lastStatusChange: "2024-01-15",
  },
  {
    id: 4, employeeId: "EMP-0004", firstName: "Priya", lastName: "Patel",
    fullName: "Priya Patel", email: "priya.patel@paramverse.bio",
    mobile: "9876543213", countryCode: "+91", bloodGroup: "AB-", gender: "Female",
    dob: "1992-03-18", employeeType: "Full-time",
    departmentId: 2, department: "HR", roleType: "Admin User",
    roleId: 203, role: "HR Manager",
    emergencyContactName: "Anil Patel", emergencyContactMobile: "9876543218",
    emergencyContactRelation: "Parent",
    currentAddress: "321 Tech Park, Mumbai 400005",
    reportingManagerId: null, reportingManager: "", status: "active",
    joiningDate: "2019-09-12", createdBy: "Admin", createdDate: "2024-01-18",
    updatedBy: "Admin", updatedDate: "2024-01-18", lastStatusChange: "2024-01-18",
  },
  {
    id: 5, employeeId: "EMP-0005", firstName: "Arjun", lastName: "Verma",
    fullName: "Arjun Verma", email: "arjun.verma@paramverse.bio",
    mobile: "9876543214", countryCode: "+91", bloodGroup: "O-", gender: "Male",
    dob: "1995-07-25", employeeType: "Full-time",
    departmentId: 3, department: "Accounts", roleType: "Admin User",
    roleId: 202, role: "Accounts Manager",
    emergencyContactName: "Sunita Verma", emergencyContactMobile: "9876543219",
    emergencyContactRelation: "Parent",
    currentAddress: "654 Finance Block, Mumbai 400008",
    reportingManagerId: null, reportingManager: "", status: "active",
    joiningDate: "2021-04-20", createdBy: "Admin", createdDate: "2024-01-20",
    updatedBy: "Admin", updatedDate: "2024-01-20", lastStatusChange: "2024-01-20",
  },
  {
    id: 6, employeeId: "EMP-0006", firstName: "Sneha", lastName: "Gupta",
    fullName: "Sneha Gupta", email: "sneha.gupta@paramverse.bio",
    mobile: "8765432109", countryCode: "+91", bloodGroup: "B-", gender: "Female",
    dob: "1993-12-30", employeeType: "Full-time",
    departmentId: 1, department: "Sales", roleType: "Field User",
    salesType: "Institutional Sales", roleId: 109, role: "KAM",
    geoZone: "West", geoRegion: "Mumbai", geoArea: "North Mumbai",
    emergencyContactName: "Rohit Gupta", emergencyContactMobile: "8765432114",
    emergencyContactRelation: "Sibling",
    currentAddress: "987 Skyline Tower, Mumbai 400066",
    reportingManagerId: 1, reportingManager: "Rajesh Kumar", status: "active",
    joiningDate: "2022-01-15", createdBy: "Admin", createdDate: "2024-02-05",
    updatedBy: "Admin", updatedDate: "2024-02-05", lastStatusChange: "2024-02-05",
  },
  {
    id: 7, employeeId: "EMP-0007", firstName: "Vikram", lastName: "Rao",
    fullName: "Vikram Rao", email: "vikram.rao@paramverse.bio",
    mobile: "8765432110", countryCode: "+91", bloodGroup: "A-", gender: "Male",
    dob: "1987-04-12", employeeType: "Full-time",
    departmentId: 5, department: "Field Force", roleType: "Field User",
    salesType: "Retail Sales", roleId: 103, role: "TM",
    geoZone: "South", geoRegion: "Bangalore", geoArea: "Central Bangalore",
    territory: "Bangalore Region",
    emergencyContactName: "Lakshmi Rao", emergencyContactMobile: "8765432115",
    emergencyContactRelation: "Spouse",
    currentAddress: "234 Tech Valley, Bangalore 560034",
    reportingManagerId: null, reportingManager: "", status: "inactive",
    joiningDate: "2016-08-20", createdBy: "Admin", createdDate: "2024-02-10",
    updatedBy: "Admin", updatedDate: "2024-02-12", lastStatusChange: "2024-02-12",
  },
  {
    id: 8, employeeId: "EMP-0008", firstName: "Nisha", lastName: "Desai",
    fullName: "Nisha Desai", email: "nisha.desai@paramverse.bio",
    mobile: "8765432111", countryCode: "+91", bloodGroup: "O+", gender: "Female",
    dob: "1996-06-08", employeeType: "Part-time",
    departmentId: 5, department: "Field Force", roleType: "Field User",
    salesType: "Retail Sales", roleId: 101, role: "DO",
    geoZone: "South", geoRegion: "Bangalore", geoArea: "East Bangalore",
    territory: "South Territory", geoTown: "Whitefield Town",
    emergencyContactName: "Suresh Desai", emergencyContactMobile: "8765432116",
    emergencyContactRelation: "Parent",
    currentAddress: "567 Garden View, Bangalore 560038",
    reportingManagerId: 7, reportingManager: "Vikram Rao", status: "inactive",
    joiningDate: "2024-01-01", createdBy: "Admin", createdDate: "2024-02-15",
    updatedBy: "Admin", updatedDate: "2024-02-15", lastStatusChange: "2024-02-15",
  },
  {
    id: 9, employeeId: "EMP-0009", firstName: "Sanjay", lastName: "Mishra",
    fullName: "Sanjay Mishra", email: "sanjay.mishra@paramverse.bio",
    mobile: "8765432112", countryCode: "+91", bloodGroup: "AB+", gender: "Male",
    dob: "1984-09-05", employeeType: "Full-time",
    departmentId: 1, department: "Sales", roleType: "Field User",
    salesType: "Institutional Sales", roleId: 106, role: "RSM",
    geoZone: "South", geoRegion: "Chennai",
    emergencyContactName: "Meera Mishra", emergencyContactMobile: "8765432117",
    emergencyContactRelation: "Spouse",
    currentAddress: "890 Business Plaza, Chennai 600002",
    reportingManagerId: null, reportingManager: "", status: "active",
    joiningDate: "2017-11-10", createdBy: "Admin", createdDate: "2024-02-20",
    updatedBy: "Admin", updatedDate: "2024-02-20", lastStatusChange: "2024-02-20",
  },
  {
    id: 10, employeeId: "EMP-0010", firstName: "Kavya", lastName: "Iyer",
    fullName: "Kavya Iyer", email: "kavya.iyer@paramverse.bio",
    mobile: "8765432113", countryCode: "+91", bloodGroup: "B+", gender: "Female",
    dob: "1998-01-14", employeeType: "Trainee",
    departmentId: 4, department: "Procurement", roleType: "Admin User",
    roleId: 201, role: "Procurement Head",
    emergencyContactName: "Ramakrishnan Iyer", emergencyContactMobile: "8765432118",
    emergencyContactRelation: "Parent",
    currentAddress: "112 Tech Hub, Chennai 600004",
    reportingManagerId: 9, reportingManager: "Sanjay Mishra", status: "active",
    joiningDate: "2023-06-01", createdBy: "Admin", createdDate: "2024-02-25",
    updatedBy: "Admin", updatedDate: "2024-02-25", lastStatusChange: "2024-02-25",
  },
];

// ── localStorage Helpers ──────────────────────────────────────────────────────

const EMPLOYEE_KEY = "ds_employees";
const EMPLOYEE_VERSION = 6;

interface StoredEmployeeData {
  version: number;
  employees: Employee[];
}

export function loadEmployees(): Employee[] {
  if (typeof window === "undefined") return [...SEED_EMPLOYEES];
  try {
    const raw = localStorage.getItem(EMPLOYEE_KEY);
    const getSeeded = () => SEED_EMPLOYEES.map(emp => {
      // Map seed employees permissions to their role template defaults
      const perms = emp.role === "HR Admin" ? fullPermissions() : roleDefaultPermissions(emp.role);
      return {
        ...emp,
        permissions: perms,
      };
    });
    if (!raw) {
      const seeded = getSeeded();
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify({ version: EMPLOYEE_VERSION, employees: seeded }));
      return seeded;
    }
    const parsed = JSON.parse(raw) as StoredEmployeeData;
    if (parsed.version !== EMPLOYEE_VERSION) {
      if (parsed.version === 5 && Array.isArray(parsed.employees)) {
        const migrated = parsed.employees.map((e: Employee) => ({
          ...e,
          documents: e.documents ?? [],
          activityLog: e.activityLog ?? [],
        }));
        localStorage.setItem(
          EMPLOYEE_KEY,
          JSON.stringify({ version: EMPLOYEE_VERSION, employees: migrated }),
        );
        return migrated;
      }
      const seeded = getSeeded();
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify({ version: EMPLOYEE_VERSION, employees: seeded }));
      return seeded;
    }
    return parsed.employees || getSeeded();
  } catch {
    return SEED_EMPLOYEES.map(emp => ({
      ...emp,
      permissions: roleDefaultPermissions(emp.role),
    }));
  }
}

export function saveEmployees(employees: Employee[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMPLOYEE_KEY, JSON.stringify({ version: EMPLOYEE_VERSION, employees }));
  } catch { /* ignore */ }
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export function generateEmployeeCSV(employees: Employee[]): string {
  const headers = ["User ID", "Name", "Email", "Mobile", "Department", "Role Type", "Role", "Status", "Joining Date", "Reporting Manager"];
  const rows = employees.map(e => [
    e.employeeId, e.fullName, e.email, e.mobile, e.department,
    e.roleType || "", e.role, e.status.toUpperCase(), e.joiningDate, e.reportingManager || "N/A",
  ]);
  return [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
}

export function downloadEmployeeCSV(employees: Employee[], filename = "users.csv"): void {
  const csv = generateEmployeeCSV(employees);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
