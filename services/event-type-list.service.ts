import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface EventTypeListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface EventTypeListRecord {
  id: number;
  eventTypeUuid: string;
  eventTypeName: string;
  remark: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface EventTypeListResult {
  items: EventTypeListRecord[];
  total: number;
}

export interface EventTypeDropdownItem {
  id: string;
  eventTypeName: string;
  remark: string;
}

export interface EventTypeCreatePayload {
  event_type_name: string;
  remark?: string | null;
}

export interface EventTypeUpdatePayload {
  event_type_name?: string;
  remark?: string | null;
}

export interface EventTypeExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface EventTypeFilterOption {
  label: string;
  value: string;
}

export type EventTypeFilterField =
  | "event_type_name"
  | "remark"
  | "is_active"
  | "created_by_user__username"
  | "updated_by_user__username";

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  eventTypeName: "eventTypeName",
  remark: "remark",
  status: "isActive",
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

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): EventTypeListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    eventTypeUuid: asString(raw.id),
    eventTypeName: asString(raw.event_type_name),
    remark: asString(raw.remark),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: EventTypeFilterField,
): EventTypeFilterOption[] {
  const options: EventTypeFilterOption[] = [];
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

export const EventTypeListService = {
  async list(params: EventTypeListParams): Promise<EventTypeListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.EVENT_TYPE.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<EventTypeListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.EVENT_TYPE.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapItem(data as Record<string, unknown>, 0);
  },

  async create(payload: EventTypeCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.EVENT_TYPE.CREATE, {
      event_type_name: payload.event_type_name.trim(),
      remark: payload.remark?.trim() || null,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create event type.");
    }
  },

  async update(id: string, payload: EventTypeUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.EVENT_TYPE.UPDATE(id), {
      ...(payload.event_type_name !== undefined
        ? { event_type_name: payload.event_type_name.trim() }
        : {}),
      ...(payload.remark !== undefined ? { remark: payload.remark?.trim() || null } : {}),
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update event type.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.MASTER.EVENT_TYPE.STATUS_UPDATE(id),
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update event type status.");
    }
  },

  async getFilterDropdown(
    fieldName: EventTypeFilterField,
    signal?: AbortSignal,
  ): Promise<EventTypeFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.EVENT_TYPE.FILTER_DROPDOWN, {
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

  async export(params: EventTypeExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.EVENT_TYPE.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `event_types_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async dropdown(): Promise<EventTypeDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.EVENT_TYPE.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id),
        eventTypeName: asString(item.event_type_name),
        remark: asString(item.remark),
      };
    });
  },
};
