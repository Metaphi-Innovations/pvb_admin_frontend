import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

// ---------------------------------------------------------------------------
// Nested payload shapes
// ---------------------------------------------------------------------------

export interface SupplierContactPayload {
    contact_name: string;
    designation?: string | null;
    mobile_country_code?: string;
    mobile_number: string;
    email?: string | null;
    is_primary: boolean;
}

export interface SupplierBankAccountPayload {
    account_holder_name: string;
    bank_name: string;
    branch_name?: string | null;
    account_number: string;
    ifsc_code: string;
    swift_code?: string | null;
    is_primary: boolean;
    payment_type?: string | null;
    credit_days?: string | number | null;
}

export interface SupplierProductPayload {
    product_id: string;
    cost_price: number | string;
}

export interface SupplierDocumentPayload {
    document_name: string;
}

// ---------------------------------------------------------------------------
// Parameter / payload types
// ---------------------------------------------------------------------------

export interface SupplierListParams {
    page: number;
    pageSize: number;
    search: string;
    ordering?: string;
    status: "all" | "active" | "inactive";
    apiFilters?: Record<string, unknown>;
    signal?: AbortSignal;
}

export interface SupplierExportParams {
    search: string;
    status: "all" | "active" | "inactive";
    ordering?: string;
    apiFilters?: Record<string, unknown>;
}

export interface SupplierCreatePayload {
    supplier_type_id?: string;
    supplier_code?: string;
    supplier_name: string;
    contact_person?: string | null;
    mobile_country_code?: string;
    mobile_number?: string;
    email?: string | null;
    gst_registered: boolean;
    registration_type?: string | null;
    gstin_number?: string | null;
    registered_legal_name?: string | null;
    registered_gst_address?: string | null;
    pan_number?: string | null;
    tan_number?: string | null;
    tds_applicable: boolean;
    tds_section_id?: string | null;
    msme_registered?: boolean;
    msme_reg_no?: string | null;
    address_1?: string | null;
    pincode_id?: string | null;
    address_2?: string | null;
    state?: string | null;
    city?: string | null;
    town?: string | null;
    remarks?: string | null;
    contacts?: SupplierContactPayload[];
    bank_accounts?: SupplierBankAccountPayload[];
    products?: SupplierProductPayload[];
    documents?: SupplierDocumentPayload[];
    file1?: File | string | null;
    [key: string]: unknown;
}

export interface SupplierUpdatePayload extends Partial<SupplierCreatePayload> {
    [key: string]: unknown;
}


// ---------------------------------------------------------------------------
// Response shape (list / detail record)
// ---------------------------------------------------------------------------

export interface SupplierListRecord {
    id: number;
    supplierUuid: string;
    supplierTypeId: string;
    supplierType: SupplierTypeRef | null;
    supplierCode: string;
    supplierName: string;
    contactPerson: string;
    mobileCountryCode: string;
    mobileNumber: string;
    email: string;
    gstRegistered: boolean;
    registrationType: string;
    gstinNumber: string;
    registeredLegalName: string;
    registeredGstAddress: string;
    panNumber: string;
    tanNumber: string;
    tdsApplicable: boolean;
    tdsSectionId: string;
    msmeRegistered: boolean;
    msmeRegNo: string;
    address1: string;
    pincodeId: string;
    address2: string;
    state: string;
    city: string;
    town: string;
    remarks: string;
    contacts: SupplierContactPayload[];
    bankAccounts: SupplierBankAccountPayload[];
    products: SupplierProductPayload[];
    documents: SupplierDocumentPayload[];
    paymentTerms?: string;
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}

export interface SupplierListResult {
    items: SupplierListRecord[];
    total: number;
}

export interface SupplierDropdownItem {
    supplier_id: string;
    supplierName: string;
    supplierCode: string;
}

// ---------------------------------------------------------------------------
// Sort-key → API ordering field map
// ---------------------------------------------------------------------------

const SORT_KEY_TO_ORDERING: Record<string, string> = {
    supplierCode: "supplierCode",
    supplierName: "supplierName",
    contactPerson: "contactPerson",
    mobileNumber: "mobileNumber",
    email: "email",
    state: "state",
    city: "city",
    status: "isActive",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
};

const SORT_FIELD_MAP: Record<string, string> = {
    supplierCode: "supplier_code",
    supplierName: "supplier_name",
    contactPerson: "contact_person",
    mobileNumber: "mobile_number",
    email: "email",
    state: "state",
    city: "city",
    status: "status",
};

const FILTER_FIELD_MAP: Record<string, string> = {
    supplierCode: "supplier_code",
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

function toStatus(value: unknown, fallbackValue?: unknown): "active" | "inactive" {
    const primaryVal = value !== undefined && value !== null ? value : fallbackValue;
    const str = String(primaryVal).trim().toLowerCase();
    return str === "active" || str === "true" || primaryVal === true ? "active" : "inactive";
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

function mapContacts(value: unknown): SupplierContactPayload[] {
    return toArray<Record<string, unknown>>(value).map((c) => ({
        contact_name: asString(c.contact_name),
        designation: asString(c.designation),
        mobile_country_code: asString(c.mobile_country_code) || "+91",
        mobile_number: asString(c.mobile_number),
        email: asString(c.email),
        is_primary: toBool(c.is_primary),
    }));
}

function mapBankAccounts(value: unknown): SupplierBankAccountPayload[] {
    return toArray<Record<string, unknown>>(value).map((b) => ({
        account_holder_name: asString(b.account_holder_name),
        bank_name: asString(b.bank_name),
        branch_name: asString(b.branch_name),
        account_number: asString(b.account_number),
        ifsc_code: asString(b.ifsc_code),
        swift_code: asString(b.swift_code),
        is_primary: toBool(b.is_primary),
        payment_type: asString(b.payment_type),
        credit_days: asString(b.credit_days),
    }));
}

function mapProducts(value: unknown): SupplierProductPayload[] {
    return toArray<Record<string, unknown>>(value).map((p) => ({
        product_id: asString(p.product_id),
        cost_price: Number(p.cost_price) || 0,
    }));
}

function mapDocuments(value: unknown): SupplierDocumentPayload[] {
    return toArray<Record<string, unknown>>(value).map((d) => ({
        document_name: asString(d.document_name),
    }));
}

export interface SupplierTypeRef {
    supplier_type_id: string;
    supplier_type_name: string;
    initial_code?: string;
}
function mapSupplierType(value: unknown): SupplierTypeRef | null {
    if (!value || typeof value !== "object") return null;
    const obj = value as Record<string, unknown>;
    return {
        supplier_type_id: asString(obj.supplier_type_id),
        supplier_type_name: asString(obj.supplier_type_name),
        initial_code: asString(obj.initial_code),
    };
}

function mapItem(
    raw: Record<string, unknown>,
    fallbackIndex: number,
): SupplierListRecord {
    const srNo = Number(raw.sr_no);
    return {
        id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
        supplierUuid: asString(raw.supplier_id),
        supplierTypeId: asString(raw.supplier_type_id),
        supplierCode: asString(raw.supplier_code),
        supplierType: mapSupplierType(raw.supplier_type),
        supplierName: asString(raw.supplier_name),
        contactPerson: asString(raw.contact_person),
        mobileCountryCode: asString(raw.mobile_country_code) || "+91",
        mobileNumber: asString(raw.mobile_number),
        email: asString(raw.email),
        gstRegistered: toBool(raw.gst_registered),
        registrationType: asString(raw.registration_type),
        gstinNumber: asString(raw.gstin_number),
        registeredLegalName: asString(raw.registered_legal_name),
        registeredGstAddress: asString(raw.registered_gst_address),
        panNumber: asString(raw.pan_number),
        tanNumber: asString(raw.tan_number),
        tdsApplicable: toBool(raw.tds_applicable),
        tdsSectionId: asString(raw.tds_section_id),
        msmeRegistered: toBool(raw.msme_registered),
        msmeRegNo: asString(raw.msme_reg_no),
        address1: asString(raw.address_1),
        pincodeId: asString(raw.pincode_id),
        address2: asString(raw.address_2),
        state: asString(raw.state),
        city: asString(raw.city),
        town: asString(raw.town),
        remarks: asString(raw.remarks),
        contacts: mapContacts(raw.contacts),
        bankAccounts: mapBankAccounts(raw.bank_accounts),
        products: mapProducts(raw.products),
        documents: mapDocuments(raw.documents),
        paymentTerms: asString(raw.payment_terms),
        status: toStatus(raw.status, raw.is_active),
        createdAt: formatDate(raw.created_at),
        updatedAt: formatDate(raw.updated_at),
        createdBy: toDisplayName(raw.created_by_user),
        updatedBy: toDisplayName(raw.updated_by_user),
    };
}

function mapDetail(raw: Record<string, unknown>): SupplierListRecord {
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

function buildFormData(payload: Record<string, unknown>): FormData {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (value instanceof File) {
            formData.append(key, value);
            return;
        }

        if (Array.isArray(value) || typeof value === "object") {
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

export const SupplierListService = {
    async list(params: SupplierListParams): Promise<SupplierListResult> {
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

                if (key === "supplierName") {
                    backendFilters["supplier_name"] = realVal;
                } else if (key === "mobileNumber") {
                    backendFilters["mobile_number"] = realVal;
                } else if (key === "email") {
                    backendFilters["email"] = realVal;
                } else if (key === "gstinNumber") {
                    backendFilters["gst_number"] = realVal;
                } else if (key === "registeredGstAddress") {
                    backendFilters["registered_gst_address"] = realVal;
                } else if (key === "status") {
                    backendFilters["is_active"] = realVal === "active";
                } else {
                    backendFilters[key] = realVal;
                }
            }
        }

        const response = await axiosInstance.post(
            `${API_ENDPOINTS.MASTER.SUPPLIER.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

    async view(id: string): Promise<SupplierListRecord> {
        const response = await axiosInstance.get(
            API_ENDPOINTS.MASTER.SUPPLIER.VIEW(id),
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
            API_ENDPOINTS.MASTER.SUPPLIER.PREVIEW_NUMBER,
        );
        const payload = response.data as Record<string, unknown>;
        const data = payload.data as Record<string, unknown> | undefined;
        return asString(data?.supplier_code);
    },

    async create(payload: SupplierCreatePayload): Promise<void> {
        const hasFile = payload.file1 instanceof File;

        const response = await axiosInstance.post(
            API_ENDPOINTS.MASTER.SUPPLIER.CREATE,
            hasFile ? buildFormData(payload) : payload,
            hasFile ? { headers: { "Content-Type": "multipart/form-data" } } : undefined,
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(asString(body.message) || "Failed to create supplier.");
        }
    },

    async update(id: string, payload: SupplierUpdatePayload): Promise<void> {
        const hasFile = payload.file1 instanceof File;

        const response = await axiosInstance.put(
            API_ENDPOINTS.MASTER.SUPPLIER.UPDATE(id),
            hasFile ? buildFormData(payload) : payload,
            hasFile ? { headers: { "Content-Type": "multipart/form-data" } } : undefined,
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(asString(body.message) || "Failed to update supplier.");
        }
    },

    async updateStatus(id: string, isActive: boolean): Promise<void> {
        const response = await axiosInstance.patch(
            API_ENDPOINTS.MASTER.SUPPLIER.STATUS_UPDATE(id),
            { is_active: isActive },
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(
                asString(body.message) || "Failed to update supplier status.",
            );
        }
    },

    async export(params: SupplierExportParams): Promise<void> {
        const ordering = encodeURIComponent(params.ordering ?? "");

        const response = await axiosInstance.post(
            `${API_ENDPOINTS.MASTER.SUPPLIER.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
            { filters: params.apiFilters ?? {} },
            { responseType: "blob" },
        );

        const blob = response.data as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `suppliers_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    async dropdown(): Promise<SupplierDropdownItem[]> {
        const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SUPPLIER.DROPDOWN);
        const payload = response.data as Record<string, unknown>;
        const data = payload.data;

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an array.");
        }

        return data.map((row) => {
            const item = (row ?? {}) as Record<string, unknown>;
            return {
                supplier_id: asString(item.supplier_id),
                supplierName: asString(item.supplierName ?? item.supplier_name),
                supplierCode: asString(item.supplierCode ?? item.supplier_code),
            };
        });
    },

    extractErrorMessage,
};