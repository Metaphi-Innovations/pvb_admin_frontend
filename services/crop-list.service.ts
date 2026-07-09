import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface CropListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface CropListRecord {
  id: number;
  cropUuid: string;
  cropName: string;
  fieldType: string;
  categoryId: string;
  categoryName: string;
  season: string[];
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CropListResult {
  items: CropListRecord[];
  total: number;
}

export interface CropDropdownItem {
  id: string;
  cropName: string;
}

export interface CropCreatePayload {
  crop_name: string;
  field_type?: string | null;
  season?: string | null;
  category_id?: string | null;
}

export interface CropUpdatePayload {
  crop_name?: string;
  field_type?: string | null;
  season?: string | null;
  category_id?: string | null;
  description?: string | null;
}

export interface CropExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface CropFilterOption {
  label: string;
  value: string;
}

export type CropFilterField =
  | "crop_name"
  | "field_type"
  | "season"
  | "category__categoryName"
  | "is_active"
  | "created_by_user__username"
  | "updated_by_user__username";

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  cropName: "cropName",
  fieldType: "fieldType",
  categoryName: "categoryId",
  season: "season",
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

function parseSeason(value: unknown): string[] {
  const raw = asString(value).trim();
  if (!raw) return [];
  return raw.split(",").map((part) => part.trim()).filter(Boolean);
}

function seasonToApiValue(season: string[]): string | null {
  const joined = season.map((part) => part.trim()).filter(Boolean).join(", ");
  return joined || null;
}

function mapCategory(raw: Record<string, unknown>) {
  const category =
    raw.category && typeof raw.category === "object"
      ? (raw.category as Record<string, unknown>)
      : null;

  return {
    categoryId: asString(raw.category_id ?? category?.id),
    categoryName: asString(category?.categoryName ?? category?.category_name),
  };
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): CropListRecord {
  const srNo = Number(raw.sr_no);
  const category = mapCategory(raw);

  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    cropUuid: asString(raw.crop_id),
    cropName: asString(raw.crop_name),
    fieldType: asString(raw.field_type),
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    season: parseSeason(raw.season),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapDetail(raw: Record<string, unknown>): CropListRecord {
  const srNo = Number(raw.sr_no);
  const category = mapCategory(raw);

  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    cropUuid: asString(raw.crop_id),
    cropName: asString(raw.crop_name),
    fieldType: asString(raw.field_type),
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    season: parseSeason(raw.season),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapFilterOptions(data: unknown[], fieldName: CropFilterField): CropFilterOption[] {
  const options: CropFilterOption[] = [];
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

export const CropListService = {
  async list(params: CropListParams): Promise<CropListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.CROP.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<CropListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CROP.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: CropCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.CROP.CREATE, {
      crop_name: payload.crop_name.trim(),
      field_type: payload.field_type?.trim() || null,
      season: payload.season?.trim() || null,
      category_id: payload.category_id || null,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create crop.");
    }
  },

  async update(id: string, payload: CropUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.CROP.UPDATE(id), {
      ...(payload.crop_name !== undefined ? { crop_name: payload.crop_name.trim() } : {}),
      ...(payload.field_type !== undefined
        ? { field_type: payload.field_type?.trim() || null }
        : {}),
      ...(payload.season !== undefined ? { season: payload.season?.trim() || null } : {}),
      ...(payload.category_id !== undefined
        ? { category_id: payload.category_id || null }
        : {}),
      ...(payload.description !== undefined
        ? { description: payload.description?.trim() || null }
        : {}),
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update crop.");
    }
  },

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const response = await axiosInstance.patch(API_ENDPOINTS.MASTER.CROP.STATUS_UPDATE(id), {
      is_active: isActive,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update crop status.");
    }
  },

  async getFilterDropdown(
    fieldName: CropFilterField,
    signal?: AbortSignal,
  ): Promise<CropFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CROP.FILTER_DROPDOWN, {
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

  async export(params: CropExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.CROP.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crops_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async dropdown(): Promise<CropDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CROP.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.crop_id ?? item.id),
        cropName: asString(item.crop_name ?? item.cropName),
      };
    });
  },

  seasonToApiValue,
  extractErrorMessage,
};
