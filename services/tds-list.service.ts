import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface TdsListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface TdsListRecord {
  id: number;
  tdsUuid: string;
  sectionName: string;
  tdsRate: string;
  applicableTo: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TdsListResult {
  items: TdsListRecord[];
  total: number;
}

export interface TdsCreatePayload {
  tds_rate: number;
  tds_section_name?: string | null;
  applicable_to?: string | null;
  description?: string | null;
}

export interface TdsUpdatePayload {
  tds_rate?: number;
  tds_section_name?: string | null;
  applicable_to?: string | null;
  description?: string | null;
}

export interface TdsExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface TdsFilterOption {
  label: string;
  value: string;
}

export interface TdsDropdownItem {
  tdsUuid: string;
  sectionCode: string;
}

export type TdsFilterField =
  | "tds_rate"
  | "tds_section_name"
  | "applicable_to"
  | "description"
  | "is_active"
  | "created_by_user__username"
  | "created_by_user__first_name"
  | "updated_by_user__username"
  | "updated_by_user__first_name";

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  sectionName: "tdsSectionName",
  tdsRate: "tdsRate",
  applicableTo: "applicableTo",
  description: "description",
  status: "isActive",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
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

function toDisplayName(user: unknown, fallbackName?: unknown): string {
  if (typeof fallbackName === "string" && fallbackName.trim()) {
    return fallbackName.trim();
  }
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

function formatRate(value: unknown): string {
  const raw = asString(value).trim();
  if (!raw) return "";
  const num = Number(raw);
  if (Number.isFinite(num)) return String(num);
  return raw;
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): TdsListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    tdsUuid: asString(raw.tds_id),
    sectionName: asString(raw.tds_section_name),
    tdsRate: formatRate(raw.tds_rate),
    applicableTo: asString(raw.applicable_to),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapDetail(raw: Record<string, unknown>): TdsListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    tdsUuid: asString(raw.tds_id),
    sectionName: asString(raw.tds_section_name),
    tdsRate: formatRate(raw.tds_rate),
    applicableTo: asString(raw.applicable_to),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user, raw.createdByName),
    updatedBy: toDisplayName(raw.updated_by_user, raw.updatedByName),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: TdsFilterField,
): TdsFilterOption[] {
  const options: TdsFilterOption[] = [];
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

    if (fieldName === "tds_rate") {
      const num = Number(value);
      const label = Number.isFinite(num) ? `${num}%` : value;
      options.push({ label, value });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export const TdsListService = {
  async list(params: TdsListParams): Promise<TdsListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.TDS.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<TdsListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.TDS.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: TdsCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.TDS.CREATE, payload);

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create TDS record.");
    }
  },

  async update(id: string, payload: TdsUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.TDS.UPDATE(id), payload);

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update TDS record.");
    }
  },

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const response = await axiosInstance.patch(API_ENDPOINTS.MASTER.TDS.STATUS_UPDATE(id), {
      is_active: isActive,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update TDS status.");
    }
  },

  async getFilterDropdown(
    fieldName: TdsFilterField,
    signal?: AbortSignal,
  ): Promise<TdsFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.TDS.FILTER_DROPDOWN, {
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

  async dropdown(signal?: AbortSignal): Promise<TdsDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.TDS.DROPDOWN, { signal });
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const record = (row ?? {}) as Record<string, unknown>;
      return {
        tdsUuid: asString(record.tds_id),
        sectionCode: asString(record.tds_code),
      };
    });
  },

  async export(params: TdsExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.TDS.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const contentType = String(response.headers["content-type"] ?? "");
    if (contentType.includes("application/json")) {
      const text = await (response.data as Blob).text();
      let message = "No records found to export.";
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        message = String(json.message ?? message);
      } catch {
        // keep default message
      }
      throw new Error(message);
    }

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tds_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  extractErrorMessage,
};
