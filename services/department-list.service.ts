import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface DepartmentListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface DepartmentListRecord {
  id: number;
  departmentUuid: string;
  name: string;
  remarks: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface DepartmentListResult {
  items: DepartmentListRecord[];
  total: number;
}

export interface DepartmentDropdownItem {
  id: string;
  name: string;
  label: string;
}

export interface DepartmentCreatePayload {
  department_name: string;
  remark?: string | null;
}

export interface DepartmentUpdatePayload {
  department_name?: string;
  remark?: string | null;
}

export interface DepartmentExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface DepartmentFilterOption {
  label: string;
  value: string;
}

export type DepartmentFilterField =
  | "department_name"
  | "is_active"
  | "created_by_user__username"
  | "updated_by_user__username"
  | "created_by_user__first_name"
  | "updated_by_user__first_name";

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  name: "department_name",
  status: "is_active",
  createdDate: "created_at",
  updatedDate: "updated_at",
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

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): DepartmentListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    departmentUuid: asString(raw.department_id),
    name: asString(raw.department_name),
    remarks: asString(raw.remark),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: DepartmentFilterField,
): DepartmentFilterOption[] {
  const options: DepartmentFilterOption[] = [];
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

export const DepartmentListService = {
  async list(params: DepartmentListParams): Promise<DepartmentListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.USER_MANAGEMENT.DEPARTMENT.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<DepartmentListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.DEPARTMENT.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapItem(data as Record<string, unknown>, 0);
  },

  async create(payload: DepartmentCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.USER_MANAGEMENT.DEPARTMENT.CREATE, {
      department_name: payload.department_name.trim(),
      remark: payload.remark?.trim() || null,
    });

    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to create department.");
    }
  },

  async update(id: string, payload: DepartmentUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.USER_MANAGEMENT.DEPARTMENT.UPDATE(id), {
      ...(payload.department_name !== undefined
        ? { department_name: payload.department_name.trim() }
        : {}),
      ...(payload.remark !== undefined ? { remark: payload.remark?.trim() || null } : {}),
    });

    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to update department.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.USER_MANAGEMENT.DEPARTMENT.STATUS_UPDATE(id),
    );

    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to update department status.");
    }
  },

  async getFilterDropdown(
    fieldName: DepartmentFilterField,
    signal?: AbortSignal,
  ): Promise<DepartmentFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.DEPARTMENT.FILTER, {
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

  async export(params: DepartmentExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.USER_MANAGEMENT.DEPARTMENT.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `departments_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async dropdown(): Promise<DepartmentDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.DEPARTMENT.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.department_id),
        name: asString(item.department_name),
        label: asString(item.label || item.department_name),
      };
    });
  },
};
