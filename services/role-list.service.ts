import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface RoleListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface RoleListRecord {
  id: number;
  roleUuid: string;
  roleName: string;
  departmentId: string;
  department: string;
  description: string;
  geoLevel: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface RoleListResult {
  items: RoleListRecord[];
  total: number;
}

export interface RoleDropdownItem {
  id: string;
  roleName: string;
  label: string;
  geoLevel: string;
  departmentId: string;
}

export interface RoleCreatePayload {
  role_name: string;
  department_id: string;
  description?: string | null;
  geography_level: string;
  approval_chain?: unknown | null;
}

export interface RoleUpdatePayload {
  role_name?: string;
  department_id?: string;
  description?: string | null;
  geography_level?: string;
  approval_chain?: unknown | null;
}

export interface RoleExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface RoleFilterOption {
  label: string;
  value: string;
}

export type RoleFilterField =
  | "role_name"
  | "geography_level"
  | "department__department_name"
  | "created_by_user__username"
  | "updated_by_user__username"
  | "created_by_user__first_name"
  | "updated_by_user__first_name";

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  roleName: "role_name",
  department: "department__department_name",
  geoLevel: "geography_level",
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
  return value === true ? "active" : "inactive";
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

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): RoleListRecord {
  const srNo = Number(raw.sr_no);
  const department = raw.department as Record<string, unknown> | null | undefined;
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    roleUuid: asString(raw.role_id),
    roleName: asString(raw.role_name),
    departmentId: asString(raw.department_id || department?.department_id),
    department: asString(department?.department_name) || "—",
    description: asString(raw.description),
    geoLevel: asString(raw.geography_level) || "None",
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapFilterOptions(data: unknown[], fieldName: RoleFilterField): RoleFilterOption[] {
  const options: RoleFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const raw = record[fieldName];
    const value = asString(raw).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export const RoleListService = {
  async list(params: RoleListParams): Promise<RoleListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.USER_MANAGEMENT.ROLE.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row, idx) =>
      mapItem((row ?? {}) as Record<string, unknown>, idx),
    );

    const totalRecords = Number(payload.totalRecords ?? payload.count);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async view(id: string): Promise<RoleListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.ROLE.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapItem(data as Record<string, unknown>, 0);
  },

  async create(payload: RoleCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.USER_MANAGEMENT.ROLE.CREATE, {
      role_name: payload.role_name.trim(),
      department_id: payload.department_id,
      description: payload.description?.trim() || null,
      geography_level: payload.geography_level,
      approval_chain: payload.approval_chain ?? null,
    });

    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to create role.");
    }
  },

  async update(id: string, payload: RoleUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.USER_MANAGEMENT.ROLE.UPDATE(id), {
      ...(payload.role_name !== undefined ? { role_name: payload.role_name.trim() } : {}),
      ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description?.trim() || null }
        : {}),
      ...(payload.geography_level !== undefined
        ? { geography_level: payload.geography_level }
        : {}),
      ...(payload.approval_chain !== undefined
        ? { approval_chain: payload.approval_chain }
        : {}),
    });

    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to update role.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(API_ENDPOINTS.USER_MANAGEMENT.ROLE.STATUS_UPDATE(id));

    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to update role status.");
    }
  },

  async getFilterDropdown(
    fieldName: RoleFilterField,
    signal?: AbortSignal,
  ): Promise<RoleFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.ROLE.FILTER, {
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

  async export(params: RoleExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.USER_MANAGEMENT.ROLE.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roles_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async dropdown(): Promise<RoleDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.ROLE.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.role_id),
        roleName: asString(item.role_name),
        label: asString(item.label || item.role_name),
        geoLevel: asString(item.geography_level) || "None",
        departmentId: asString(item.department_id),
      };
    });
  },
};
