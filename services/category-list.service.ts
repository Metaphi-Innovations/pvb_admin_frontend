import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface CategoryListParams {
  page: number;
  pageSize: number;
  search: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface CategoryListRecord {
  id: number;
  categoryId: string;
  code: string;
  name: string;
  remark: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CategoryListResult {
  items: CategoryListRecord[];
  total: number;
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

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): CategoryListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    categoryId: asString(raw.category_id ?? raw.id),
    code: asString(raw.category_code),
    name: asString(raw.category_name ?? raw.categoryName),
    remark: asString(raw.remark ?? raw.description),
    status: toStatus(raw.is_active),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),


  };
}

function mapDetail(raw: Record<string, unknown>): CategoryListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    categoryId: asString(raw.id ?? raw.category_id),
    code: asString(raw.category_code),
    name: asString(raw.categoryName ?? raw.category_name),
    remark: asString(raw.description ?? raw.remark),
    status: toStatus(raw.is_active),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

export interface CategoryCreatePayload {
  categoryName: string;
  description: string;
}

export interface CategoryUpdatePayload {
  categoryName: string;
  description: string;
  is_active: boolean;
}

export interface CategoryExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
}

export const CategoryListService = {
  async list(params: CategoryListParams): Promise<CategoryListResult> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.CATEGORY.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}`,
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

  async view(categoryId: string): Promise<CategoryListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CATEGORY.VIEW(categoryId));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: CategoryCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.CATEGORY.CREATE, {
      categoryName: payload.categoryName.trim(),
      description: payload.description.trim(),
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create category.");
    }
  },

  async update(categoryId: string, payload: CategoryUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.CATEGORY.UPDATE(categoryId), {
      categoryName: payload.categoryName.trim(),
      description: payload.description.trim(),
      is_active: payload.is_active,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update category.");
    }
  },

  async updateStatus(categoryId: string): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.MASTER.CATEGORY.STATUS_UPDATE(categoryId),
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update category status.");
    }
  },

  async export(params: CategoryExportParams): Promise<void> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.CATEGORY.EXPORT}?search=${encodeURIComponent(params.search)}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `categories_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
