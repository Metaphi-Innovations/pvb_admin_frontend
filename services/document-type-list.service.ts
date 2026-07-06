import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface DocumentTypeListParams {
  page: number;
  pageSize: number;
  search: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface DocumentTypeListRecord {
  id: string;
  title: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface DocumentTypeListResult {
  items: DocumentTypeListRecord[];
  total: number;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown): "Active" | "Inactive" {
  return value === true ? "Active" : "Inactive";
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

function mapItem(raw: Record<string, unknown>): DocumentTypeListRecord {
  return {
    id: asString(raw.id),
    title: asString(raw.title),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

export interface DocumentTypeCreatePayload {
  title: string;
  description: string;
}

export interface DocumentTypeUpdatePayload {
  title: string;
  description: string;
}

export interface DocumentTypeDropdownItem {
  id: string;
  title: string;
}

export interface DocumentTypeExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
}

export const DocumentTypeListService = {
  async list(params: DocumentTypeListParams): Promise<DocumentTypeListResult> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.DOCUMENT_TYPE.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}`,
      { filters: params.apiFilters ?? {} },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row) => mapItem((row ?? {}) as Record<string, unknown>));

    const totalRecords = Number(payload.totalRecords);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async view(id: string): Promise<DocumentTypeListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.DOCUMENT_TYPE.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapItem(data as Record<string, unknown>);
  },

  async create(payload: DocumentTypeCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.DOCUMENT_TYPE.CREATE, {
      title: payload.title.trim(),
      description: payload.description.trim() || null,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create document type.");
    }
  },

  async update(id: string, payload: DocumentTypeUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.DOCUMENT_TYPE.UPDATE(id), {
      title: payload.title.trim(),
      description: payload.description.trim() || null,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update document type.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.MASTER.DOCUMENT_TYPE.STATUS_UPDATE(id),
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update document type status.");
    }
  },

  async dropdown(): Promise<DocumentTypeDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.DOCUMENT_TYPE.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id),
        title: asString(item.title),
      };
    });
  },

  async export(params: DocumentTypeExportParams): Promise<void> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.DOCUMENT_TYPE.EXPORT_CSV}?search=${encodeURIComponent(params.search)}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `document_types_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
