import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface HsnListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface HsnListRecord {
  id: number;
  hsnUuid: string;
  hsnDescription: string;
  gstId: string;
  gstPercentage: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface HsnListResult {
  items: HsnListRecord[];
  total: number;
}

export interface HsnCreatePayload {
  hsnDescription: string;
  gstId: string;
}

export interface HsnUpdatePayload {
  hsnDescription: string;
  gstId: string;
}

export interface HsnExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
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

function readGst(raw: Record<string, unknown>): { gstId: string; gstPercentage: number } {
  const gst = raw.gst;
  if (gst && typeof gst === "object" && !Array.isArray(gst)) {
    const gstRecord = gst as Record<string, unknown>;
    return {
      gstId: asString(raw.gstId),
      gstPercentage: toGstPercentage(gstRecord.gstPercentage),
    };
  }
  return {
    gstId: asString(raw.gstId),
    gstPercentage: 0,
  };
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): HsnListRecord {
  const srNo = Number(raw.sr_no);
  const gst = readGst(raw);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    hsnUuid: asString(raw.id),
    hsnDescription: asString(raw.hsnDescription),
    gstId: gst.gstId,
    gstPercentage: gst.gstPercentage,
    status: toStatus(raw.is_active),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapDetail(raw: Record<string, unknown>): HsnListRecord {
  const srNo = Number(raw.sr_no);
  const gst = readGst(raw);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    hsnUuid: asString(raw.id),
    hsnDescription: asString(raw.hsnDescription),
    gstId: gst.gstId,
    gstPercentage: gst.gstPercentage,
    status: toStatus(raw.is_active),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

export const HsnListService = {
  async list(params: HsnListParams): Promise<HsnListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.HSN.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<HsnListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.HSN.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: HsnCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.HSN.CREATE, {
      hsnDescription: payload.hsnDescription.trim(),
      gstId: payload.gstId,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create HSN record.");
    }
  },

  async update(id: string, payload: HsnUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.HSN.UPDATE(id), {
      hsnDescription: payload.hsnDescription.trim(),
      gstId: payload.gstId,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update HSN record.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(API_ENDPOINTS.MASTER.HSN.STATUS_UPDATE(id));

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update HSN status.");
    }
  },

  async export(params: HsnExportParams): Promise<void> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.HSN.EXPORT}?search=${encodeURIComponent(params.search)}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hsn_master_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
