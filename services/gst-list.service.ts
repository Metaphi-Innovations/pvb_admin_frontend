import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface GstListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface GstListRecord {
  id: number;
  gstUuid: string;
  gstPercentage: number;
  remark: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface GstListResult {
  items: GstListRecord[];
  total: number;
}

export interface GstCreatePayload {
  gstPercentage: number;
  remark: string;
}

export interface GstUpdatePayload {
  gstPercentage: number;
  remark: string;
}

export interface GstExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
}

export interface GstDropdownItem {
  id: string;
  remark: string;
  gstPercentage: number;
}

export interface GstFilterOption {
  label: string;
  value: string;
}

export type GstFilterField =
  | "gstPercentage"
  | "remark"
  | "is_active"
  | "created_by_user__username"
  | "updated_by_user__username";

function mapFilterOptions(data: unknown[], fieldName: GstFilterField): GstFilterOption[] {
  const options: GstFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const raw = record[fieldName];

    if (fieldName === "is_active") {
      const value = asString(raw).trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      const active = raw === true || value.toLowerCase() === "true";
      options.push({
        label: active ? "Active" : "Inactive",
        value: active ? "active" : "inactive",
      });
      continue;
    }

    if (fieldName === "gstPercentage") {
      const num = Number(raw);
      if (!Number.isFinite(num)) continue;
      const value = String(num);
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({ label: `${num}%`, value });
      continue;
    }

    const value = asString(raw).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
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
  // Prefer username so list display matches API audit filters (exact username match).
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function toGstPercentage(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): GstListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    gstUuid: asString(raw.gst_id ?? raw.id),
    gstPercentage: toGstPercentage(raw.gstPercentage),
    remark: asString(raw.remark),
    status: toStatus(raw.is_active),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapDetail(raw: Record<string, unknown>): GstListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    gstUuid: asString(raw.id ?? raw.gst_id),
    gstPercentage: toGstPercentage(raw.gstPercentage),
    remark: asString(raw.remark),
    status: toStatus(raw.is_active),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

export const GstListService = {
  async list(params: GstListParams): Promise<GstListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.GST.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

    const totalRecords = Number(payload.totalRecords);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async view(id: string): Promise<GstListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.GST.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: GstCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.GST.CREATE, {
      gstPercentage: payload.gstPercentage,
      remark: payload.remark.trim() || undefined,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create GST record.");
    }
  },

  async update(id: string, payload: GstUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.GST.UPDATE(id), {
      gstPercentage: payload.gstPercentage,
      remark: payload.remark.trim() || undefined,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update GST record.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(API_ENDPOINTS.MASTER.GST.STATUS_UPDATE(id));

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update GST status.");
    }
  },

  async export(params: GstExportParams): Promise<void> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.GST.EXPORT}?search=${encodeURIComponent(params.search)}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gst_master_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getFilterDropdown(
    fieldName: GstFilterField,
    signal?: AbortSignal,
  ): Promise<GstFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.GST.FILTER_DROPDOWN, {
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

  async dropdown(): Promise<GstDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.GST.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id),
        remark: asString(item.remark),
        gstPercentage: toGstPercentage(item.gstPercentage),
      };
    });
  },
};
