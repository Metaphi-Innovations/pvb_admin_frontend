import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface UnitListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface UnitListRecord {
  id: number;
  unitUuid: string;
  unitCode: string;
  unitName: string;
  shortName: string;
  uomId: string | null;
  parentUomName: string;
  conversionFactor: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface UnitListResult {
  items: UnitListRecord[];
  total: number;
}

export interface UnitCreatePayload {
  unit_name: string;
  short_name: string;
  uom_id?: string | null;
  conversion_factor: number;
}

export interface UnitUpdatePayload {
  unit_name?: string;
  short_name?: string;
  uom_id?: string | null;
  conversion_factor?: number;
}

export interface UnitExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface UnitFilterOption {
  label: string;
  value: string;
}

export interface UnitParentUomOption {
  label: string;
  value: string;
}

export type UnitFilterField =
  | "unit_code"
  | "unit_name"
  | "short_name"
  | "conversion_factor"
  | "uom__unit_name"
  | "uom__short_name"
  | "is_active"
  | "created_by_user__username"
  | "created_by_user__first_name"
  | "updated_by_user__username"
  | "updated_by_user__first_name";

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  unitCode: "unitCode",
  unitName: "unitName",
  shortName: "shortName",
  conversionFactor: "conversionFactor",
  parentUomName: "uomUnitName",
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

function formatParentUom(uom: unknown): string {
  if (!uom || typeof uom !== "object") return "";
  const record = uom as Record<string, unknown>;
  const name = asString(record.unit_name).trim();
  const short = asString(record.short_name).trim();
  if (name && short) return `${name} (${short})`;
  return name || short;
}

function formatConversionFactor(value: unknown): string {
  const raw = asString(value).trim();
  if (!raw) return "";
  const num = Number(raw);
  return Number.isFinite(num) ? String(num) : raw;
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): UnitListRecord {
  const srNo = Number(raw.sr_no);
  const uomIdRaw = raw.uom_id;
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    unitUuid: asString(raw.unit_id),
    unitCode: asString(raw.unit_code),
    unitName: asString(raw.unit_name),
    shortName: asString(raw.short_name),
    uomId: uomIdRaw ? asString(uomIdRaw) : null,
    parentUomName: formatParentUom(raw.uom),
    conversionFactor: formatConversionFactor(raw.conversion_factor),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapDetail(raw: Record<string, unknown>): UnitListRecord {
  const srNo = Number(raw.sr_no);
  const uomIdRaw = raw.uom_id;
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    unitUuid: asString(raw.unit_id),
    unitCode: asString(raw.unit_code),
    unitName: asString(raw.unit_name),
    shortName: asString(raw.short_name),
    uomId: uomIdRaw ? asString(uomIdRaw) : null,
    parentUomName: formatParentUom(raw.uom),
    conversionFactor: formatConversionFactor(raw.conversion_factor),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapFilterOptions(data: unknown[], fieldName: UnitFilterField): UnitFilterOption[] {
  const options: UnitFilterOption[] = [];
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

    if (fieldName === "conversion_factor") {
      const num = Number(value);
      const label = Number.isFinite(num) ? String(num) : value;
      options.push({ label, value });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export const UnitListService = {
  async list(params: UnitListParams): Promise<UnitListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.UNIT.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<UnitListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.UNIT.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: UnitCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.UNIT.CREATE, {
      unit_name: payload.unit_name.trim(),
      short_name: payload.short_name.trim(),
      uom_id: payload.uom_id ?? null,
      conversion_factor: payload.conversion_factor,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create unit.");
    }
  },

  async update(id: string, payload: UnitUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.UNIT.UPDATE(id), payload);

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update unit.");
    }
  },

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const response = await axiosInstance.patch(API_ENDPOINTS.MASTER.UNIT.STATUS_UPDATE(id), {
      is_active: isActive,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update unit status.");
    }
  },

  async getFilterDropdown(
    fieldName: UnitFilterField,
    signal?: AbortSignal,
  ): Promise<UnitFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.UNIT.FILTER_DROPDOWN, {
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

  async getParentUomDropdown(
    excludeId?: string,
    signal?: AbortSignal,
  ): Promise<UnitParentUomOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.UNIT.DROPDOWN, {
      params: {
        parent_uom: true,
        ...(excludeId ? { exclude_id: excludeId } : {}),
      },
      signal,
    });

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const record = (row ?? {}) as Record<string, unknown>;
      return {
        label: asString(record.label),
        value: asString(record.value),
      };
    });
  },

  async export(params: UnitExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.UNIT.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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
        // keep default
      }
      throw new Error(message);
    }

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `units_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
