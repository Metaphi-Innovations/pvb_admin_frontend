import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

// ---------------------------------------------------------------------------
// Nested payload shapes
// ---------------------------------------------------------------------------

export interface WarehouseContactPayload {
    contact_person: string;
    designation?: string | null;
    mobile_country_code?: string;
    mobile_number: string;
    alternate_contact?: string | null;
    email_address?: string | null;
    is_primary: boolean;
}

export interface WarehouseDocumentPayload {
    document_name: string;
}

// ---------------------------------------------------------------------------
// Parameter / payload types
// ---------------------------------------------------------------------------

export interface WarehouseListParams {
    page: number;
    pageSize: number;
    search: string;
    ordering?: string;
    status: "all" | "active" | "inactive";
    apiFilters?: Record<string, unknown>;
    signal?: AbortSignal;
}

export interface WarehouseExportParams {
    search: string;
    status: "all" | "active" | "inactive";
    ordering?: string;
    apiFilters?: Record<string, unknown>;
}

export interface WarehouseCreatePayload {
    warehouse_name: string;
    operated_by?: string | null;
    c_f_agent_id?: string | null;
    gst_applicable: boolean;
    gst_number?: string | null;
    registration_type?: string | null;
    registered_legal_name?: string | null;
    registered_gst_address?: string | null;
    account_holder_name?: string | null;
    bank_name?: string | null;
    branch_name?: string | null;
    account_number?: string | null;
    confirm_account_number?: string | null;
    ifsc_code?: string | null;
    swift_code?: string | null;
    address?: string | null;
    address_1?: string | null;
    town?: string | null;
    pincode_id?: string | null;
    state?: string | null;
    district?: string | null;
    city?: string | null;
    pincode?: string | null;
    status?: string | null;
    contacts?: WarehouseContactPayload[];
    warehouse_documents?: WarehouseDocumentPayload[];
    files?: File[] | null;
    [key: string]: unknown;
}

export interface WarehouseUpdatePayload extends Partial<WarehouseCreatePayload> {
    [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Response shape (list / detail record)
// ---------------------------------------------------------------------------

export interface WarehouseListRecord {
    id: number;
    warehouseUuid: string;
    warehouseName: string;
    operatedBy: string;
    cfAgentId: string;
    gstApplicable: boolean;
    gstNumber: string;
    registrationType: string;
    registeredLegalName: string;
    registeredGstAddress: string;
    accountHolderName: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
    ifscCode: string;
    swiftCode: string;
    address: string;
    address1: string;
    town: string;
    pincodeId: string;
    state: string;
    district: string;
    city: string;
    pincode: string;
    contacts: WarehouseContactPayload[];
    documents: WarehouseDocumentPayload[];
    status: "Active" | "Inactive" | "Under Maintenance" | "Closed";
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}

export interface WarehouseListResult {
    items: WarehouseListRecord[];
    total: number;
}

export interface WarehouseDropdownItem {
    warehouse_id: string;
    warehouseName: string;
}

export interface WarehouseFilterOption {
    label: string;
    value: string;
}

export type WarehouseFilterField =
    | "warehouse_name"
    | "operated_by"
    | "gst_number"
    | "state"
    | "district"
    | "city"
    | "pincode"
    | "status"
    | "created_by_user__username"
    | "updated_by_user__username";

// ---------------------------------------------------------------------------
// Sort-key → API ordering field map
// ---------------------------------------------------------------------------

const SORT_KEY_TO_ORDERING: Record<string, string> = {
    warehouseName: "warehouseName",
    operatedBy: "operatedBy",
    state: "state",
    city: "city",
    status: "status",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
};

const SORT_FIELD_MAP: Record<string, string> = {
    warehouseName: "warehouse_name",
    operatedBy: "operated_by",
    state: "state",
    city: "city",
    status: "status",
    // contactPerson: "warehouse.contacts?.[0]?.contact_person",
    // mobileNumber: "warehouse.contacts?.[0]?.mobile_number",
    // emailAddress: "warehouse.contacts?.[0]?.email_address",
    pincode: "pincode",
    manager: "manager",
    gstNumber: "gst_number",
    district: "district",
    createdAt: "created_at",
    updatedAt: "updated_at",
    createdBy: "created_by",
    updatedBy: "updated_by",
};

const FILTER_FIELD_MAP: Record<string, string> = {
    state: "state",
    city: "city",
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

function toStatus(value: unknown, fallbackValue?: unknown): "Active" | "Inactive" | "Under Maintenance" | "Closed" {
    const primaryVal = value !== undefined && value !== null ? value : fallbackValue;
    const str = String(primaryVal).trim().toLowerCase();
    if (str === "active" || str === "true" || primaryVal === true) return "Active";
    if (str === "under maintenance" || str === "under_maintenance") return "Under Maintenance";
    if (str === "closed") return "Closed";
    return "Inactive";
}

function toBool(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    const str = String(value ?? "").trim().toLowerCase();
    return str === "true" || str === "1";
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

function toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? (parsed as T[]) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function mapContacts(value: unknown): WarehouseContactPayload[] {
    return toArray<Record<string, unknown>>(value).map((c) => ({
        contact_person: asString(c.contact_person),
        designation: asString(c.designation),
        mobile_country_code: asString(c.mobile_country_code) || "+91",
        mobile_number: asString(c.mobile_number),
        alternate_contact: asString(c.alternate_contact),
        email_address: asString(c.email_address),
        is_primary: toBool(c.is_primary),
    }));
}

function mapDocuments(value: unknown): WarehouseDocumentPayload[] {
    return toArray<Record<string, unknown>>(value).map((d) => ({
        document_name: asString(d.document_name),
    }));
}

function mapItem(
    raw: Record<string, unknown>,
    fallbackIndex: number,
): WarehouseListRecord {
    const srNo = Number(raw.sr_no);
    return {
        id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
        warehouseUuid: asString(raw.warehouse_id),
        warehouseName: asString(raw.warehouse_name),
        operatedBy: asString(raw.operated_by),
        cfAgentId: asString(raw.c_f_agent_id),
        gstApplicable: toBool(raw.gst_applicable),
        gstNumber: asString(raw.gst_number),
        registrationType: asString(raw.registration_type),
        registeredLegalName: asString(raw.registered_legal_name),
        registeredGstAddress: asString(raw.registered_gst_address),
        accountHolderName: asString(raw.account_holder_name),
        bankName: asString(raw.bank_name),
        branchName: asString(raw.branch_name),
        accountNumber: asString(raw.account_number),
        ifscCode: asString(raw.ifsc_code),
        swiftCode: asString(raw.swift_code),
        address: asString(raw.address),
        address1: asString(raw.address_1),
        town: asString(raw.town),
        pincodeId: asString(raw.pincode_id),
        state: asString(raw.state),
        district: asString(raw.district),
        city: asString(raw.city),
        pincode: asString(raw.pincode),
        contacts: mapContacts(raw.contacts),
        documents: mapDocuments(raw.warehouse_documents ?? raw.documents),
        status: toStatus(raw.status, raw.is_active),
        createdAt: formatDate(raw.created_at),
        updatedAt: formatDate(raw.updated_at),
        createdBy: toDisplayName(raw.created_by_user),
        updatedBy: toDisplayName(raw.updated_by_user),
    };
}

function mapDetail(raw: Record<string, unknown>): WarehouseListRecord {
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

function mapFilterOptions(
    data: unknown[],
    fieldName: WarehouseFilterField,
): WarehouseFilterOption[] {
    const options: WarehouseFilterOption[] = [];
    const seen = new Set<string>();

    for (const row of data) {
        if (!row || typeof row !== "object") continue;
        const record = row as Record<string, unknown>;
        const raw = record[fieldName];
        const value = asString(raw).trim();
        if (!value || seen.has(value)) continue;
        seen.add(value);

        if (fieldName === "status") {
            const normalized = value.toLowerCase();
            if (normalized === "active") {
                options.push({ label: "Active", value: "active" });
            } else if (normalized === "inactive") {
                options.push({ label: "Inactive", value: "inactive" });
            } else {
                options.push({ label: value, value });
            }
            continue;
        }

        options.push({ label: value, value });
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
}

/** Map frontend list filters to backend whitelist keys. */
function toBackendFilters(apiFilters?: Record<string, unknown>): Record<string, unknown> {
    const backendFilters: Record<string, unknown> = {};
    if (!apiFilters) return backendFilters;

    for (const [key, value] of Object.entries(apiFilters)) {
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            backendFilters[key] = value;
            continue;
        }

        let realVal: unknown = value;
        if (Array.isArray(value)) {
            if (value.length === 0) continue;
            realVal = value[0];
        }
        if (realVal === undefined || realVal === null || realVal === "") continue;

        if (key === "warehouseName") {
            backendFilters.warehouse_name = realVal;
        } else if (key === "operatedBy") {
            backendFilters.operated_by = realVal;
        } else if (key === "gstNumber") {
            backendFilters.gst_number = realVal;
        } else if (key === "registeredGstAddress") {
            backendFilters.registered_gst_address = realVal;
        } else if (key === "status") {
            const token = String(realVal).trim().toLowerCase();
            if (token === "all") continue;
            if (token === "active") backendFilters.status = "Active";
            else if (token === "inactive") backendFilters.status = "Inactive";
            else backendFilters.status = realVal;
        } else {
            backendFilters[key] = realVal;
        }
    }

    return backendFilters;
}

// Always builds multipart/form-data. Arrays/objects are JSON-stringified,
// File instances (single or in a `files` array) are appended as-is.
function buildFormData(payload: Record<string, unknown>): FormData {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (value instanceof File) {
            formData.append(key, value);
            return;
        }

        if (Array.isArray(value)) {
            // If it's an array of Files, append each under the same key
            // (e.g. "files") so the backend receives a file list.
            if (value.length > 0 && value.every((v) => v instanceof File)) {
                (value as File[]).forEach((file) => formData.append(key, file));
                return;
            }
            formData.append(key, JSON.stringify(value));
            return;
        }

        if (typeof value === "object") {
            formData.append(key, JSON.stringify(value));
            return;
        }

        formData.append(key, String(value));
    });

    return formData;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const WarehouseListService = {
    async list(params: WarehouseListParams): Promise<WarehouseListResult> {
        const ordering = encodeURIComponent(params.ordering ?? "");
        const backendFilters = toBackendFilters(params.apiFilters);

        const response = await axiosInstance.post(
            `${API_ENDPOINTS.MASTER.WAREHOUSE.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

    async view(id: string): Promise<WarehouseListRecord> {
        const response = await axiosInstance.get(
            API_ENDPOINTS.MASTER.WAREHOUSE.VIEW(id),
        );
        const payload = response.data as Record<string, unknown>;
        const data = payload.data;

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an object.");
        }

        return mapDetail(data as Record<string, unknown>);
    },

    async previewNumber(): Promise<string> {
        const response = await axiosInstance.get(
            API_ENDPOINTS.MASTER.WAREHOUSE.PREVIEW_NUMBER,
        );
        const payload = response.data as Record<string, unknown>;
        const data = payload.data as Record<string, unknown> | undefined;
        return asString(data?.warehouse_code);
    },

    async create(payload: WarehouseCreatePayload): Promise<void> {
        const response = await axiosInstance.post(
            API_ENDPOINTS.MASTER.WAREHOUSE.CREATE,
            buildFormData(payload),
            { headers: { "Content-Type": "multipart/form-data" } },
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(asString(body.message) || "Failed to create warehouse.");
        }
    },

    async update(id: string, payload: WarehouseUpdatePayload): Promise<void> {
        const response = await axiosInstance.put(
            API_ENDPOINTS.MASTER.WAREHOUSE.UPDATE(id),
            buildFormData(payload),
            { headers: { "Content-Type": "multipart/form-data" } },
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(asString(body.message) || "Failed to update warehouse.");
        }
    },

    async updateStatus(id: string, status: "Active" | "Inactive" | "Under Maintenance" | "Closed"): Promise<void> {
        const response = await axiosInstance.patch(
            API_ENDPOINTS.MASTER.WAREHOUSE.STATUS_UPDATE(id),
            { status: status },
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(
                asString(body.message) || "Failed to update warehouse status.",
            );
        }
    },

    async getFilterDropdown(
        fieldName: WarehouseFilterField,
        signal?: AbortSignal,
    ): Promise<WarehouseFilterOption[]> {
        const response = await axiosInstance.get(API_ENDPOINTS.MASTER.WAREHOUSE.FILTER_DROPDOWN, {
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

    async export(params: WarehouseExportParams): Promise<void> {
        const ordering = encodeURIComponent(params.ordering ?? "");
        const backendFilters = toBackendFilters(params.apiFilters);

        const response = await axiosInstance.post(
            `${API_ENDPOINTS.MASTER.WAREHOUSE.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
            { filters: backendFilters },
            { responseType: "blob" },
        );

        const blob = response.data as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `warehouses_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    async dropdown(): Promise<WarehouseDropdownItem[]> {
        const response = await axiosInstance.get(API_ENDPOINTS.MASTER.WAREHOUSE.DROPDOWN);
        const payload = response.data as Record<string, unknown>;
        const data = payload.data;

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an array.");
        }

        return data.map((row) => {
            const item = (row ?? {}) as Record<string, unknown>;
            return {
                warehouse_id: asString(item.warehouse_id),
                warehouseName: asString(item.warehouseName ?? item.warehouse_name),
            };
        });
    },

    extractErrorMessage,
};