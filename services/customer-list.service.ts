import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { CustomerBranch } from "@/app/(app)/masters/customers/customer-data";

export interface CustomerBranchDocumentPayload {
    document_type_id: string;
    file_key: string;
}

export interface CustomerBranchDocument {
    documentTypeId: string;
    documentName: string;
    required: boolean;
    fileName?: string;
    fileUrl?: string;
    file?: File;
    fileKey?: string;
}

export interface CustomerBranchPayload {
    branch_name: string;
    is_main_branch: boolean;
    billing_country: string;
    billing_address_line_1: string;
    billing_address_line_2: string;
    billing_state: string;
    billing_city: string;
    billing_town: string;
    billing_pincode: string;
    billing_pincode_id: string;
    shipping_country: string;
    shipping_address_line_1: string;
    shipping_address_line_2: string;
    shipping_state: string;
    shipping_city: string;
    shipping_town: string;
    shipping_pincode: string;
    shipping_pincode_id: string;
    documents: CustomerBranchDocumentPayload[];
}


export interface CustomerCreatePayload {
    customer_name: string;
    customer_type_id: string;

    country_code: string;
    mobile_no: string;
    email: string;

    sales_man_id: string;

    cib_applicable: boolean;
    cib_reg_no?: string;

    fco_applicable: boolean;
    fco_reg_no?: string;

    tan_no?: string;

    fssai_applicable: boolean;
    fssai_no?: string;

    msme_applicable: boolean;
    msme_reg_no?: string;

    gst_applicable: boolean;
    registration_type?: string;
    gstin_no?: string;
    registered_legal_name?: string;
    registered_gst_address?: string;
    pan_no?: string;

    tds_applicable: boolean;
    tds_section_id?: string;

    credit_limit?: number;
    payment_type?: string;
    credit_days?: number;
    advance?: number;

    account_holder?: string;
    bank_name?: string;
    branch_name?: string;
    account_number?: string;
    ifsc_code?: string;
    swift_code?: string;

    branches: CustomerBranchPayload[];

    [key: string]: unknown;
}

export interface CustomerUpdatePayload
    extends Partial<CustomerCreatePayload> { }

export interface CustomerListRecord {
    id: number;

    customerUuid: string;
    customerCode: string;
    customerName: string;

    customerType: string;
    customerTypeId?: string;

    countryCode: string;
    mobileNo: string;
    email: string;

    salesMan: string;
    salesManId?: string;

    cibApplicable: boolean;
    cibRegNo?: string;

    fcoApplicable: boolean;
    fcoRegNo?: string;

    tanNo?: string;

    fssaiApplicable: boolean;
    fssaiNo?: string;

    msmeApplicable: boolean;
    msmeRegNo?: string;

    gstApplicable: boolean;
    registrationType?: string;
    gstinNo?: string;
    registeredLegalName?: string;
    registeredGstAddress?: string;
    address?: string;
    stateName?: string;
    districtName?: string;
    territoryName?: string;
    panNo?: string;
    creditLimit: number | null;

    tdsApplicable: boolean;
    tdsSectionId?: string;

    paymentType?: string;
    creditDays: number | null;
    advance: number | null;

    accountHolder?: string;
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    ifscCode?: string;
    swiftCode?: string;

    branches?: unknown[];

    status: "active" | "inactive" | "draft" | "blocked";

    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}

export interface CustomerListResult {
    items: CustomerListRecord[];
    total: number;
}

export interface CustomerListParams {
    page: number;
    pageSize: number;
    search: string;
    ordering?: string;
    status: "all" | "active" | "inactive";
    apiFilters?: Record<string, unknown>;
    signal?: AbortSignal;
}

export interface CustomerExportParams {
    search: string;
    status: "all" | "active" | "inactive";
    ordering?: string;
    apiFilters?: Record<string, unknown>;
}

export interface CustomerDropdownItem {
    customer_id: string;
    customer_code: string;
    customer_name: string;

    customer_type?: {
        customer_type_id: string;
        customer_type_name: string;
    } | null;

    sales_man?: {
        sales_man_id: string;
        sales_man_name: string;
    } | null;

    mobile_no?: string | null;
    email?: string | null;

    gstin_no?: string | null;
    pan_no?: string | null;

    payment_type?: string | null;
    credit_limit?: number | null;
}

export interface CfCustomerDropdownItem {
    customer_code: string;
    customer_name: string;
    mobile_no: string;
    customer_id: string;
    customer_type: {
        customer_type_name: string;
    };
}

export function sortStateToOrdering(
    key: string,
    direction: "asc" | "desc" | "none",
): string {
    if (!key || direction === "none") return "";
    const field = SORT_FIELD_MAP[key];
    if (!field) return "";
    return direction === "desc" ? `-${field}` : field;
}



const SORT_FIELD_MAP: Record<string, string> = {
    customerCode: "customer_code",
    customerName: "customer_name",
    customerType: "customer_type__customer_type_name",
    mobileNo: "mobile_no",
    email: "email",
    salesMan: "sales_man__sales_man_name",
    paymentType: "payment_type",
    creditLimit: "credit_limit",
    creditDays: "credit_days",
    status: "status",
    address: "address",
};

const FILTER_FIELD_MAP: Record<string, string> = {
    customerCode: "customer_code",
    customerName: "customer_name",
    mobileNo: "mobile_no",
    email: "email",

    customerType: "customer_type_id",
    salesMan: "sales_man_id",

    gstApplicable: "gst_applicable",
    gstinNo: "gstin",

    tdsApplicable: "tds_applicable",
    tdsSectionId: "tds_section_id",

    paymentType: "payment_type",
    creditLimit: "credit_limit",

    address: "address",

    status: "status",
};

function mapFilters(filters: Record<string, unknown> = {}) {
    const mapped: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === "") {
            continue;
        }

        const apiKey = FILTER_FIELD_MAP[key] ?? key;

        mapped[apiKey] = Array.isArray(value) ? value[0] : value;
    }

    return mapped;
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
    if (!user) return "";

    if (typeof user === "string") {
        return user.trim();
    }

    if (typeof user !== "object") {
        return "";
    }

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

function toNullableNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/** Safely reads a name string from a field that may be a plain string or a nested object. */
function readNestedName(primary: unknown, ...fallbacks: unknown[]): string {
    if (primary && typeof primary === "object" && !Array.isArray(primary)) {
        const obj = primary as Record<string, unknown>;
        // Try common name keys
        for (const key of ["categoryName", "segment_name", "formulation_name", "cfu_name",
            "supplier_name", "name", "title"]) {
            if (obj[key]) return asString(obj[key]);
        }
        return "";
    }
    if (primary !== null && primary !== undefined && primary !== "") return asString(primary);
    for (const fb of fallbacks) {
        if (fb && typeof fb !== "object") return asString(fb);
    }
    return "";
}

/** Safely reads a UUID from a nested object or a flat id field. */
function readNestedId(nested: unknown, flatId: unknown, ...idKeys: string[]): string {
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const obj = nested as Record<string, unknown>;
        for (const key of ["id", "category_id", "segment_id", "formulation_id", "cfu_id",
            "supplier_id", "hsn_id", "gst_id", ...idKeys]) {
            if (obj[key]) return asString(obj[key]);
        }
    }
    return asString(flatId);
}

function mapItem(
    raw: Record<string, unknown>,
    fallbackIndex: number,
): CustomerListRecord {
    const srNo = Number(raw.sr_no);

    const customerTypeObj = raw.customer_type as Record<string, unknown> | null | undefined;
    const salesManObj = raw.sales_man as Record<string, unknown> | null | undefined;
    const tdsSectionObj = raw.tds_section as Record<string, unknown> | null | undefined;

    return {
        id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,

        customerUuid: asString(raw.customer_id),
        customerCode: asString(raw.customer_code),
        customerName: asString(raw.customer_name),

        customerType: readNestedName(
            customerTypeObj?.customer_type_name ?? customerTypeObj,
            raw.customer_type_name
        ),
        customerTypeId: readNestedId(customerTypeObj, raw.customer_type_id),

        countryCode: asString(raw.country_code),
        mobileNo: asString(raw.mobile_no),
        email: asString(raw.email),

        salesMan: readNestedName(
            salesManObj?.sales_man_name ?? salesManObj,
            raw.sales_man_name
        ),
        salesManId: readNestedId(salesManObj, raw.sales_man_id),

        cibApplicable: Boolean(raw.cib_applicable),
        cibRegNo: asString(raw.cib_reg_no),

        fcoApplicable: Boolean(raw.fco_applicable),
        fcoRegNo: asString(raw.fco_reg_no),

        tanNo: asString(raw.tan_no),

        fssaiApplicable: Boolean(raw.fssai_applicable),
        fssaiNo: asString(raw.fssai_no),

        msmeApplicable: Boolean(raw.msme_applicable),
        msmeRegNo: asString(raw.msme_reg_no),
        address: asString(raw.address),
        gstApplicable: Boolean(raw.gst_applicable),
        registrationType: asString(raw.registration_type),
        gstinNo: asString(raw.gstin_no),
        registeredLegalName: asString(raw.registered_legal_name),
        registeredGstAddress: asString(raw.registered_gst_address),
        panNo: asString(raw.pan_no),

        tdsApplicable: Boolean(raw.tds_applicable),
        tdsSectionId: readNestedId(tdsSectionObj, raw.tds_section_id),

        creditLimit: toNullableNumber(raw.credit_limit),
        paymentType: asString(raw.payment_type),
        creditDays: toNullableNumber(raw.credit_days),
        advance: toNullableNumber(raw.advance),

        accountHolder: asString(raw.account_holder),
        bankName: asString(raw.bank_name),
        branchName: asString(raw.branch_name),
        accountNumber: asString(raw.account_number),
        ifscCode: asString(raw.ifsc_code),
        swiftCode: asString(raw.swift_code),

        stateName: asString(raw.state),
        districtName: asString(raw.district),
        territoryName: asString(raw.territory),

        branches: Array.isArray(raw.branches) ? raw.branches : [],

        status: toStatus(raw.status, raw.is_active),

        createdAt: formatDate(raw.created_at),
        updatedAt: formatDate(raw.updated_at),

        createdBy: toDisplayName(raw.created_by),
        updatedBy: toDisplayName(raw.updated_by),
    };
}

function mapDetail(raw: Record<string, unknown>): CustomerListRecord {
    // mapDetail reuses mapItem so nested-object handling is centralised
    const mapped = mapItem(raw, -1);
    mapped.id = Number(raw.sr_no) > 0 ? Number(raw.sr_no) : 0;
    return mapped;
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

export function buildFileKey(branchIndex: number, documentTypeId: string): string {
    return `branch_${branchIndex}_doc_${documentTypeId}`;
}


// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const CustomerListService = {
    async list(params: CustomerListParams): Promise<CustomerListResult> {
        const ordering = encodeURIComponent(params.ordering ?? "");

        const response = await axiosInstance.post(
            `${API_ENDPOINTS.MASTER.CUSTOMER.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
            { filters: mapFilters(params.apiFilters) },
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

    async view(id: string): Promise<CustomerListRecord> {
        const response = await axiosInstance.get(
            API_ENDPOINTS.MASTER.CUSTOMER.VIEW(id),
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
            API_ENDPOINTS.MASTER.CUSTOMER.PREVIEW_NUMBER,
        );
        const payload = response.data as Record<string, unknown>;
        const data = payload.data as Record<string, unknown> | undefined;
        return asString(data?.previewNumber ?? payload?.previewNumber);
    },

    async create(payload: CustomerCreatePayload, branches: CustomerBranch[]): Promise<void> {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (key === "branches") return;
            if (value !== undefined && value !== null) formData.append(key, String(value));
        });
        formData.append("branches", JSON.stringify(payload.branches));

        branches.forEach((branch, branchIndex) => {
            branch.documents.forEach((doc) => {
                if (doc.documentTypeId && doc.file) {
                    formData.append(buildFileKey(branchIndex, doc.documentTypeId), doc.file);
                }
            });
        });

        const response = await axiosInstance.post(
            API_ENDPOINTS.MASTER.CUSTOMER.CREATE,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(asString(body.message) || "Failed to create customer.");
        }
    },

    // async update(id: string, payload: CustomerUpdatePayload): Promise<void> {
    //     const response = await axiosInstance.put(
    //         API_ENDPOINTS.MASTER.CUSTOMER.UPDATE(id),
    //         payload,
    //     );

    //     const body = response.data as Record<string, unknown>;
    //     if (!body.success) {
    //         throw new Error(asString(body.message) || "Failed to update customer.");
    //     }
    // },

    async update(id: string, payload: CustomerUpdatePayload, branches: CustomerBranch[]): Promise<void> {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (key === "branches") return;
            if (value !== undefined && value !== null) formData.append(key, String(value));
        });
        formData.append("branches", JSON.stringify(payload.branches));

        branches.forEach((branch, branchIndex) => {
            branch.documents.forEach((doc) => {
                if (doc.documentTypeId && doc.file) {
                    formData.append(buildFileKey(branchIndex, doc.documentTypeId), doc.file);
                }
            });
        });

        const response = await axiosInstance.put(
            API_ENDPOINTS.MASTER.CUSTOMER.UPDATE(id),
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(asString(body.message) || "Failed to update customer.");
        }
    },

    async updateStatus(id: string, isActive: boolean): Promise<void> {
        const response = await axiosInstance.patch(
            API_ENDPOINTS.MASTER.CUSTOMER.STATUS_UPDATE(id),
            { is_active: isActive },
        );

        const body = response.data as Record<string, unknown>;
        if (!body.success) {
            throw new Error(
                asString(body.message) || "Failed to update customer status.",
            );
        }
    },

    async export(params: CustomerExportParams): Promise<void> {
        const ordering = encodeURIComponent(params.ordering ?? "");

        const response = await axiosInstance.post(
            `${API_ENDPOINTS.MASTER.CUSTOMER.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
            { filters: params.apiFilters ?? {} },
            { responseType: "blob" },
        );

        const blob = response.data as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    async dropdown(): Promise<CustomerDropdownItem[]> {
        const response = await axiosInstance.get(
            API_ENDPOINTS.MASTER.CUSTOMER.DROPDOWN,
        );

        const payload = response.data as Record<string, unknown>;
        const data = payload.data;

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an array.");
        }

        return data as CustomerDropdownItem[];
    },

    async getCfCustomerDropdown() {
        const response = await axiosInstance.get(
            `${API_ENDPOINTS.MASTER.CUSTOMER.CFDROPDOWN}`,
        );

        const payload = response.data as Record<string, unknown>;
        const inner = payload.data as Record<string, unknown> | undefined;
        const data = inner?.data;

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an array.");
        }

        return data as CfCustomerDropdownItem[];
    },

    extractErrorMessage,
};
