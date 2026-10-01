/**
 * Geography FRD workflow — coverage with effective dates, user assignment, preview, split/merge.
 */

import { loadDistributors, type Distributor } from "@/app/(app)/database/distributor/distributor-data";
import { loadEmployees, type Employee } from "@/app/(app)/user-management/employee/employee-data";
import { addAuditEntry } from "./geography-audit-data";
import {
  DEMO_DISTRIBUTORS,
  DEMO_FARMERS,
  GEOGRAPHY_WORKFLOW_SCHEMA,
  MOCK_SYSTEM_USERS,
  type DemoFarmer,
  type MockSystemUser,
} from "./geography-demo-seed";
import {
  type GeographyFormInput,
  type GeographyRecord,
  createGeography,
  getAncestorPath,
  getGeographyById,
  getParentName,
  loadGeographies,
  normalizeGeographyType,
  saveGeographies,
  todayStr,
  updateGeography,
} from "./geography-master-data";
import {
  definitionFromScope,
  getAreaDistricts,
  getCoverageDefinition,
  getParentRegionStates,
  getRegionStates,
  scopeFromDefinition,
  upsertCoverageDefinition,
  validatePostalScopeForLevel,
  type GeographyPostalScope,
} from "./geography-coverage-data";
import {
  type PincodeRecord,
  getPostalRecordCount,
  loadPincodeRecords,
  pincodeComboKey,
} from "./pincode-data";

export type SalesRole = "NSM" | "ZSM" | "RSM" | "ASM" | "TM" | "DO" | "Intern";
export type AssignmentStatus = "active" | "ended";
export type MappingStatus = "active" | "ended";

export const SALES_ROLES: SalesRole[] = ["NSM", "ZSM", "RSM", "ASM", "TM", "DO", "Intern"];
export const APPROVER_ROLE_ORDER: SalesRole[] = ["Intern", "DO", "TM", "ASM", "RSM", "ZSM", "NSM"];
export const APPROVER_CHAIN_DISPLAY: SalesRole[] = ["NSM", "ZSM", "RSM", "ASM", "TM", "DO", "Intern"];

export const ROLE_LEVEL_HINT: Record<SalesRole, string> = {
  NSM: "Assign to Zone",
  ZSM: "Assign to Region",
  RSM: "Assign to Region",
  ASM: "Assign to Area",
  TM: "Assign to Territory",
  DO: "Assign to Territory",
  Intern: "Assign to Territory",
};

export const SUGGESTED_ROLE_FOR_TYPE: Record<string, SalesRole> = {
  Zone: "NSM",
  Region: "RSM",
  Area: "ASM",
  Territory: "TM",
};

export const ROLE_REQUIRED_LEVEL: Record<SalesRole, string> = {
  NSM: "Zone",
  ZSM: "Region",
  RSM: "Region",
  ASM: "Area",
  TM: "Territory",
  DO: "Territory",
  Intern: "Territory",
};

const ASSIGNABLE_ROLE_SET = new Set<string>(SALES_ROLES);

export interface GeographyAssignableUser {
  id: number;
  employeeId: string;
  fullName: string;
  role: SalesRole;
  department: string;
  status: "active";
}

function isAssignableSalesRole(role: string): role is SalesRole {
  return ASSIGNABLE_ROLE_SET.has(role);
}

function employeeToAssignableUser(emp: Employee): GeographyAssignableUser {
  return {
    id: emp.id,
    employeeId: emp.employeeId,
    fullName: emp.fullName,
    role: emp.role as SalesRole,
    department: emp.department,
    status: "active",
  };
}

/** Active field-sales users from User Management (Employee module), optionally filtered by role. */
export function getAssignableUsersForRole(role: SalesRole): GeographyAssignableUser[] {
  return loadEmployees()
    .filter((e) => e.status === "active" && isAssignableSalesRole(e.role) && e.role === role)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map(employeeToAssignableUser);
}

export function getAssignableUserById(id: number): GeographyAssignableUser | undefined {
  const emp = loadEmployees().find((e) => e.id === id);
  if (!emp || emp.status !== "active" || !isAssignableSalesRole(emp.role)) return undefined;
  return employeeToAssignableUser(emp);
}

/** Potential reporting managers — active users with a higher sales role in the hierarchy. */
export function getAssignableManagersForRole(role: SalesRole): GeographyAssignableUser[] {
  const rank = APPROVER_ROLE_ORDER.indexOf(role);
  return loadEmployees()
    .filter((e) => e.status === "active" && isAssignableSalesRole(e.role))
    .filter((e) => APPROVER_ROLE_ORDER.indexOf(e.role as SalesRole) > rank)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map(employeeToAssignableUser);
}

export function findAssignableUserByName(fullName: string): GeographyAssignableUser | undefined {
  const emp = loadEmployees().find(
    (e) => e.status === "active" && isAssignableSalesRole(e.role) && e.fullName === fullName,
  );
  return emp ? employeeToAssignableUser(emp) : undefined;
}

const OVERRIDE_KEY = "ds_distributor_territory_overrides_v1";

export interface DistributorTerritoryOverride {
  distributorCode: string;
  overrideTerritoryId: number | null;
}

export interface BusinessImpactSummary {
  usersAffected: number;
  customersAffected: number;
  ordersAffected: number;
  pincodesAffected: number;
}

export interface PincodeCoverageMapping {
  id: number;
  pincodeKey: string;
  geographyId: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: MappingStatus;
}

export interface GeographyUserAssignment {
  id: number;
  geographyId: number;
  role: SalesRole;
  userName: string;
  parentManager: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: AssignmentStatus;
  allowSharedOwnership: boolean;
  /** DO / Intern: subset of towns within assigned territory. Empty = not scoped yet. */
  scopeTowns?: string[];
  /** DO / Intern: subset of pincode keys within assigned territory. */
  scopePincodeKeys?: string[];
}

export interface TerritoryUserApprovalPreview {
  assignedUsers: Array<{
    role: SalesRole;
    userName: string;
    geographyName: string;
    reportingManager: string | null;
  }>;
  approvalChain: Array<{
    label: string;
    role: SalesRole;
    userName: string | null;
  }>;
  missingRoleWarnings: string[];
  coverageSummary: {
    citiesSelected: number;
    townsSelected: number;
    pincodesSelected: number;
  };
}

const USER_PREVIEW_ROLES: SalesRole[] = ["ZSM", "RSM", "ASM", "TM", "DO", "Intern"];

const LEVEL_ROLE_PRIORITY: Record<string, SalesRole[]> = {
  Zone: ["NSM", "ZSM"],
  Region: ["RSM", "ZSM"],
  Area: ["ASM"],
  Territory: ["TM"],
};

function activeAssignmentAt(geographyId: number, role: SalesRole): GeographyUserAssignment | undefined {
  return loadUserAssignments().find(
    (a) => a.geographyId === geographyId && a.role === role && a.status === "active",
  );
}

function activeAssignmentForRole(
  role: SalesRole,
  pathGeoIds: number[],
): GeographyUserAssignment | undefined {
  return loadUserAssignments().find(
    (a) => pathGeoIds.includes(a.geographyId) && a.role === role && a.status === "active",
  );
}

function primaryAssignmentForGeo(
  geo: GeographyRecord,
): GeographyUserAssignment | undefined {
  const roles = LEVEL_ROLE_PRIORITY[String(geo.geographyType)] ?? [];
  for (const role of roles) {
    const assignment = activeAssignmentAt(geo.id, role);
    if (assignment) return assignment;
  }
  return loadUserAssignments().find(
    (a) => a.geographyId === geo.id && a.status === "active",
  );
}

function buildTerritoryPathNodes(
  parentAreaId: number | null,
  territoryName: string,
  territoryId?: number,
): GeographyRecord[] {
  if (territoryId != null) {
    const territory = getGeographyById(territoryId);
    if (territory) return getAncestorPath(territory);
  }
  if (parentAreaId == null) return [];
  const area = getGeographyById(parentAreaId);
  if (!area) return [];
  const ancestors = getAncestorPath(area);
  return [
    ...ancestors,
    {
      id: territoryId ?? -1,
      name: territoryName.trim() || "New Territory",
      geographyType: "Territory",
      parentId: parentAreaId,
      effectiveFrom: todayStr(),
      status: "active",
      coverageCount: 0,
      assignedUsers: 0,
      createdBy: "",
      createdDate: todayStr(),
      updatedBy: "",
      updatedDate: todayStr(),
    },
  ];
}

export function buildTerritoryUserApprovalPreview(input: {
  parentAreaId: number | null;
  territoryName: string;
  territoryId?: number;
  scope: GeographyPostalScope;
  pincodeKeys: string[];
}): TerritoryUserApprovalPreview {
  const path = buildTerritoryPathNodes(input.parentAreaId, input.territoryName, input.territoryId);
  const pathGeoIds = path.map((g) => g.id).filter((id) => id > 0);
  const territoryNode = path.find((g) => g.geographyType === "Territory");

  const assignedUsers = USER_PREVIEW_ROLES.map((role) => {
    const assignment = activeAssignmentForRole(role, pathGeoIds);
    const level = ROLE_REQUIRED_LEVEL[role];
    const defaultGeo = path.find((g) => g.geographyType === level) ?? territoryNode;
    const geo = assignment ? getGeographyById(assignment.geographyId) : defaultGeo;
    return {
      role,
      userName: assignment?.userName ?? "(Not Assigned)",
      geographyName: geo?.name ?? "—",
      reportingManager: assignment?.parentManager?.trim() ? assignment.parentManager : null,
    };
  });

  const approvalChain: TerritoryUserApprovalPreview["approvalChain"] = [];
  for (const geo of path.filter((g) => ["Zone", "Region", "Area", "Territory"].includes(String(g.geographyType)))) {
    const roles = LEVEL_ROLE_PRIORITY[String(geo.geographyType)] ?? [];
    const assignment = primaryAssignmentForGeo(geo);
    const role = (assignment?.role ?? roles[0] ?? "TM") as SalesRole;
    approvalChain.push({
      label: `${geo.name} (${role})`,
      role,
      userName: assignment?.userName ?? null,
    });
  }
  for (const role of ["DO", "Intern"] as SalesRole[]) {
    const assignment =
      territoryNode && territoryNode.id > 0
        ? activeAssignmentAt(territoryNode.id, role)
        : activeAssignmentForRole(role, pathGeoIds);
    approvalChain.push({
      label: role,
      role,
      userName: assignment?.userName ?? null,
    });
  }

  const missingRoleWarnings: string[] = [];
  for (const role of ["ASM", "TM", "DO"] as SalesRole[]) {
    const assignment = activeAssignmentForRole(role, pathGeoIds);
    if (!assignment) {
      missingRoleWarnings.push(`${role} not assigned`);
    }
  }

  return {
    assignedUsers,
    approvalChain,
    missingRoleWarnings,
    coverageSummary: {
      citiesSelected: input.scope.cities.length,
      townsSelected: input.scope.towns.length,
      pincodesSelected: input.pincodeKeys.length,
    },
  };
}

export interface DemoDistributor {
  id: string;
  code: string;
  firmName: string;
  customerType: string;
  pincode: string;
  town: string;
  city: string;
  district: string;
  state: string;
  isDemo: true;
}

export interface CoveragePreviewRow {
  distributorCode: string;
  distributorName: string;
  customerType: string;
  distributorSource: "master" | "demo";
  pincode: string;
  town: string;
  city: string;
  district: string;
  state: string;
  geographyPath: string;
  geographyId: number | null;
  territory: string;
  area: string;
  region: string;
  zone: string;
  assignedUser: string;
  approverChain: string;
  status: string;
  warnings: string[];
}

export interface FarmerPreviewRow {
  farmerCode: string;
  farmerName: string;
  pincode: string;
  town: string;
  village: string;
  territory: string;
  area: string;
  region: string;
  zone: string;
  assignedUser: string;
  status: string;
  warnings: string[];
}

export interface CustomerImpactRow {
  customerCode: string;
  customerName: string;
  customerType: string;
  customerSource: "master" | "demo";
  pincode: string;
  town: string;
  city: string;
  district: string;
  state: string;
  territory: string;
  area: string;
  region: string;
  zone: string;
  assignedUser: string;
  approverChain: string;
  status: string;
  warnings: string[];
}

export const CUSTOMER_TYPE_FILTER_OPTIONS = ["Distributor", "Farmer", "Retailer", "Dealer"] as const;

export interface BusinessGeographyChain {
  territory: string;
  area: string;
  region: string;
  zone: string;
}

export interface PincodeConflict {
  pincodeKey: string;
  pincode: string;
  town: string;
  existingGeographyId: number;
  existingGeographyName: string;
}

const COVERAGE_MAPPINGS_KEY = "ds_geography_coverage_mappings_v2";
const ASSIGNMENTS_KEY = "ds_geography_user_assignments_v2";
const WORKFLOW_DATA_SCHEMA_KEY = "ds_geography_workflow_data_schema";
export const WORKFLOW_DATA_SCHEMA = GEOGRAPHY_WORKFLOW_SCHEMA;

export const DEMO_DISTRIBUTORS_LIST: DemoDistributor[] = DEMO_DISTRIBUTORS;
export const DEMO_FARMERS_LIST: DemoFarmer[] = DEMO_FARMERS;

function normalizeKey(key: string): string {
  const parts = key.split("|");
  if (parts.length >= 5) {
    parts[4] = parts[4].toLowerCase();
    return parts.join("|");
  }
  return key.toLowerCase();
}

export function pincodeRecordKey(r: PincodeRecord): string {
  return pincodeComboKey(r.pincode, r.stateName, r.district, r.city, r.town);
}

function seedWorkflowData(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COVERAGE_MAPPINGS_KEY, JSON.stringify([]));
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify([]));
  localStorage.setItem(WORKFLOW_DATA_SCHEMA_KEY, WORKFLOW_DATA_SCHEMA);
}

export function loadCoverageMappings(): PincodeCoverageMapping[] {
  if (typeof window === "undefined") return [];
  const schema = localStorage.getItem(WORKFLOW_DATA_SCHEMA_KEY);
  if (schema !== WORKFLOW_DATA_SCHEMA) {
    seedWorkflowData();
    return [];
  }
  const stored = localStorage.getItem(COVERAGE_MAPPINGS_KEY);
  if (!stored) {
    seedWorkflowData();
    return [];
  }
  try {
    return JSON.parse(stored) as PincodeCoverageMapping[];
  } catch {
    return [];
  }
}

export function saveCoverageMappings(mappings: PincodeCoverageMapping[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COVERAGE_MAPPINGS_KEY, JSON.stringify(mappings));
  syncGeographyCoverageCounts();
}

export function loadUserAssignments(): GeographyUserAssignment[] {
  if (typeof window === "undefined") return [];
  const schema = localStorage.getItem(WORKFLOW_DATA_SCHEMA_KEY);
  if (schema !== WORKFLOW_DATA_SCHEMA) {
    seedWorkflowData();
    return [];
  }
  const stored = localStorage.getItem(ASSIGNMENTS_KEY);
  if (!stored) {
    seedWorkflowData();
    return [];
  }
  try {
    return JSON.parse(stored) as GeographyUserAssignment[];
  } catch {
    return [];
  }
}

export function saveUserAssignments(assignments: GeographyUserAssignment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  syncGeographyUserCounts();
}

export function getActiveMappingForPincode(key: string): PincodeCoverageMapping | null {
  const nk = normalizeKey(key);
  return (
    loadCoverageMappings().find(
      (m) => normalizeKey(m.pincodeKey) === nk && m.status === "active" && !m.effectiveTo,
    ) ?? null
  );
}

export function findGeographyForPincodeKey(key: string): GeographyRecord | null {
  const mapping = getActiveMappingForPincode(key);
  if (!mapping) return null;
  return getGeographyById(mapping.geographyId) ?? null;
}

export function findGeographyForPincodeRecord(record: PincodeRecord): GeographyRecord | null {
  return findGeographyForPincodeKey(pincodeRecordKey(record));
}

export function getMappedKeysForGeography(geographyId: number): string[] {
  return loadCoverageMappings()
    .filter((m) => m.geographyId === geographyId && m.status === "active" && !m.effectiveTo)
    .map((m) => m.pincodeKey);
}

export function getAllActiveMappedKeys(): Set<string> {
  return new Set(
    loadCoverageMappings()
      .filter((m) => m.status === "active" && !m.effectiveTo)
      .map((m) => normalizeKey(m.pincodeKey)),
  );
}

export function getGeographyPathLabel(geographyId: number | null): string {
  if (geographyId == null) return "—";
  const geo = getGeographyById(geographyId);
  if (!geo) return "—";
  return getAncestorPath(geo).map((g) => g.name).join(" → ");
}

/** Suggest postal state from parent Region's selected states. */
export function getSuggestedPostalStateForTerritory(geographyId: number | null): string | null {
  if (geographyId == null) return null;
  const geo = getGeographyById(geographyId);
  if (!geo) return null;
  const path = getAncestorPath(geo);
  for (const node of path) {
    if (node.geographyType === "Region") {
      const states = getRegionStates(node.id);
      if (states.length > 0) return states[0];
    }
  }
  return null;
}

export function countActivePostalRecordsForState(stateName: string): number {
  return loadPincodeRecords().filter((p) => p.status === "active" && p.stateName === stateName).length;
}

export function detectPincodeConflicts(
  geographyId: number,
  keys: string[],
): PincodeConflict[] {
  const conflicts: PincodeConflict[] = [];
  const pincodes = loadPincodeRecords();
  for (const key of keys) {
    const nk = normalizeKey(key);
    const existing = getActiveMappingForPincode(nk);
    if (existing && existing.geographyId !== geographyId) {
      const rec = pincodes.find((p) => normalizeKey(pincodeRecordKey(p)) === nk);
      const geo = getGeographyById(existing.geographyId);
      conflicts.push({
        pincodeKey: nk,
        pincode: rec?.pincode ?? key.split("|")[0],
        town: rec?.town ?? "",
        existingGeographyId: existing.geographyId,
        existingGeographyName: geo?.name ?? "Unknown",
      });
    }
  }
  return conflicts;
}

export function saveCoverageWithEffectiveDate(
  geographyId: number,
  keys: string[],
  effectiveFrom: string,
  conflictResolutions: Record<string, "keep" | "move">,
): void {
  const all = loadCoverageMappings();
  let nextId = Math.max(0, ...all.map((m) => m.id)) + 1;
  const next = [...all];
  const geoName = getGeographyById(geographyId)?.name ?? String(geographyId);

  for (const key of keys) {
    const nk = normalizeKey(key);
    const resolution = conflictResolutions[nk] ?? "move";
    const existing = getActiveMappingForPincode(nk);

    if (existing && existing.geographyId !== geographyId) {
      if (resolution === "keep") continue;
      const idx = next.findIndex((m) => m.id === existing.id);
      if (idx >= 0) {
        next[idx] = { ...next[idx], effectiveTo: effectiveFrom, status: "ended" };
        const oldGeo = getGeographyById(existing.geographyId)?.name;
        addAuditEntry({
          actionType: "Pincode Reassigned",
          oldGeography: oldGeo,
          newGeography: geoName,
          pincode: key.split("|")[0],
          effectiveFrom,
          effectiveTo: effectiveFrom,
          remarks: `Pincode moved from ${oldGeo} to ${geoName} effective ${effectiveFrom}.`,
        });
      }
    }

    const alreadyHere = next.find(
      (m) =>
        normalizeKey(m.pincodeKey) === nk &&
        m.geographyId === geographyId &&
        m.status === "active" &&
        !m.effectiveTo,
    );
    if (!alreadyHere) {
      next.push({
        id: nextId++,
        pincodeKey: nk,
        geographyId,
        effectiveFrom,
        effectiveTo: null,
        status: "active",
      });
      addAuditEntry({
        actionType: "Coverage Added",
        newGeography: geoName,
        pincode: key.split("|")[0],
        effectiveFrom,
        remarks: `Pincode mapped to ${geoName}.`,
      });
    }
  }

  saveCoverageMappings(next);
}

export function getUsersForGeography(geographyId: number): GeographyUserAssignment[] {
  return loadUserAssignments().filter(
    (a) => a.geographyId === geographyId && a.status === "active",
  );
}

export function getUsersForGeographyTree(geographyId: number): GeographyUserAssignment[] {
  const geo = getGeographyById(geographyId);
  if (!geo) return [];
  const pathIds = new Set(getAncestorPath(geo).map((g) => g.id));
  return loadUserAssignments().filter(
    (a) => pathIds.has(a.geographyId) && a.status === "active",
  );
}

export function assignUser(input: Omit<GeographyUserAssignment, "id">): GeographyUserAssignment {
  const all = loadUserAssignments();
  const id = Math.max(0, ...all.map((a) => a.id)) + 1;
  const record: GeographyUserAssignment = { ...input, id };
  saveUserAssignments([...all, record]);
  addAuditEntry({
    actionType: "User Assigned",
    newGeography: getGeographyById(input.geographyId)?.name,
    user: `${input.userName} (${input.role})`,
    effectiveFrom: input.effectiveFrom,
    remarks: `${input.role} assigned to ${getGeographyPathLabel(input.geographyId)}.`,
  });
  return record;
}

export function endUserAssignment(id: number, effectiveTo: string): void {
  const all = loadUserAssignments();
  const idx = all.findIndex((a) => a.id === id);
  if (idx < 0) return;
  const a = all[idx];
  const next = [...all];
  next[idx] = { ...a, effectiveTo, status: "ended" };
  saveUserAssignments(next);
  addAuditEntry({
    actionType: "Assignment Ended",
    newGeography: getGeographyById(a.geographyId)?.name,
    user: `${a.userName} (${a.role})`,
    effectiveTo,
    remarks: `Assignment ended effective ${effectiveTo}.`,
  });
}

export function validateUserAssignment(input: {
  geographyId: number;
  role: SalesRole;
  userName: string;
  userRole?: SalesRole;
  effectiveFrom: string;
  allowSharedOwnership: boolean;
  excludeId?: number;
}): string[] {
  const messages: string[] = [];
  const geo = getGeographyById(input.geographyId);
  if (geo) {
    const required = ROLE_REQUIRED_LEVEL[input.role];
    if (required && geo.geographyType !== required) {
      messages.push(
        `Cannot assign ${input.role} to ${geo.geographyType}. ${input.role} must be assigned to ${required}.`,
      );
    }
  }
  if (input.userRole && input.userRole !== input.role) {
    messages.push(`Cannot assign ${input.userRole} user as ${input.role}. Select a user with role ${input.role}.`);
  } else if (input.userName.trim()) {
    const matched = findAssignableUserByName(input.userName.trim());
    if (matched && matched.role !== input.role) {
      messages.push(`Cannot assign ${matched.role} user as ${input.role}. Select a user with role ${input.role}.`);
    }
  }
  if (!input.allowSharedOwnership) {
    const dup = loadUserAssignments().find(
      (a) =>
        a.id !== input.excludeId &&
        a.geographyId === input.geographyId &&
        a.role === input.role &&
        a.status === "active" &&
        !a.effectiveTo,
    );
    if (dup) {
      messages.push(
        `Active ${input.role} already assigned to this geography (${dup.userName}). Enable Allow Shared Ownership to proceed.`,
      );
    }
  }
  if (!input.effectiveFrom.trim()) {
    messages.push("Effective Date is required.");
  }
  if (!input.userName.trim()) {
    messages.push("User is required.");
  }
  return messages;
}

export function isUserAssignmentBlocking(messages: string[]): boolean {
  return messages.some(
    (m) =>
      !m.startsWith("Warning:") &&
      (m.includes("required") ||
        m.includes("Enable Allow Shared") ||
        m.includes("already assigned") ||
        m.startsWith("Cannot assign")),
  );
}

export function buildApproverChain(geographyId: number | null): string {
  if (geographyId == null) return "—";
  const geo = getGeographyById(geographyId);
  if (!geo) return "—";
  const pathIds = getAncestorPath(geo).map((g) => g.id);
  const assignments = loadUserAssignments()
    .filter((a) => pathIds.includes(a.geographyId) && a.status === "active")
    .sort(
      (a, b) =>
        APPROVER_CHAIN_DISPLAY.indexOf(a.role) - APPROVER_CHAIN_DISPLAY.indexOf(b.role),
    );
  if (assignments.length === 0) return "—";
  return assignments.map((a) => `${a.role}: ${a.userName}`).join(" → ");
}

export function getApproverChainWarnings(geographyId: number): string[] {
  const warnings: string[] = [];
  const geo = getGeographyById(geographyId);
  if (!geo) return warnings;
  const pathIds = getAncestorPath(geo).map((g) => g.id);
  const assigned = new Set(
    loadUserAssignments()
      .filter((a) => pathIds.includes(a.geographyId) && a.status === "active")
      .map((a) => a.role),
  );
  for (const role of ["TM", "ASM", "RSM", "NSM"] as SalesRole[]) {
    if (!assigned.has(role)) {
      warnings.push("Approval Chain Incomplete");
      break;
    }
  }
  return warnings;
}

export function formatAssignedUser(geographyId: number | null): string {
  if (geographyId == null) return "—";
  const direct = getUsersForGeography(geographyId);
  if (direct.length === 0) return "—";
  return direct.map((u) => formatAssignmentLabel(u)).join(", ");
}

export function formatAssignmentLabel(u: GeographyUserAssignment): string {
  const scope =
    u.scopeTowns?.length || u.scopePincodeKeys?.length
      ? ` (${u.scopeTowns?.length ? `${u.scopeTowns.length} towns` : ""}${u.scopeTowns?.length && u.scopePincodeKeys?.length ? ", " : ""}${u.scopePincodeKeys?.length ? `${u.scopePincodeKeys.length} pincodes` : ""})`
      : "";
  return `${u.role}: ${u.userName}${scope}`;
}

/** Read-only assigned users for Business Geography listing. */
export function formatAssignedUsersForGeography(geographyId: number): string {
  const users = getUsersForGeography(geographyId);
  if (users.length === 0) return "—";
  return users.map((u) => formatAssignmentLabel(u)).join(" · ");
}


function loadDistributorOverrides(): DistributorTerritoryOverride[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(OVERRIDE_KEY);
  if (!stored) {
    const seed: DistributorTerritoryOverride[] = [
      { distributorCode: "D-BOM-002", overrideTerritoryId: null },
    ];
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(stored) as DistributorTerritoryOverride[];
  } catch {
    return [];
  }
}

function saveDistributorOverrides(rows: DistributorTerritoryOverride[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(rows));
}

export function getDistributorOverride(distributorCode: string): number | null {
  return loadDistributorOverrides().find((o) => o.distributorCode === distributorCode)?.overrideTerritoryId ?? null;
}

export function setDistributorOverride(distributorCode: string, territoryId: number | null): void {
  const all = loadDistributorOverrides().filter((o) => o.distributorCode !== distributorCode);
  if (territoryId != null) all.push({ distributorCode, overrideTerritoryId: territoryId });
  saveDistributorOverrides(all);
}

export function getBusinessGeographyChain(geographyId: number | null): BusinessGeographyChain {
  const empty = { territory: "—", area: "—", region: "—", zone: "—" };
  if (geographyId == null) return empty;
  const geo = getGeographyById(geographyId);
  if (!geo) return empty;
  const path = getAncestorPath(geo);
  const byType = (type: string) => path.find((g) => g.geographyType === type)?.name ?? "—";
  return {
    territory: geo.geographyType === "Territory" ? geo.name : byType("Territory"),
    area: byType("Area"),
    region: byType("Region"),
    zone: byType("Zone"),
  };
}

export function resolveDerivedTerritoryForPincode(pincode: string): GeographyRecord | null {
  const rec = loadPincodeRecords().find((p) => p.pincode === pincode.trim() && p.status === "active");
  if (!rec) return null;
  return findGeographyForPincodeRecord(rec);
}

export function getDescendantTerritoryIds(geographyId: number): number[] {
  const geos = loadGeographies();
  const geo = getGeographyById(geographyId);
  if (!geo) return [];
  if (geo.geographyType === "Territory") return [geographyId];
  const result: number[] = [];
  function walk(parentId: number) {
    for (const child of geos.filter((g) => g.parentId === parentId && g.status === "active")) {
      if (child.geographyType === "Territory") result.push(child.id);
      else walk(child.id);
    }
  }
  walk(geographyId);
  return result;
}

export function getInheritedPincodeKeys(geographyId: number): string[] {
  const keys = new Set<string>();
  for (const tid of getDescendantTerritoryIds(geographyId)) {
    for (const k of getMappedKeysForGeography(tid)) {
      keys.add(normalizeKey(k));
    }
  }
  return [...keys];
}

export function getCoverageModeLabel(geographyId: number): string {
  const geo = getGeographyById(geographyId);
  if (!geo) return "—";
  if (geo.geographyType === "Territory") return "Direct";
  return "Inherited";
}

export function formatGeographyCoverageCount(geographyId: number): string {
  const geo = getGeographyById(geographyId);
  if (!geo) return "0 Pincodes";
  const count =
    geo.geographyType === "Territory"
      ? getMappedKeysForGeography(geographyId).length
      : getInheritedPincodeKeys(geographyId).length;
  return `${count} Pincode${count === 1 ? "" : "s"}`;
}

export function getTerritoryOptionsFlat(): Array<{ id: number; label: string }> {
  return loadGeographies()
    .filter((g) => g.status === "active" && g.geographyType === "Territory")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({ id: g.id, label: `${g.name} (Territory)` }));
}

export type SplitMergeLevel = "Zone" | "Region" | "Area" | "Territory";

export const SPLIT_MERGE_LEVELS: SplitMergeLevel[] = ["Zone", "Region", "Area", "Territory"];

/** Allocation target index for keeping scope in the existing source geography. */
export const SOURCE_GEO_ALLOC_INDEX = -1;

export function getGeographyOptionsForSplitMerge(
  level: SplitMergeLevel,
): Array<{ id: number; label: string }> {
  return loadGeographies()
    .filter((g) => g.status === "active" && g.geographyType === level)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({ id: g.id, label: `${g.name} (${g.geographyType})` }));
}

export type SplittableScopeKind =
  | "region"
  | "state"
  | "district"
  | "territory"
  | "town"
  | "city"
  | "pincode";

export interface SplittableScopeItem {
  key: string;
  label: string;
  sublabel?: string;
  kind: SplittableScopeKind;
}

export function getChildGeographiesOfType(
  parentId: number,
  childType: GeographyRecord["geographyType"],
): GeographyRecord[] {
  return loadGeographies()
    .filter((g) => g.parentId === parentId && g.status === "active" && g.geographyType === childType)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** States (Region), districts/territories (Area), regions (Zone), or pincode keys (Territory). */
export function getSplittableScopeItems(geographyId: number): SplittableScopeItem[] {
  const geo = getGeographyById(geographyId);
  const def = getCoverageDefinition(geographyId);
  if (!geo) return [];

  if (geo.geographyType === "Zone") {
    return getChildGeographiesOfType(geographyId, "Region").map((r) => ({
      key: `region:${r.id}`,
      label: r.name,
      sublabel: "Region",
      kind: "region" as const,
    }));
  }

  if (geo.geographyType === "Region" && def) {
    const items: SplittableScopeItem[] = def.states.map((s) => ({
      key: `state:${s}`,
      label: s,
      kind: "state" as const,
    }));
    for (const area of getChildGeographiesOfType(geographyId, "Area")) {
      items.push({
        key: `area:${area.id}`,
        label: area.name,
        sublabel: "Area",
        kind: "district" as const,
      });
    }
    return items;
  }

  if (geo.geographyType === "Area" && def) {
    const items: SplittableScopeItem[] = def.districts.map((d) => ({
      key: `district:${d}`,
      label: d,
      kind: "district" as const,
    }));
    for (const territory of getChildGeographiesOfType(geographyId, "Territory")) {
      items.push({
        key: `territory:${territory.id}`,
        label: territory.name,
        sublabel: "Territory",
        kind: "territory" as const,
      });
    }
    return items;
  }

  const townSet = new Set<string>();
  return getMappedKeysForGeography(geographyId).map((key) => {
    const rec = loadPincodeRecords().find(
      (p) => pincodeComboKey(p.pincode, p.stateName, p.district, p.city, p.town) === key,
    );
    if (rec) townSet.add(rec.town);
    return {
      key: `pincode:${key}`,
      label: rec?.town ?? rec?.pincode ?? key.split("|")[0],
      sublabel: rec ? `${rec.pincode}${rec.city ? ` · ${rec.city}` : ""}` : undefined,
      kind: "pincode" as const,
    };
  });
}

export function getScopeItemPincodeKeys(item: SplittableScopeItem, geographyId: number): string[] {
  const geo = getGeographyById(geographyId);
  if (!geo) return [];

  if (item.kind === "pincode") {
    const raw = item.key.replace(/^pincode:/, "");
    return [raw];
  }

  if (item.kind === "state") {
    const state = item.key.replace(/^state:/, "");
    return loadPincodeRecords()
      .filter((p) => p.status === "active" && p.stateName === state)
      .map((p) => pincodeComboKey(p.pincode, p.stateName, p.district, p.city, p.town));
  }

  if (item.kind === "district") {
    const district = item.key.replace(/^district:/, "");
    const def = getCoverageDefinition(geographyId);
    const regionId = geo.parentId;
    const regionStates = regionId ? getRegionStates(regionId) : [];
    return loadPincodeRecords()
      .filter(
        (p) =>
          p.status === "active" &&
          p.district === district &&
          (regionStates.length === 0 || regionStates.includes(p.stateName)),
      )
      .map((p) => pincodeComboKey(p.pincode, p.stateName, p.district, p.city, p.town));
  }

  if (item.kind === "territory") {
    const territoryId = Number(item.key.replace(/^territory:/, ""));
    return getMappedKeysForGeography(territoryId);
  }

  if (item.kind === "region") {
    const regionId = Number(item.key.replace(/^region:/, ""));
    return getInheritedPincodeKeys(regionId);
  }

  return [];
}

export function resolvePincodeKeysForAllocatedScope(
  items: SplittableScopeItem[],
  geographyId: number,
): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    for (const k of getScopeItemPincodeKeys(item, geographyId)) {
      keys.add(normalizeKey(k));
    }
  }
  return [...keys];
}

export function getRolesForSplitMergeLevel(level: SplitMergeLevel): SalesRole[] {
  switch (level) {
    case "Zone":
      return ["NSM", "ZSM"];
    case "Region":
      return ["RSM", "ZSM"];
    case "Area":
      return ["ASM"];
    case "Territory":
      return ["TM", "DO", "Intern"];
    default:
      return [];
  }
}

export type PostalMasterScopeKind = "state" | "district" | "city" | "town" | "pincode";

export interface PostalMasterScopeOption {
  key: string;
  label: string;
  kind: PostalMasterScopeKind;
  inPostalMaster: boolean;
}

function activePostalRecords() {
  return loadPincodeRecords().filter((p) => p.status === "active");
}

/** Postal master options not currently assigned under the source geography scope. */
export function getUnassignedPostalMasterOptions(
  level: SplitMergeLevel,
  sourceGeographyId: number,
  currentScopeKeys: string[],
): PostalMasterScopeOption[] {
  const geo = getGeographyById(sourceGeographyId);
  if (!geo) return [];

  const currentKeys = new Set(currentScopeKeys);
  const records = activePostalRecords();
  const options: PostalMasterScopeOption[] = [];

  if (level === "Region") {
    const assignedStates = new Set(
      currentScopeKeys.filter((k) => k.startsWith("state:")).map((k) => k.replace(/^state:/, "")),
    );
    const allStates = [...new Set(records.map((p) => p.stateName))].sort();
    for (const state of allStates) {
      if (!assignedStates.has(state)) {
        options.push({
          key: `state:${state}`,
          label: state,
          kind: "state",
          inPostalMaster: true,
        });
      }
    }
    return options;
  }

  if (level === "Area") {
    const assignedDistricts = new Set(
      currentScopeKeys.filter((k) => k.startsWith("district:")).map((k) => k.replace(/^district:/, "")),
    );
    const regionStates = geo.parentId ? getRegionStates(geo.parentId) : [];
    const districts = [
      ...new Set(
        records
          .filter((p) => regionStates.length === 0 || regionStates.includes(p.stateName))
          .map((p) => p.district),
      ),
    ].sort();
    for (const district of districts) {
      if (!assignedDistricts.has(district)) {
        options.push({ key: `district:${district}`, label: district, kind: "district", inPostalMaster: true });
      }
    }
    return options;
  }

  if (level === "Territory") {
    const assignedPinKeys = new Set(
      currentScopeKeys
        .filter((k) => k.startsWith("pincode:"))
        .map((k) => normalizeKey(k.replace(/^pincode:/, ""))),
    );
    const area = geo.parentId ? getGeographyById(geo.parentId) : null;
    const regionStates = area?.parentId ? getRegionStates(area.parentId) : [];
    const areaDistricts = area ? getAreaDistricts(area.id) : [];
    for (const p of records) {
      if (regionStates.length && !regionStates.includes(p.stateName)) continue;
      if (areaDistricts.length && !areaDistricts.includes(p.district)) continue;
      const key = pincodeComboKey(p.pincode, p.stateName, p.district, p.city, p.town);
      if (!assignedPinKeys.has(normalizeKey(key))) {
        options.push({
          key: `pincode:${key}`,
          label: `${p.town} (${p.pincode})`,
          kind: "pincode",
          inPostalMaster: true,
        });
      }
    }
    return options;
  }

  return options;
}

export function postalMasterScopeToSplittable(item: PostalMasterScopeOption): SplittableScopeItem {
  return {
    key: item.key,
    label: item.label,
    kind:
      item.kind === "state"
        ? "state"
        : item.kind === "district"
          ? "district"
          : item.kind === "pincode"
            ? "pincode"
            : item.kind === "town"
              ? "town"
              : "city",
  };
}

export function isPostalMasterScopeAvailable(
  level: SplitMergeLevel,
  scopeLabel: string,
): { available: boolean; message?: string } {
  const records = activePostalRecords();
  if (level === "Region") {
    const found = records.some((p) => p.stateName === scopeLabel);
    if (!found) {
      return {
        available: false,
        message: `${scopeLabel} is not available in Postal Master. Please add/upload ${scopeLabel} postal records first.`,
      };
    }
    return { available: true };
  }
  if (level === "Area") {
    const found = records.some((p) => p.district === scopeLabel);
    if (!found) {
      return {
        available: false,
        message: `${scopeLabel} is not available in Postal Master. Please add/upload ${scopeLabel} postal records first.`,
      };
    }
    return { available: true };
  }
  return { available: true };
}

export interface SplitMergeResultPreview {
  key: string;
  name: string;
  level: SplitMergeLevel;
  parentName: string;
  isExisting: boolean;
  assignedScopeLabels: string[];
  pincodeCount: number;
  customerCount: number;
  customers: CustomerImpactRow[];
  usersByRole: Array<{ role: SalesRole; userName: string | null; status: "assigned" | "missing" }>;
  approvalChain: Array<{ role: SalesRole; userName: string | null }>;
  warnings: string[];
}

export function buildSplitMergeResultPreviews(input: {
  mode: "split" | "merge";
  level: SplitMergeLevel;
  sourceGeographyId: number | null;
  resultGeographies: Array<{ key: string; name: string; isExisting: boolean }>;
  scopeItems: SplittableScopeItem[];
  allocations: Record<string, number>;
  mergeTargetName?: string;
}): SplitMergeResultPreview[] {
  const sourceGeo = input.sourceGeographyId != null ? getGeographyById(input.sourceGeographyId) : null;
  const parentName = sourceGeo?.parentId != null ? getParentName(sourceGeo.parentId) : "—";

  if (input.mode === "merge" && input.mergeTargetName) {
    const allKeys = resolvePincodeKeysForAllocatedScope(input.scopeItems, input.sourceGeographyId ?? 0);
    const pinSet = new Set(allKeys.map((k) => k.split("|")[0]));
    const customers = buildCustomerImpactRows().filter(
      (r) => r.customerName !== "—" && pinSet.has(r.pincode),
    );
    const roles = getRolesForSplitMergeLevel(input.level);
    const usersByRole = roles.map((role) => {
      const assignment = input.sourceGeographyId
        ? loadUserAssignments().find(
            (a) =>
              a.role === role &&
              a.status === "active" &&
              getUsersForGeographyTree(input.sourceGeographyId!).some((u) => u.id === a.id),
          )
        : undefined;
      return {
        role,
        userName: assignment?.userName ?? null,
        status: assignment ? ("assigned" as const) : ("missing" as const),
      };
    });
    const warnings: string[] = [];
    for (const u of usersByRole) {
      if (!u.userName) warnings.push(`${u.role} not assigned for merged geography`);
    }
    return [
      {
        key: "merge-target",
        name: input.mergeTargetName,
        level: input.level,
        parentName,
        isExisting: false,
        assignedScopeLabels: input.scopeItems.map((s) => s.label),
        pincodeCount: allKeys.length,
        customerCount: customers.length,
        customers,
        usersByRole,
        approvalChain: roles.map((role) => ({
          role,
          userName: usersByRole.find((u) => u.role === role)?.userName ?? null,
        })),
        warnings,
      },
    ];
  }

  return input.resultGeographies.map((rg) => {
    const newGeoIndex = rg.isExisting
      ? SOURCE_GEO_ALLOC_INDEX
      : input.resultGeographies.filter((r) => !r.isExisting).findIndex((r) => r.key === rg.key);
    const allocatedItems = input.scopeItems.filter((item) => {
      const target = input.allocations[item.key] ?? SOURCE_GEO_ALLOC_INDEX;
      if (rg.isExisting) return target === SOURCE_GEO_ALLOC_INDEX;
      return target === newGeoIndex;
    });
    const pincodeKeys = resolvePincodeKeysForAllocatedScope(
      allocatedItems,
      input.sourceGeographyId ?? 0,
    );
    const pinSet = new Set(pincodeKeys.map((k) => k.split("|")[0]));
    const customers = buildCustomerImpactRows().filter(
      (r) => r.customerName !== "—" && pinSet.has(r.pincode),
    );
    const geoId = rg.isExisting && input.sourceGeographyId ? input.sourceGeographyId : null;
    const roles = getRolesForSplitMergeLevel(input.level);
    const usersByRole = roles.map((role) => {
      const assignment =
        geoId != null
          ? loadUserAssignments().find(
              (a) => a.geographyId === geoId && a.role === role && a.status === "active",
            )
          : undefined;
      return {
        role,
        userName: assignment?.userName ?? null,
        status: assignment ? ("assigned" as const) : ("missing" as const),
      };
    });
    const warnings: string[] = [];
    for (const u of usersByRole) {
      if (!u.userName && !rg.isExisting) warnings.push(`${u.role} missing`);
    }
    if (!rg.isExisting && customers.length > 0) {
      warnings.push(`${customers.length} customers will move to this new ${input.level.toLowerCase()}`);
    }
    if (!rg.isExisting && usersByRole.every((u) => !u.userName)) {
      warnings.push(`No active approver chain for this ${input.level.toLowerCase()}`);
    }
    return {
      key: rg.key,
      name: rg.name,
      level: input.level,
      parentName,
      isExisting: rg.isExisting,
      assignedScopeLabels: allocatedItems.map((s) => s.label),
      pincodeCount: pincodeKeys.length,
      customerCount: customers.length,
      customers,
      usersByRole,
      approvalChain: roles.map((role) => ({
        role,
        userName: usersByRole.find((u) => u.role === role)?.userName ?? null,
      })),
      warnings,
    };
  });
}

export function getGeographyOptionsForRole(role: SalesRole): Array<{ id: number; label: string }> {
  const level = ROLE_REQUIRED_LEVEL[role];
  return loadGeographies()
    .filter((g) => g.status === "active" && g.geographyType === level)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({ id: g.id, label: `${g.name} (${g.geographyType})` }));
}

export function computeBusinessImpact(geographyId: number, pincodeKeys?: string[]): BusinessImpactSummary {
  const keys =
    pincodeKeys ??
    (getGeographyById(geographyId)?.geographyType === "Territory"
      ? getMappedKeysForGeography(geographyId)
      : getInheritedPincodeKeys(geographyId));
  const pincodes = keys.map((k) => k.split("|")[0]);
  const users = getUsersForGeographyTree(geographyId);
  const customers = buildCustomerImpactRows().filter(
    (r) => r.customerName !== "—" && pincodes.includes(r.pincode),
  );
  const ordersAffected = customers.length * 4;
  return {
    usersAffected: users.length,
    customersAffected: customers.length,
    ordersAffected,
    pincodesAffected: keys.length,
  };
}

function resolveDistributorsForPincode(pincode: string): Array<{
  code: string;
  name: string;
  customerType: string;
  source: "master" | "demo";
}> {
  const results: Array<{ code: string; name: string; customerType: string; source: "master" | "demo" }> = [];
  for (const d of loadDistributors().filter((dd) => dd.pincode.trim() === pincode.trim())) {
    results.push({ code: `MST-${d.id}`, name: d.firmName, customerType: "Distributor", source: "master" });
  }
  for (const d of DEMO_DISTRIBUTORS_LIST.filter((dd) => dd.pincode === pincode.trim())) {
    results.push({ code: d.code, name: d.firmName, customerType: d.customerType, source: "demo" });
  }
  return results;
}

export function buildCoveragePreviewRows(filters?: {
  geographyId?: number | null;
  user?: string;
  state?: string;
  district?: string;
  city?: string;
  town?: string;
  pincode?: string;
}): CoveragePreviewRow[] {
  let pincodes = loadPincodeRecords().filter((p) => p.status === "active");
  if (filters?.state) pincodes = pincodes.filter((p) => p.stateName === filters.state);
  if (filters?.district) pincodes = pincodes.filter((p) => p.district === filters.district);
  if (filters?.city) pincodes = pincodes.filter((p) => p.city === filters.city);
  if (filters?.town) pincodes = pincodes.filter((p) => p.town === filters.town);
  if (filters?.pincode) pincodes = pincodes.filter((p) => p.pincode.includes(filters.pincode!));

  const rows: CoveragePreviewRow[] = [];

  for (const p of pincodes) {
    const geo = findGeographyForPincodeRecord(p);
    if (filters?.geographyId != null) {
      if (!geo) continue;
      const path = getAncestorPath(geo);
      if (!path.some((g) => g.id === filters.geographyId)) continue;
    }
    const assignedUser = formatAssignedUser(geo?.id ?? null);
    if (filters?.user && !assignedUser.toLowerCase().includes(filters.user.toLowerCase())) continue;

    const warnings: string[] = [];
    if (!geo) warnings.push("Unmapped Pincode");
    if (geo && assignedUser === "—") warnings.push("No User Assigned");
    if (geo) warnings.push(...getApproverChainWarnings(geo.id));

    const activeKeys = getAllActiveMappedKeys();
    const key = pincodeRecordKey(p);
    const mappings = loadCoverageMappings().filter(
      (m) => normalizeKey(m.pincodeKey) === normalizeKey(key) && m.status === "active",
    );
    if (mappings.length > 1) warnings.push("Conflict Pincode");

    const distributors = resolveDistributorsForPincode(p.pincode);
    const chain = getBusinessGeographyChain(geo?.id ?? null);
    const base = {
      pincode: p.pincode,
      town: p.town,
      city: p.city,
      district: p.district,
      state: p.stateName,
      geographyPath: geo ? getGeographyPathLabel(geo.id) : "Unmapped",
      geographyId: geo?.id ?? null,
      territory: chain.territory,
      area: chain.area,
      region: chain.region,
      zone: chain.zone,
      assignedUser: formatAssignedUser(geo?.id ?? null),
      approverChain: buildApproverChain(geo?.id ?? null),
      status: geo ? "Mapped" : "Unmapped",
      warnings,
    };

    if (distributors.length === 0) {
      rows.push({
        distributorCode: "—",
        distributorName: "—",
        customerType: "—",
        distributorSource: "master",
        ...base,
      });
    } else {
      for (const d of distributors) {
        rows.push({
          distributorCode: d.code,
          distributorName: d.source === "demo" ? `${d.name} (Demo)` : d.name,
          customerType: d.customerType,
          distributorSource: d.source,
          ...base,
        });
      }
    }
  }

  return rows.sort((a, b) => a.pincode.localeCompare(b.pincode));
}

function dedupeWarnings(warnings: string[]): string[] {
  return [...new Set(warnings)];
}

/** Unified customer impact rows — distributors, farmers, and unmapped pincode placeholders. */
export function buildCustomerImpactRows(filters?: {
  geographyId?: number | null;
  user?: string;
  customerType?: string;
  state?: string;
  district?: string;
  city?: string;
  town?: string;
  pincode?: string;
}): CustomerImpactRow[] {
  const distributorRows = buildCoveragePreviewRows(filters);
  const farmerRows = buildFarmerPreviewRows(filters);
  const customers: CustomerImpactRow[] = [];

  for (const r of distributorRows) {
    if (r.distributorName === "—") continue;
    customers.push({
      customerCode: r.distributorCode,
      customerName: r.distributorName,
      customerType: r.customerType,
      customerSource: r.distributorSource,
      pincode: r.pincode,
      town: r.town,
      city: r.city,
      district: r.district,
      state: r.state,
      territory: r.territory,
      area: r.area,
      region: r.region,
      zone: r.zone,
      assignedUser: r.assignedUser,
      approverChain: r.approverChain,
      status: r.status,
      warnings: dedupeWarnings(r.warnings),
    });
  }

  for (const f of farmerRows) {
    const geo = resolveDerivedTerritoryForPincode(f.pincode);
    customers.push({
      customerCode: f.farmerCode,
      customerName: f.farmerName,
      customerType: "Farmer",
      customerSource: "demo",
      pincode: f.pincode,
      town: f.town,
      city: loadPincodeRecords().find((p) => p.pincode === f.pincode)?.city ?? "—",
      district: loadPincodeRecords().find((p) => p.pincode === f.pincode)?.district ?? "—",
      state: loadPincodeRecords().find((p) => p.pincode === f.pincode)?.stateName ?? "—",
      territory: f.territory,
      area: f.area,
      region: f.region,
      zone: f.zone,
      assignedUser: f.assignedUser,
      approverChain: buildApproverChain(geo?.id ?? null),
      status: f.status,
      warnings: dedupeWarnings([
        ...f.warnings,
        ...(geo ? getApproverChainWarnings(geo.id) : []),
      ]),
    });
  }

  const pincodeWithCustomer = new Set(customers.map((c) => `${c.pincode}|${c.customerCode}`));
  for (const r of distributorRows) {
    if (r.distributorName !== "—") continue;
    const hasFarmer = farmerRows.some((f) => f.pincode === r.pincode);
    if (hasFarmer) continue;
    const key = `${r.pincode}|—`;
    if (pincodeWithCustomer.has(key)) continue;
    pincodeWithCustomer.add(key);
    customers.push({
      customerCode: "—",
      customerName: "—",
      customerType: "—",
      customerSource: "master",
      pincode: r.pincode,
      town: r.town,
      city: r.city,
      district: r.district,
      state: r.state,
      territory: r.territory,
      area: r.area,
      region: r.region,
      zone: r.zone,
      assignedUser: r.assignedUser,
      approverChain: r.approverChain,
      status: r.status,
      warnings: dedupeWarnings([...r.warnings, "No Customer Found"]),
    });
  }

  let result = customers;
  if (filters?.customerType) {
    result = result.filter((r) => r.customerType === filters.customerType);
  }
  if (filters?.user) {
    const q = filters.user.toLowerCase();
    result = result.filter((r) => r.assignedUser.toLowerCase().includes(q));
  }

  return result.sort((a, b) => a.pincode.localeCompare(b.pincode) || a.customerName.localeCompare(b.customerName));
}

export function buildFarmerPreviewRows(filters?: {
  geographyId?: number | null;
  state?: string;
  district?: string;
  city?: string;
  town?: string;
  pincode?: string;
}): FarmerPreviewRow[] {
  let farmers = [...DEMO_FARMERS_LIST];
  if (filters?.pincode) farmers = farmers.filter((f) => f.pincode.includes(filters.pincode!));
  if (filters?.town) farmers = farmers.filter((f) => f.town === filters.town);

  const rows: FarmerPreviewRow[] = [];

  for (const f of farmers) {
    const rec = loadPincodeRecords().find((p) => p.pincode === f.pincode && p.status === "active");
    if (filters?.state && rec && rec.stateName !== filters.state) continue;
    if (filters?.district && rec && rec.district !== filters.district) continue;
    if (filters?.city && rec && rec.city !== filters.city) continue;

    const geo = resolveDerivedTerritoryForPincode(f.pincode);
    if (filters?.geographyId != null) {
      if (!geo) continue;
      const path = getAncestorPath(geo);
      if (!path.some((g) => g.id === filters.geographyId)) continue;
    }

    const chain = getBusinessGeographyChain(geo?.id ?? null);
    const warnings: string[] = [];
    if (!geo) warnings.push("Unmapped Pincode");
    if (geo && formatAssignedUser(geo.id) === "—") warnings.push("No User Assigned");

    rows.push({
      farmerCode: f.code,
      farmerName: f.name,
      pincode: f.pincode,
      town: f.town,
      village: f.village,
      territory: chain.territory,
      area: chain.area,
      region: chain.region,
      zone: chain.zone,
      assignedUser: formatAssignedUser(geo?.id ?? null),
      status: geo ? "Auto-derived" : "Unmapped",
      warnings,
    });
  }

  return rows.sort((a, b) => a.pincode.localeCompare(b.pincode));
}

export function syncGeographyCoverageCounts(): void {
  if (typeof window === "undefined") return;
  const mappings = loadCoverageMappings();
  const geos = loadGeographies();
  const next = geos.map((g) => {
    if (g.geographyType === "Territory") {
      const direct = mappings.filter(
        (m) => m.geographyId === g.id && m.status === "active" && !m.effectiveTo,
      ).length;
      return { ...g, coverageCount: direct, coverageType: "Direct" as const };
    }
    const inherited = getInheritedPincodeKeys(g.id).length;
    return { ...g, coverageCount: inherited, coverageType: "Inherited" as const };
  });
  saveGeographies(next);
}

export function saveBusinessGeography(
  form: GeographyFormInput,
  options?: { geographyId?: number },
): GeographyRecord {
  const level = normalizeGeographyType(form.geographyType);
  const scope: GeographyPostalScope = {
    states: form.postalScope?.states ?? [],
    districts: form.postalScope?.districts ?? [],
    cities: form.postalScope?.cities ?? [],
    towns: form.postalScope?.towns ?? [],
    pincodeKeys: form.postalScope?.pincodeKeys ?? [],
  };

  const areaDistricts =
    level === "Territory" && form.parentId != null ? getAreaDistricts(form.parentId) : [];
  const regionStates =
    level === "Territory" && form.parentId != null ? getParentRegionStates(form.parentId) : [];

  const scopeErrors = validatePostalScopeForLevel(level, form.parentId, scope, {
    excludeGeographyId: options?.geographyId,
    allowSharedScope: form.allowSharedPostalScope,
    areaDistricts,
    regionStates,
  });
  if (Object.keys(scopeErrors).length > 0) {
    throw new Error(Object.values(scopeErrors)[0]);
  }

  const input: GeographyFormInput = {
    ...form,
    geographyType: level,
    coverageType: level === "Territory" ? "Direct" : "Inherited",
  };

  let record: GeographyRecord;
  if (options?.geographyId != null) {
    const existing = getGeographyById(options.geographyId);
    const updated = updateGeography(options.geographyId, input);
    if (!updated) throw new Error("Geography not found");
    record = updated;
    addAuditEntry({
      actionType: "Geography Edited",
      oldGeography: existing?.name ?? "—",
      newGeography: input.name.trim(),
      effectiveFrom: input.effectiveFrom,
      remarks: `Business geography updated: ${existing?.name ?? "—"} → ${input.name.trim()} (${level}).`,
    });
  } else {
    record = createGeography(input);
    addAuditEntry({
      actionType: "Geography Created",
      newGeography: record.name,
      effectiveFrom: input.effectiveFrom,
      remarks: `${record.name} (${level}) created with postal scope from Postal Master.`,
    });
  }

  if (level !== "Zone") {
    const def = definitionFromScope(record.id, level, scope, form.parentId);
    upsertCoverageDefinition(def);
    if (level === "Territory" && def.pincodeKeys.length > 0) {
      saveCoverageWithEffectiveDate(
        record.id,
        def.pincodeKeys,
        input.effectiveFrom,
        Object.fromEntries(def.pincodeKeys.map((k) => [normalizeKey(k), "move"])),
      );
    }
  }

  syncGeographyCoverageCounts();
  return record;
}

/** Update territory postal scope from Coverage tab without full form. */
export function saveTerritoryPostalScope(
  territoryId: number,
  scope: GeographyPostalScope,
  effectiveFrom: string,
  allowSharedPostalScope = false,
): GeographyRecord {
  const territory = getGeographyById(territoryId);
  if (!territory || territory.geographyType !== "Territory") {
    throw new Error("Territory not found.");
  }
  return saveBusinessGeography(
    {
      name: territory.name,
      geographyType: "Territory",
      parentId: territory.parentId,
      effectiveFrom,
      status: territory.status,
      postalScope: scope,
      allowSharedPostalScope,
    },
    { geographyId: territoryId },
  );
}

export function syncGeographyUserCounts(): void {
  if (typeof window === "undefined") return;
  const assignments = loadUserAssignments();
  const geos = loadGeographies();
  const next = geos.map((g) => ({
    ...g,
    assignedUsers: assignments.filter((a) => a.geographyId === g.id && a.status === "active").length,
  }));
  saveGeographies(next);
}

export function getWorkflowSummary() {
  const totalPincodes = getPostalRecordCount();
  const mapped = getAllActiveMappedKeys();
  const geos = loadGeographies();
  const assignments = loadUserAssignments().filter((a) => a.status === "active");

  return {
    totalPincodes,
    mappedPincodes: mapped.size,
    unmappedPincodes: Math.max(0, totalPincodes - mapped.size),
    totalGeographies: geos.length,
    totalAssignments: assignments.length,
    customersResolvable: buildCustomerImpactRows().filter((r) => r.customerName !== "—").length,
  };
}

/** @deprecated Use getAssignableUsersForRole — kept for legacy references */
export function getMockSystemUsers(): MockSystemUser[] {
  return MOCK_SYSTEM_USERS.filter((u) => u.status === "active");
}

/** @deprecated Use getAssignableUserById */
export function getMockUserById(id: string): MockSystemUser | undefined {
  return MOCK_SYSTEM_USERS.find((u) => u.id === id);
}

/** @deprecated Use getAssignableUsersForRole */
export function getMockUsersForRole(role?: SalesRole): MockSystemUser[] {
  const active = getMockSystemUsers();
  if (!role) return active;
  return active.filter((u) => u.role === role);
}

export function getDemoUserOptions(): string[] {
  return loadEmployees()
    .filter((e) => e.status === "active" && isAssignableSalesRole(e.role))
    .map((e) => e.fullName);
}

export function filterPincodesForTerritoryCoverage(
  state: string,
  district: string,
  city: string,
  town: string,
): PincodeRecord[] {
  return loadPincodeRecords().filter((p) => {
    if (p.status !== "active") return false;
    if (!state || p.stateName !== state) return false;
    if (!district || p.district !== district) return false;
    if (!city || p.city !== city) return false;
    if (!town || p.town !== town) return false;
    return true;
  });
}

export function filterPincodesForCoverage(
  state: string,
  districts: string[],
  cities: string[],
  towns: string[],
  pincodeSearch?: string,
): PincodeRecord[] {
  return loadPincodeRecords().filter((p) => {
    if (p.status !== "active") return false;
    if (state && p.stateName !== state) return false;
    if (districts.length > 0 && !districts.includes(p.district)) return false;
    if (cities.length > 0 && !cities.includes(p.city)) return false;
    if (towns.length > 0 && !towns.includes(p.town)) return false;
    if (pincodeSearch && !p.pincode.includes(pincodeSearch.trim())) return false;
    return true;
  });
}

export function getMappingStatusLabel(record: PincodeRecord): string {
  const geo = findGeographyForPincodeRecord(record);
  if (!geo) return "Unmapped";
  return "Mapped";
}

export function getGeographyOptionsFlat(): Array<{ id: number; label: string; depth: number }> {
  const geos = loadGeographies().filter((g) => g.status === "active");
  const result: Array<{ id: number; label: string; depth: number }> = [];
  function walk(parentId: number | null, depth: number) {
    for (const c of geos.filter((g) => g.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name))) {
      result.push({
        id: c.id,
        label: `${depth > 0 ? "— ".repeat(depth) : ""}${c.name} (${c.geographyType})`,
        depth,
      });
      walk(c.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

/** Legacy helpers for components still using old API */
export function addPincodesToGeography(geographyId: number, keys: string[]): void {
  saveCoverageWithEffectiveDate(geographyId, keys, todayStr(), Object.fromEntries(keys.map((k) => [normalizeKey(k), "move"])));
}

export function loadCoverageStore() {
  const byGeography: Record<string, string[]> = {};
  for (const m of loadCoverageMappings().filter((x) => x.status === "active" && !x.effectiveTo)) {
    const k = String(m.geographyId);
    if (!byGeography[k]) byGeography[k] = [];
    byGeography[k].push(m.pincodeKey);
  }
  return { byGeography };
}

export type { Distributor };
