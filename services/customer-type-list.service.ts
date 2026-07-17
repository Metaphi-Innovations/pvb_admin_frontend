import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface CustomerTypeListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface CustomerTypeListDocument {
  id: string;
  title: string;
}

export interface CustomerTypeDocument {
  id: string;
  documentTypeId: string;
  documentType: { title: string };
}

export interface CustomerTypeListRecord {
  id: number;
  customerTypeId: string;
  initialCode: string;
  customerType: string;
  description: string;
  status: "active" | "inactive";
  documents: CustomerTypeListDocument[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CustomerTypeListResult {
  items: CustomerTypeListRecord[];
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

function mapDocuments(raw: unknown): CustomerTypeListDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const doc = (item ?? {}) as Record<string, unknown>;
    return {
      id: asString(doc.id),
      title: asString(doc.title),
    };
  });
}

function mapDocumentsWithType(raw: unknown): CustomerTypeDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const doc = (item ?? {}) as Record<string, unknown>;
    const documentType = (doc.documentType ?? {}) as Record<string, unknown>;
    return {
      id: asString(doc.id),
      documentTypeId: asString(doc.documentTypeId),
      documentType: { title: asString(documentType.title) },
    };
  });
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): CustomerTypeListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    customerTypeId: asString(raw.customer_type_id ?? raw.id),
    initialCode: asString(raw.customer_initial_code),
    customerType: asString(raw.customer_type_name),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    documents: mapDocuments(raw.documents),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapDetail(raw: Record<string, unknown>): CustomerTypeListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    customerTypeId: asString(raw.id ?? raw.customer_type_id),
    initialCode: asString(raw.customer_initial_code),
    customerType: asString(raw.customer_type_name),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    documents: mapDocuments(raw.documents),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

export interface CustomerTypeCreatePayload {
  customerInitialCode: string;
  customerTypeName: string;
  description: string;
  documentTypeIds: string[];
}

export interface CustomerTypeUpdatePayload {
  customerTypeName: string;
  description: string;
  documentTypeIds: string[];
}

export interface CustomerTypeExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
}

export interface CustomerTypeFilterOption {
  label: string;
  value: string;
}

export type CustomerTypeFilterField =
  | "customer_type_name"
  | "customer_initial_code"
  | "description"
  | "is_active"
  | "created_by_user__username"
  | "updated_by_user__username";

function mapFilterOptions(
  data: unknown[],
  fieldName: CustomerTypeFilterField,
): CustomerTypeFilterOption[] {
  const options: CustomerTypeFilterOption[] = [];
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

export interface CustomerTypeDropdownItem {
  id: string;
  customerType: string;
  customerInitialCode?: string;
  documents: CustomerTypeDocument[];
}

export const CustomerTypeListService = {
  async list(params: CustomerTypeListParams): Promise<CustomerTypeListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.CUSTOMER_TYPE.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
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

  async view(id: string): Promise<CustomerTypeListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CUSTOMER_TYPE.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: CustomerTypeCreatePayload): Promise<void> {
    const response = await axiosInstance.post(API_ENDPOINTS.MASTER.CUSTOMER_TYPE.CREATE, {
      customer_initial_code: payload.customerInitialCode.trim() || undefined,
      customer_type_name: payload.customerTypeName.trim(),
      description: payload.description.trim() || null,
      documentTypeIds: payload.documentTypeIds,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create customer type.");
    }
  },

  async update(id: string, payload: CustomerTypeUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(API_ENDPOINTS.MASTER.CUSTOMER_TYPE.UPDATE(id), {
      customer_type_name: payload.customerTypeName.trim(),
      description: payload.description.trim() || null,
      documentTypeIds: payload.documentTypeIds,
    });

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update customer type.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.MASTER.CUSTOMER_TYPE.STATUS_UPDATE(id),
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update customer type status.");
    }
  },

  async getFilterDropdown(
    fieldName: CustomerTypeFilterField,
    signal?: AbortSignal,
  ): Promise<CustomerTypeFilterOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.CUSTOMER_TYPE.FILTER_DROPDOWN,
      {
        params: { field_name: fieldName },
        signal,
      },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return mapFilterOptions(data, fieldName);
  },

  async export(params: CustomerTypeExportParams): Promise<void> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.CUSTOMER_TYPE.EXPORT}?search=${encodeURIComponent(params.search)}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customer_types_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async dropdown(): Promise<CustomerTypeDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CUSTOMER_TYPE.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map(item => ({
      id: String(item.id),
      customerType: String(item.customer_type_name),
      customerInitialCode: asString(item.customer_initial_code),
      documents: mapDocumentsWithType(item.documents),
    }));
  },
};
