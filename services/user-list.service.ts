import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { UserPermissions } from "@/app/(app)/user-management/employee/employee-data";

export interface UserListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface UserListRecord {
  id: number;
  userUuid: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobile: string;
  designation: string;
  employeeType: string;
  roleType: string;
  salesType: string;
  department: string;
  departmentId: string;
  role: string;
  roleId: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface UserListResult {
  items: UserListRecord[];
  total: number;
}

export interface UserFilterOption {
  label: string;
  value: string;
}

export type UserFilterField =
  | "username"
  | "email"
  | "mobile_number"
  | "status"
  | "employee_type"
  | "role_type"
  | "sales_type"
  | "is_active"
  | "department__department_name"
  | "role__role_name"
  | "created_by_user__username"
  | "updated_by_user__username"
  | "created_by_user__first_name"
  | "updated_by_user__first_name";

export interface UserDropdownItem {
  userId: string;
  label: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
}

export interface ApprovalUserOption {
  userId: string;
  label: string;
  username: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  roleName: string;
  departmentName: string;
  geographyLevel: string;
}

export interface UserCreatePayload {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password?: string;
  mobile_number: string;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_address?: string | null;
  current_address?: string | null;
  permanent_address?: string | null;
  designation: string;
  employee_id?: string | null;
  employee_type?: string | null;
  date_of_joining?: string | null;
  role_type?: string | null;
  sales_type?: string | null;
  status?: string | null;
  department_id?: string | null;
  role_id?: string | null;
  reporting_manager_id?: string | null;
  approval_chain?: unknown | null;
  geography_mapping?: Record<string, string | null> | null;
}

export type UserUpdatePayload = Partial<UserCreatePayload> & {
  is_active?: boolean;
};

export interface UserExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface UserDetailRecord extends UserListRecord {
  gender?: string;
  bloodGroup?: string;
  dob?: string;
  joiningDate?: string;
  reportingManagerId?: string;
  reportingManager?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelationship?: string;
  emergencyContactAddress?: string;
  approvalChain?: unknown;
  geoZoneId?: string;
  geoRegionId?: string;
  geoStateId?: string;
  geoAreaId?: string;
  geoTerritoryId?: string;
  geoDistrictId?: string;
  geoCityId?: string;
  geoTownId?: string;
  geoZone?: string;
  geoRegion?: string;
  geoState?: string;
  geoArea?: string;
  territory?: string;
  geoDistrict?: string;
  geoCity?: string;
  geoTown?: string;
  permissions?: UserPermissions | null;
}

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  employeeId: "employee_id",
  fullName: "first_name",
  email: "email",
  mobile: "mobile_number",
  role: "role__role_name",
  status: "is_active",
  createdBy: "created_at",
  updatedBy: "updated_at",
};

export function sortStateToOrdering(
  key: string,
  direction: "asc" | "desc" | "none",
): string {
  if (!key || direction === "none") return "";
  const field = SORT_KEY_TO_ORDERING[key];
  if (!field) return "";
  return direction === "desc" ? `-${field}` : field;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown): "active" | "inactive" {
  if (value === true) return "active";
  if (value === false) return "inactive";
  const token = asString(value).trim().toLowerCase();
  if (token === "active") return "active";
  return "inactive";
}

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function formatDate(value: unknown): string {
  const raw = asString(value);
  return raw ? raw.slice(0, 10) : "";
}

function mapListItem(raw: Record<string, unknown>, fallbackIndex: number): UserListRecord {
  const srNo = Number(raw.sr_no);
  const firstName = asString(raw.first_name);
  const lastName = asString(raw.last_name);
  const department = raw.department as Record<string, unknown> | undefined;
  const role = raw.role as Record<string, unknown> | undefined;

  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    userUuid: asString(raw.user_id),
    employeeId: asString(raw.employee_id),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email: asString(raw.email),
    mobile: asString(raw.mobile_number),
    designation: asString(raw.designation),
    employeeType: asString(raw.employee_type),
    roleType: asString(raw.role_type),
    salesType: asString(raw.sales_type),
    department: asString(department?.department_name),
    departmentId: asString(department?.department_id),
    role: asString(role?.role_name),
    roleId: asString(role?.role_id),
    status: toStatus(raw.is_active ?? raw.status),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: UserFilterField,
): UserFilterOption[] {
  const options: UserFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const raw = record[fieldName];
    const value = asString(raw).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "is_active") {
      const active = raw === true || value.toLowerCase() === "true";
      options.push({
        label: active ? "Active" : "Inactive",
        value: active ? "active" : "inactive",
      });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function geoName(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  return asString((raw as Record<string, unknown>).name);
}

function geoId(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  return asString((raw as Record<string, unknown>).geography_id);
}

function permissionsFromApiTree(
  web: unknown,
  mobile: unknown,
): UserPermissions | null {
  const result: UserPermissions = { web: {}, mobile: {} };
  let hasAny = false;

  const walk = (
    tree: unknown,
    target: Record<string, Record<string, Record<string, boolean>>>,
    isMobile = false,
  ) => {
    if (!tree || typeof tree !== "object") return;
    for (const [mod, subs] of Object.entries(tree as Record<string, unknown>)) {
      if (!subs || typeof subs !== "object") continue;
      for (const [sub, actionsRaw] of Object.entries(subs as Record<string, unknown>)) {
        if (!actionsRaw || typeof actionsRaw !== "object") continue;
        for (const [action, enabled] of Object.entries(actionsRaw as Record<string, unknown>)) {
          if (!enabled) continue;
          if (!target[mod]) target[mod] = {};
          if (!target[mod][sub]) {
            target[mod][sub] = isMobile
              ? { view: false, create: false, edit: false, delete: false, approve: false }
              : {
                  view: false,
                  create: false,
                  edit: false,
                  delete: false,
                  approve: false,
                  export: false,
                  import: false,
                };
          }
          if (action in target[mod][sub]) {
            (target[mod][sub] as Record<string, boolean>)[action] = true;
            hasAny = true;
          }
        }
      }
    }
  };

  walk(web, result.web as unknown as Record<string, Record<string, Record<string, boolean>>>, false);
  walk(
    mobile,
    result.mobile as unknown as Record<string, Record<string, Record<string, boolean>>>,
    true,
  );

  return hasAny ? result : null;
}

function permissionsToApiTree(perms: UserPermissions | null | undefined): {
  web_permission: Record<string, unknown> | null;
  mobile_permission: Record<string, unknown> | null;
} {
  const web: Record<string, Record<string, Record<string, boolean>>> = {};
  const mobile: Record<string, Record<string, Record<string, boolean>>> = {};

  if (perms?.web) {
    for (const [modId, subs] of Object.entries(perms.web)) {
      for (const [subId, actions] of Object.entries(subs || {})) {
        for (const [action, enabled] of Object.entries(actions || {})) {
          if (!enabled) continue;
          if (!web[modId]) web[modId] = {};
          if (!web[modId][subId]) web[modId][subId] = {};
          web[modId][subId][action] = true;
        }
      }
    }
  }

  if (perms?.mobile) {
    for (const [grpId, features] of Object.entries(perms.mobile)) {
      for (const [featId, actions] of Object.entries(features || {})) {
        for (const [action, enabled] of Object.entries(actions || {})) {
          if (!enabled) continue;
          if (!mobile[grpId]) mobile[grpId] = {};
          if (!mobile[grpId][featId]) mobile[grpId][featId] = {};
          mobile[grpId][featId][action] = true;
        }
      }
    }
  }

  return {
    web_permission: Object.keys(web).length ? web : null,
    mobile_permission: Object.keys(mobile).length ? mobile : null,
  };
}

export const UserListService = {
  async list(params: UserListParams): Promise<UserListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.USER_MANAGEMENT.USER.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row, idx) =>
      mapListItem((row ?? {}) as Record<string, unknown>, idx),
    );

    const totalRecords = Number(payload.totalRecords ?? payload.count);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async view(id: string): Promise<UserDetailRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.USER.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    const raw = data as Record<string, unknown>;
    const base = mapListItem(raw, 0);
    const reportingManager = raw.reporting_manager as Record<string, unknown> | undefined;

    let permissions: UserPermissions | null = null;
    try {
      const permResponse = await axiosInstance.get(
        API_ENDPOINTS.USER_MANAGEMENT.USER.PERMISSIONS(id),
      );
      const permPayload = permResponse.data as Record<string, unknown>;
      const permData = permPayload.data as Record<string, unknown> | undefined;
      permissions = permissionsFromApiTree(
        permData?.web_permission,
        permData?.mobile_permission,
      );
    } catch {
      permissions = null;
    }

    return {
      ...base,
      gender: asString(raw.gender),
      bloodGroup: asString(raw.blood_group),
      dob: formatDate(raw.date_of_birth),
      joiningDate: formatDate(raw.date_of_joining),
      reportingManagerId: asString(raw.reporting_manager_id || reportingManager?.user_id),
      reportingManager: toDisplayName(reportingManager),
      currentAddress: asString(raw.current_address),
      permanentAddress: asString(raw.permanent_address),
      emergencyContactName: asString(raw.emergency_contact_name),
      emergencyContactNumber: asString(raw.emergency_contact_number),
      emergencyContactRelationship: asString(raw.emergency_contact_relationship),
      emergencyContactAddress: asString(raw.emergency_contact_address),
      approvalChain: raw.approval_chain,
      geoZoneId: geoId(raw.zone),
      geoRegionId: geoId(raw.region),
      geoStateId: geoId(raw.state_geo),
      geoAreaId: geoId(raw.area),
      geoTerritoryId: geoId(raw.territory),
      geoDistrictId: geoId(raw.district),
      geoCityId: geoId(raw.city),
      geoTownId: geoId(raw.town),
      geoZone: geoName(raw.zone),
      geoRegion: geoName(raw.region),
      geoState: geoName(raw.state_geo),
      geoArea: geoName(raw.area),
      territory: geoName(raw.territory),
      geoDistrict: geoName(raw.district),
      geoCity: geoName(raw.city),
      geoTown: geoName(raw.town),
      permissions,
    };
  },

  async create(payload: UserCreatePayload): Promise<{ userId: string }> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.USER_MANAGEMENT.USER.CREATE,
      payload,
    );
    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to create user.");
    }
    const data = body.data as Record<string, unknown> | undefined;
    return { userId: asString(data?.user_id) };
  },

  async update(id: string, payload: UserUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(
      API_ENDPOINTS.USER_MANAGEMENT.USER.UPDATE(id),
      payload,
    );
    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to update user.");
    }
  },

  async updateStatus(id: string, active: boolean): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.USER_MANAGEMENT.USER.STATUS_UPDATE(id),
      { status: active ? "ACTIVE" : "INACTIVE" },
    );
    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to update user status.");
    }
  },

  async savePermissions(
    id: string,
    permissions: UserPermissions | null | undefined,
  ): Promise<void> {
    const { web_permission, mobile_permission } = permissionsToApiTree(permissions);
    const response = await axiosInstance.post(
      API_ENDPOINTS.USER_MANAGEMENT.USER.PERMISSIONS(id),
      { web_permission, mobile_permission },
    );
    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to save user permissions.");
    }
  },

  async getNextEmployeeId(): Promise<string> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.USER_MANAGEMENT.USER.NEXT_EMPLOYEE_ID,
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data as Record<string, unknown> | undefined;
    const employeeId = asString(data?.employeeId);
    if (!employeeId) {
      throw new Error("Failed to retrieve next employee ID.");
    }
    return employeeId;
  },

  async getFilterDropdown(
    fieldName: UserFilterField,
    signal?: AbortSignal,
  ): Promise<UserFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.USER.FILTER, {
      params: { field_name: fieldName },
      signal,
    });

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return mapFilterOptions(data, fieldName);
  },

  async export(params: UserExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.USER_MANAGEMENT.USER.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getApprovalUsers(roleId: string): Promise<ApprovalUserOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.USER_MANAGEMENT.USER.APPROVAL_USERS,
      { params: { role_id: roleId } },
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        userId: asString(item.user_id),
        label: asString(item.label),
        username: asString(item.username),
        firstName: asString(item.first_name),
        lastName: asString(item.last_name),
        employeeId: asString(item.employee_id),
        roleName: asString(item.role_name),
        departmentName: asString(item.department_name),
        geographyLevel: asString(item.geography_level),
      };
    });
  },
};
