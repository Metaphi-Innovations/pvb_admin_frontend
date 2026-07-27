import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface CfuListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface CfuListRecord {
  id: number;
  cfuUuid: string;
  cfuName: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CfuListResult {
  items: CfuListRecord[];
  total: number;
}

export interface CfuDropdownItem {
  id: string;
  cfuName: string;
  description: string;
}

export interface CfuCreatePayload {
  cfu_name: string;
  description?: string | null;
}

export interface CfuUpdatePayload {
  cfu_name?: string;
  description?: string | null;
}

export interface CfuExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface CfuFilterOption {
  label: string;
  value: string;
}

export type CfuFilterField =
  | "cfu_name"
  | "description"
  | "status"
  | "created_by__username"
  | "updated_by__username";

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  cfuName: "cfuName",
  description: "description",
  status: "status",
  createdBy: "createdAt",
  updatedBy: "updatedAt",
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

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): CfuListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    cfuUuid: asString(raw.cfu_id),
    cfuName: asString(raw.cfu_name),
    description: asString(raw.description),
    status: toStatus(raw.status),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by),
    updatedBy: toDisplayName(raw.updated_by),
  };
}

function mapFilterOptions(data: unknown[], fieldName: CfuFilterField): CfuFilterOption[] {
  const options: CfuFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const raw = record[fieldName];
    const value = asString(raw).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "status") {
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

export const CfuListService = {
  async list(params: CfuListParams): Promise<CfuListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.CFU.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<CfuListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CFU.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapItem(data as Record<string, unknown>, 0);
  },

  async create(payload: CfuCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.CFU.CREATE, {
      cfu_name: payload.cfu_name.trim(),
      description: payload.description?.trim() || null,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create CFU record.");
    }
  },

  async update(id: string, payload: CfuUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.CFU.UPDATE(id), {
      ...(payload.cfu_name !== undefined ? { cfu_name: payload.cfu_name.trim() } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description?.trim() || null }
        : {}),
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update CFU record.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(API_ENDPOINTS.MASTER.CFU.STATUS_UPDATE(id));

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update CFU status.");
    }
  },

  async getFilterDropdown(
    fieldName: CfuFilterField,
    signal?: AbortSignal,
  ): Promise<CfuFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CFU.FILTER_DROPDOWN, {
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

  async export(params: CfuExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.CFU.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cfu_masters_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async dropdown(): Promise<CfuDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CFU.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.cfu_id),
        cfuName: asString(item.cfu_name),
        description: asString(item.description),
      };
    });
  },
};
