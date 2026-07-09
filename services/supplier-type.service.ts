import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

// ---------------------------------------------------------------------------
// Parameter / payload types
// ---------------------------------------------------------------------------

export interface SupplierTypeListParams {
    page: number;
    pageSize: number;
    search: string;
    ordering?: string;
    status: "all" | "active" | "inactive";
    apiFilters?: Record<string, unknown>;
    signal?: AbortSignal;
}

export interface SupplierTypeExportParams {
    search: string;
    status: "all" | "active" | "inactive";
    ordering?: string;
    apiFilters?: Record<string, unknown>;
}

export interface SupplierTypeCreatePayload {
    supplier_type_name: string;
    initial_code: string;
    description?: string | null;
    is_active: boolean;
    [key: string]: unknown;
}

export interface SupplierTypeUpdatePayload extends Partial<SupplierTypeCreatePayload> {
    [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Response shape (list / detail record)
// ---------------------------------------------------------------------------

export interface SupplierTypeListRecord {
    id: number;
    supplierTypeUuid: string;
    supplierTypeName: string;
    initialCode: string;
    description: string;
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}

export interface SupplierTypeListResult {
    items: SupplierTypeListRecord[];
    total: number;
}

export interface SupplierTypeDropdownItem {
    supplier_type_id: string;
    supplierTypeName: string;
}

// ---------------------------------------------------------------------------
// Sort-key → API ordering field map
// ---------------------------------------------------------------------------

const SORT_FIELD_MAP: Record<string, string> = {
    supplierTypeName: "supplier_type_name",
    initialCode: "initial_code",
    status: "status",
};

export function sortStateToOrdering(
    key: string,
    direction: "asc" | "desc" | "none",
): string {
    if (!key || direction === "none") return "";
    const field = SORT_FIELD_MAP[key];
    if (!field) return "";
    return direction === "desc" ? `-${field}` : field;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function asString(value: unknown): string {
    return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown, fallbackValue?: unknown): "active" | "inactive" {
    const primaryVal = value !== undefined && value !== null ? value : fallbackValue;
    const str = String(primaryVal).trim().toLowerCase();
    return str === "active" || str === "true" || primaryVal === true ? "active" : "inactive";
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

function mapItem(
    raw: Record<string, unknown>,
    fallbackIndex: number,
): SupplierTypeListRecord {
    const srNo = Number(raw.sr_no);
    return {
        id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
        supplierTypeUuid: asString(raw.supplier_type_id),
        supplierTypeName: asString(raw.supplier_type_name),
        initialCode: asString(raw.initial_code),
        description: asString(raw.description),
        status: toStatus(raw.status, raw.is_active),
        createdAt: formatDate(raw.created_at),
        updatedAt: formatDate(raw.updated_at),
        createdBy: toDisplayName(raw.created_by_user),
        updatedBy: toDisplayName(raw.updated_by_user),
    };
}

function mapDetail(raw: Record<string, unknown>): SupplierTypeListRecord {
    return mapItem(raw, -1);
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const SupplierTypeListService = {
    async list(params: SupplierTypeListParams): Promise<SupplierTypeListResult> {
        const ordering = encodeURIComponent(params.ordering ?? "");

        // Map frontend camelCase array filters to backend snake_case single values
        const backendFilters: Record<string, unknown> = {};
        if (params.apiFilters) {
            for (const [key, value] of Object.entries(params.apiFilters)) {
                let realVal: unknown = value;
                if (Array.isArray(value)) {
                    if (value.length === 0) continue;
                    realVal = value[0];
                }
                if (realVal === undefined || realVal === null || realVal === "") continue;

                if (key === "supplierTypeName") {
                    backendFilters["supplier_type_name"] = realVal;
                } else if (key === "initialCode") {
                    backendFilters["initial_code"] = realVal;
                } else if (key === "status") {
                    backendFilters["is_active"] = realVal === "active";
                } else {
                    backendFilters[key] = realVal;
                }
            }
        }

        const response = await axiosInstance.post(
            `${API_ENDPOINTS.MASTER.SUPPLIER_TYPE.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
            { filters: backendFilters },
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

    async view(id: string): Promise<SupplierTypeListRecord> {
        const response = await axiosInstance.get(
            API_ENDPOINTS.MASTER.SUPPLIER_TYPE.VIEW(id),
        );
        const payload = response.data as Record<string, unknown>;
        const data = payload.data;

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an object.");
        }

        return mapDetail(data as Record<string, unknown>);
    },

    async create(payload: SupplierTypeCreatePayload): Promise<void> {
        const response = await axiosInstance.post(
            API_ENDPOINTS.MASTER.SUPPLIER_TYPE.CREATE,
            payload,
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(asString(body.message) || "Failed to create supplier type.");
        }
    },

    async update(id: string, payload: SupplierTypeUpdatePayload): Promise<void> {
        const response = await axiosInstance.put(
            API_ENDPOINTS.MASTER.SUPPLIER_TYPE.UPDATE(id),
            payload,
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(asString(body.message) || "Failed to update supplier type.");
        }
    },

    async updateStatus(id: string, isActive: boolean): Promise<void> {
        const response = await axiosInstance.patch(
            API_ENDPOINTS.MASTER.SUPPLIER_TYPE.STATUS_UPDATE(id),
            { is_active: isActive },
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(
                asString(body.message) || "Failed to update supplier type status.",
            );
        }
    },

    async export(params: SupplierTypeExportParams): Promise<void> {
        const ordering = encodeURIComponent(params.ordering ?? "");

        const response = await axiosInstance.post(
            `${API_ENDPOINTS.MASTER.SUPPLIER_TYPE.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
            { filters: params.apiFilters ?? {} },
            { responseType: "blob" },
        );

        const blob = response.data as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `supplier_types_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    async dropdown(): Promise<SupplierTypeDropdownItem[]> {
        const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SUPPLIER_TYPE.DROPDOWN);
        const payload = response.data as Record<string, unknown>;
        const data = payload.data;

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an array.");
        }

        return data.map((row) => {
            const item = (row ?? {}) as Record<string, unknown>;
            return {
                supplier_type_id: asString(item.supplier_type_id),
                supplierTypeName: asString(item.supplierTypeName ?? item.supplier_type_name),
            };
        });
    },

    extractErrorMessage,
};