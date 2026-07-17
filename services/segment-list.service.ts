import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface SegmentListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface SegmentListRecord {
  id: number;
  segmentUuid: string;
  segmentName: string;
  segmentCode: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface SegmentListResult {
  items: SegmentListRecord[];
  total: number;
}

export interface SegmentDropdownItem {
  id: string;
  segmentName: string;
  segmentCode: string;
}

export interface SegmentCreatePayload {
  segment_name: string;
  description?: string | null;
}

export interface SegmentUpdatePayload {
  segment_name?: string;
  description?: string | null;
}

export interface SegmentExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface SegmentFilterOption {
  label: string;
  value: string;
}

export type SegmentFilterField =
  | "segment_name"
  | "description"
  | "segment_code"
  | "is_active"
  | "created_by_user__username"
  | "created_by_user__first_name"
  | "updated_by_user__username"
  | "updated_by_user__first_name";

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  segmentName: "segmentName",
  segmentCode: "segmentCode",
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

function formatDate(value: unknown): string {
  const raw = asString(value);
  return raw ? raw.slice(0, 10) : "";
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): SegmentListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    segmentUuid: asString(raw.segment_id),
    segmentName: asString(raw.segment_name),
    segmentCode: asString(raw.segment_code),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapDetail(raw: Record<string, unknown>): SegmentListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    segmentUuid: asString(raw.segment_id),
    segmentName: asString(raw.segment_name),
    segmentCode: asString(raw.segment_code),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: SegmentFilterField,
): SegmentFilterOption[] {
  const options: SegmentFilterOption[] = [];
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

export const SegmentListService = {
  async list(params: SegmentListParams): Promise<SegmentListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.SEGMENT.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<SegmentListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SEGMENT.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async previewNumber(): Promise<string> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SEGMENT.PREVIEW_NUMBER);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data as Record<string, unknown> | undefined;
    return asString(data?.segment_code);
  },

  async create(payload: SegmentCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.SEGMENT.CREATE, {
      segment_name: payload.segment_name.trim(),
      description: payload.description?.trim() || null,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create segment.");
    }
  },

  async update(id: string, payload: SegmentUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.SEGMENT.UPDATE(id), {
      ...(payload.segment_name !== undefined
        ? { segment_name: payload.segment_name.trim() }
        : {}),
      ...(payload.description !== undefined
        ? { description: payload.description?.trim() || null }
        : {}),
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update segment.");
    }
  },

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const response = await axiosInstance.patch(API_ENDPOINTS.MASTER.SEGMENT.STATUS_UPDATE(id), {
      is_active: isActive,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update segment status.");
    }
  },

  async getFilterDropdown(
    fieldName: SegmentFilterField,
    signal?: AbortSignal,
  ): Promise<SegmentFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SEGMENT.FILTER_DROPDOWN, {
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

  async export(params: SegmentExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.SEGMENT.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `segments_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async dropdown(): Promise<SegmentDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SEGMENT.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id ?? item.segment_id),
        segmentName: asString(item.segment_name ?? item.segmentName),
        segmentCode: asString(item.segment_code),
      };
    });
  },

  extractErrorMessage,
};
