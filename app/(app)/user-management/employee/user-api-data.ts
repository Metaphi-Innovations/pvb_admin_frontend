import type { Employee, UserPermissions } from "./employee-data";
import { ROLE_GEO_FIELDS } from "./employee-data";
import type {
  ApprovalUserOption,
  UserCreatePayload,
  UserDetailRecord,
  UserListRecord,
  UserUpdatePayload,
} from "@/services/user-list.service";

export interface UserRecord {
  id: number;
  userUuid: string;
  employeeId: string;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  department: string;
  employeeType: string;
  roleType: string;
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export interface ApiRoleOption {
  id: string;
  name: string;
  geoLevel: string;
  departmentId: string;
}

export function roleDropdownToApiOptions(
  roles: Array<{
    id: string;
    roleName: string;
    geoLevel?: string;
    departmentId?: string;
  }>,
): ApiRoleOption[] {
  return roles.map((role) => ({
    id: role.id,
    name: role.roleName,
    geoLevel: role.geoLevel || "None",
    departmentId: role.departmentId || "",
  }));
}

export interface GeographyLookupItem {
  geography_id: string;
  name: string;
  level: string;
  parent_id?: string | null;
}

const GEO_LEVEL_FIELDS: Record<string, string[]> = {
  Country: [],
  Zone: ["Zone"],
  Region: ["Zone", "Region"],
  State: ["Zone", "Region", "State"],
  Area: ["Zone", "Region", "State", "Area"],
  Territory: ["Zone", "Region", "State", "Area", "Territory"],
  District: ["Zone", "Region", "State", "Area", "Territory", "District"],
  City: ["Zone", "Region", "State", "Area", "Territory", "District", "City"],
  Town: ["Zone", "Region", "State", "Area", "Territory", "District", "City", "Town"],
  None: [],
};

export function toUserRecord(item: UserListRecord): UserRecord {
  return {
    id: item.id,
    userUuid: item.userUuid,
    employeeId: item.employeeId,
    fullName: item.fullName,
    email: item.email,
    mobile: item.mobile,
    role: item.role,
    department: item.department,
    employeeType: item.employeeType || "",
    roleType: item.roleType || "",
    status: item.status,
    createdBy: item.createdBy || "—",
    createdDate: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedDate: item.updatedAt,
  };
}

export function detailToEmployee(detail: UserDetailRecord): Employee {
  const approvalChain = Array.isArray(detail.approvalChain)
    ? detail.approvalChain
    : detail.approvalChain
      ? [detail.approvalChain]
      : [];

  const level = (index: number) => {
    const row = approvalChain[index] as Record<string, unknown> | undefined;
    const approverId = row?.approver_id;
    return {
      id: typeof approverId === "string" ? approverId : null,
      name: "",
      role: "",
    };
  };

  const l1 = level(0);
  const l2 = level(1);
  const l3 = level(2);
  const approvalLevels = approvalChain
    .map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      const approverId = typeof item.approver_id === "string" ? item.approver_id : "";
      if (!approverId) return null;
      return {
        level: String(item.level ?? ""),
        approverId,
        name:
          String(item.approver_name ?? "").trim() ||
          String(item.approver_username ?? "").trim() ||
          "",
        employeeId: String(item.employee_id ?? "").trim(),
        designation: String(item.designation ?? "").trim(),
        department: String(item.department ?? "").trim(),
        role: String(item.role ?? "").trim(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return {
    id: detail.id,
    userUuid: detail.userUuid,
    employeeId: detail.employeeId,
    firstName: detail.firstName,
    lastName: detail.lastName,
    fullName: detail.fullName,
    email: detail.email,
    mobile: detail.mobile,
    bloodGroup: (detail.bloodGroup as Employee["bloodGroup"]) || "Unknown",
    gender: detail.gender as Employee["gender"],
    dob: detail.dob,
    departmentId: detail.departmentId || null,
    department: detail.department,
    employeeType: detail.employeeType as Employee["employeeType"],
    roleType: detail.roleType as Employee["roleType"],
    salesType: detail.salesType as Employee["salesType"],
    roleId: detail.roleId || null,
    role: detail.role,
    reportingManagerId: detail.reportingManagerId || null,
    reportingManager: detail.reportingManager || "",
    status: detail.status,
    joiningDate: detail.joiningDate || "",
    currentAddressLine1: detail.currentAddressLine1 || "",
    currentAddressLine2: detail.currentAddressLine2 || "",
    currentPincode: detail.currentPincode || "",
    currentCity: detail.currentCity || "",
    currentTown: detail.currentTown || "",
    currentDistrict: detail.currentDistrict || "",
    currentState: detail.currentState || "",
    permanentAddressLine1: detail.permanentAddressLine1 || "",
    permanentAddressLine2: detail.permanentAddressLine2 || "",
    permanentPincode: detail.permanentPincode || "",
    permanentCity: detail.permanentCity || "",
    permanentTown: detail.permanentTown || "",
    permanentDistrict: detail.permanentDistrict || "",
    permanentState: detail.permanentState || "",
    emergencyContactName: detail.emergencyContactName || "",
    emergencyContactMobile: detail.emergencyContactNumber || "",
    emergencyContactRelation: detail.emergencyContactRelationship as Employee["emergencyContactRelation"],
    emergencyContactAddress: detail.emergencyContactAddress || "",
    emergencyAddressLine1: detail.emergencyAddressLine1 || "",
    emergencyAddressLine2: detail.emergencyAddressLine2 || "",
    emergencyPincode: detail.emergencyPincode || "",
    emergencyCity: detail.emergencyCity || "",
    emergencyTown: detail.emergencyTown || "",
    emergencyDistrict: detail.emergencyDistrict || "",
    emergencyState: detail.emergencyState || "",
    geoZone: detail.geoZone || "",
    geoRegion: detail.geoRegion || "",
    geoState: detail.geoState || "",
    geoArea: detail.geoArea || "",
    territory: detail.territory || "",
    geoDistrict: detail.geoDistrict || "",
    geoCity: detail.geoCity || "",
    geoTown: detail.geoTown || "",
    approvalLevel1Id: l1.id as unknown as number | null,
    approvalLevel1Name: approvalLevels[0]?.name || l1.name,
    approvalLevel1Role: approvalLevels[0]?.role || l1.role,
    approvalLevel2Id: l2.id as unknown as number | null,
    approvalLevel2Name: approvalLevels[1]?.name || l2.name,
    approvalLevel2Role: approvalLevels[1]?.role || l2.role,
    approvalLevel3Id: l3.id as unknown as number | null,
    approvalLevel3Name: approvalLevels[2]?.name || l3.name,
    approvalLevel3Role: approvalLevels[2]?.role || l3.role,
    approvalLevels,
    permissions: detail.permissions || undefined,
    documents: detail.documents || [],
    createdBy: detail.createdBy,
    createdDate: detail.createdAt,
    updatedBy: detail.updatedBy,
    updatedDate: detail.updatedAt,
    lastStatusChange: detail.updatedAt,
    designation: detail.designation,
  };
}

function resolveGeoId(
  level: string,
  name: string,
  geography: GeographyLookupItem[],
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const match = geography.find(
    (g) => g.level.toLowerCase() === level.toLowerCase() && g.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return match?.geography_id || null;
}

export function buildGeographyMapping(
  employee: Employee,
  roleGeoLevel: string,
  geography: GeographyLookupItem[],
): Record<string, string | null> | null {
  if (employee.roleType !== "Field User") return null;

  const mapping = employee.geoMappings?.[0] || {
    geoZone: employee.geoZone,
    geoRegion: employee.geoRegion,
    geoState: employee.geoState,
    geoArea: employee.geoArea,
    territory: employee.territory,
    geoDistrict: employee.geoDistrict,
    geoCity: employee.geoCity,
    geoTown: employee.geoTown,
  };

  const result: Record<string, string | null> = {
    zone_id: resolveGeoId("Zone", mapping.geoZone || "", geography),
    region_id: resolveGeoId("Region", mapping.geoRegion || "", geography),
    state_id: resolveGeoId("State", mapping.geoState || "", geography),
    area_id: resolveGeoId("Area", mapping.geoArea || "", geography),
    territory_id: resolveGeoId("Territory", mapping.territory || "", geography),
    district_id: resolveGeoId("District", mapping.geoDistrict || "", geography),
    city_id: resolveGeoId("City", mapping.geoCity || "", geography),
    town_id: resolveGeoId("Town", mapping.geoTown || "", geography),
  };

  if (roleGeoLevel === "None" || roleGeoLevel === "Country") {
    return {};
  }

  return result;
}

export function geoFieldsForRole(roleGeoLevel: string, roleName?: string): string[] {
  if (roleGeoLevel && GEO_LEVEL_FIELDS[roleGeoLevel]) {
    return GEO_LEVEL_FIELDS[roleGeoLevel];
  }
  if (roleName && ROLE_GEO_FIELDS[roleName]) {
    return ROLE_GEO_FIELDS[roleName];
  }
  return [];
}

function buildApprovalChain(employee: Employee): unknown[] | null {
  const levels = [
    { id: employee.approvalLevel1Id, level: 1 },
    { id: employee.approvalLevel2Id, level: 2 },
    { id: employee.approvalLevel3Id, level: 3 },
  ].filter((row) => row.id);

  if (!levels.length) return null;

  return levels.map((row) => ({
    level: String(row.level),
    approver_id: String(row.id),
  }));
}

function buildUsername(email: string): string {
  const local =
    email
      .split("@")[0]
      ?.trim()
      .replace(/[^a-zA-Z0-9._-]/g, "") || "user";
  if (local.length >= 3) return local.slice(0, 50);
  const suffix = Date.now().toString().slice(-4);
  return `${local}${suffix}`.slice(0, 50);
}

export function employeeToCreatePayload(
  employee: Employee,
  options: {
    password?: string;
    roleGeoLevel?: string;
    geography?: GeographyLookupItem[];
  } = {},
): UserCreatePayload {
  return {
    email: employee.email.trim(),
    username: buildUsername(employee.email.trim()),
    first_name: employee.firstName.trim(),
    last_name: employee.lastName.trim(),
    password: options.password?.trim() || "Password@123",
    mobile_number: employee.mobile.trim(),
    date_of_birth: employee.dob || null,
    gender: employee.gender || null,
    blood_group: employee.bloodGroup || null,
    emergency_contact_name: employee.emergencyContactName || null,
    emergency_contact_relationship: employee.emergencyContactRelation || null,
    emergency_contact_number: employee.emergencyContactMobile || null,
    emergency_contact_address: employee.emergencyContactAddress || null,
    current_address: employee.currentAddress || null,
    permanent_address: employee.permanentAddress || null,
    designation: employee.designation || "Employee",
    employee_id: employee.employeeId || null,
    employee_type: employee.employeeType || null,
    date_of_joining: employee.joiningDate || null,
    role_type: employee.roleType || null,
    sales_type: employee.salesType || null,
    status: employee.status === "active" ? "Active" : "Inactive",
    department_id:
      employee.departmentId !== null && employee.departmentId !== undefined
        ? String(employee.departmentId)
        : null,
    role_id:
      employee.roleId !== null && employee.roleId !== undefined
        ? String(employee.roleId)
        : null,
    reporting_manager_id:
      employee.reportingManagerId !== null && employee.reportingManagerId !== undefined
        ? String(employee.reportingManagerId)
        : null,
    approval_chain: buildApprovalChain(employee),
    geography_mapping: buildGeographyMapping(
      employee,
      options.roleGeoLevel || "None",
      options.geography || [],
    ),
  };
}

export function employeeToUpdatePayload(
  employee: Employee,
  options: {
    roleGeoLevel?: string;
    geography?: GeographyLookupItem[];
  } = {},
): UserUpdatePayload {
  const createPayload = employeeToCreatePayload(employee, options);
  const { password: _password, ...rest } = createPayload;
  return {
    ...rest,
    is_active: employee.status === "active",
  };
}

export function approvalUsersToOptions(users: ApprovalUserOption[]) {
  return users.map((user) => ({
    label: user.label || `${user.firstName} ${user.lastName}`.trim(),
    value: user.userId,
    sub: `${user.employeeId} · ${user.roleName}${user.departmentName ? ` · ${user.departmentName}` : ""}`,
  }));
}

export function usersDropdownToOptions(users: Array<{
  userId: string;
  label: string;
  username: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}>) {
  return users.map((user) => ({
    label: user.label || `${user.firstName} ${user.lastName}`.trim(),
    value: user.userId,
    sub: `${user.employeeId} · ${user.username}`,
  }));
}

export function templatePermissionsToSets(template: {
  accessType: "web" | "mobile";
  webPermissions: Array<{ moduleKey: string; actionKey: string }>;
  mobilePermissions: Array<{ moduleKey: string; actionKey: string }>;
}): { webSet: Set<string>; mobileSet: Set<string> } {
  const webSet = new Set<string>();
  const mobileSet = new Set<string>();

  template.webPermissions.forEach((p) => {
    webSet.add(`${p.moduleKey}.${p.actionKey}`);
  });
  template.mobilePermissions.forEach((p) => {
    mobileSet.add(`${p.moduleKey}.${p.actionKey}`);
  });

  return { webSet, mobileSet };
}

export type { UserPermissions };
