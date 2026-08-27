import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { FilterState } from "@/components/listing/types";
import {
  getPRPoStatusLabel,
  getPRStatusLabel,
  mapBackendPoStatusToFrontend,
  mapBackendStatusToFrontend,
  mapFrontendPoStatusToBackend,
  mapFrontendStatusToBackend,
  type PRListStatus,
  type PRPoStatus,
} from "@/lib/procurement/pr-status";

export interface PurchaseRequestListItem {
  id: string;
  prNumber: string;
  prDate: string;
  requestedById: string;
  requestedBy: string;
  requiredByDate: string;
  priority: string;
  remarks: string;
  status: PRListStatus;
  currentApproverId: string;
  currentApprover: string;
  poStatus: PRPoStatus;
  totalItems: number;
  totalQty: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PurchaseRequestListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface PurchaseRequestListResult {
  items: PurchaseRequestListItem[];
  total: number;
}

export interface PurchaseRequestListSummary {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
}

export interface PurchaseRequestFilterOption {
  label: string;
  value: string;
}

export type PurchaseRequestFilterField =
  | "pr_number"
  | "status"
  | "priority"
  | "requested_by_id"
  | "po_status";

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asDateOnly(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function firstFilterValue(value: unknown): string {
  if (Array.isArray(value)) return asString(value[0]).trim();
  return asString(value).trim();
}

function mapItem(raw: Record<string, unknown>): PurchaseRequestListItem {
  return {
    id: asString(raw.id),
    prNumber: asString(raw.pr_number),
    prDate: asDateOnly(raw.pr_date),
    requestedById: asString(raw.requested_by_id),
    requestedBy: asString(raw.requested_by_name),
    requiredByDate: asDateOnly(raw.required_by_date),
    priority: asString(raw.priority),
    remarks: asString(raw.remarks),
    status: mapBackendStatusToFrontend(raw.status),
    currentApproverId: asString(raw.current_approver_id),
    currentApprover: asString(raw.current_approver_name) || "—",
    poStatus: mapBackendPoStatusToFrontend(raw.po_status),
    totalItems: asNumber(raw.items_count),
    totalQty: asNumber(raw.total_requested_qty),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: asString(raw.created_by_name),
  };
}

function mapSummary(raw: Record<string, unknown>): PurchaseRequestListSummary {
  return {
    total: asNumber(raw.totalPRs),
    draft: asNumber(raw.draftPRs),
    pendingApproval: asNumber(raw.pendingPRs),
    approved: asNumber(raw.approvedPRs),
    rejected: asNumber(raw.rejectedPRs),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: PurchaseRequestFilterField,
): PurchaseRequestFilterOption[] {
  const options: PurchaseRequestFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const value = asString(record[fieldName]).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "status") {
      const frontendStatus = mapBackendStatusToFrontend(value);
      options.push({
        label: getPRStatusLabel(frontendStatus),
        value: frontendStatus,
      });
      continue;
    }

    if (fieldName === "po_status") {
      const frontendStatus = mapBackendPoStatusToFrontend(value);
      options.push({
        label: getPRPoStatusLabel(frontendStatus),
        value: frontendStatus,
      });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildPurchaseRequestApiFilters(
  filters: FilterState,
  tabStatus?: string | null,
): Record<string, unknown> {
  const apiFilters: Record<string, unknown> = {};

  const prNumber = firstFilterValue(filters.prNumber);
  if (prNumber) {
    apiFilters.pr_number = prNumber;
  }

  const columnStatus = firstFilterValue(filters.approvalStatus);
  if (columnStatus) {
    const backendStatus = mapFrontendStatusToBackend(columnStatus);
    if (backendStatus) apiFilters.status = backendStatus;
  } else if (tabStatus && tabStatus !== "all") {
    const backendStatus = mapFrontendStatusToBackend(tabStatus);
    if (backendStatus) apiFilters.status = backendStatus;
  }

  const requestedBy = firstFilterValue(filters.requestedBy);
  if (requestedBy) {
    apiFilters.requested_by_name = requestedBy;
  }

  const poStatus = firstFilterValue(filters.poStatus);
  if (poStatus) {
    const backendPo = mapFrontendPoStatusToBackend(poStatus);
    if (backendPo) apiFilters.po_status = backendPo;
  }

  const requiredByDate = filters.requiredByDate;
  if (
    requiredByDate &&
    typeof requiredByDate === "object" &&
    !Array.isArray(requiredByDate)
  ) {
    const range = requiredByDate as { fromDate?: string; toDate?: string };
    if (range.fromDate) apiFilters.required_by_date_from = range.fromDate;
    if (range.toDate) apiFilters.required_by_date_to = range.toDate;
  }

  return apiFilters;
}

export function buildPurchaseRequestOrdering(
  sortKey: string,
  direction: "asc" | "desc" | "none",
): string | undefined {
  if (!sortKey || direction === "none") return undefined;

  const fieldMap: Record<string, string> = {
    prNumber: "pr_number",
    prDate: "pr_date",
    requestedBy: "requested_by__first_name",
    requiredByDate: "required_by_date",
    totalItems: "items__count",
    approvalStatus: "status",
    poStatus: "po_status",
    createdAt: "created_at",
  };

  const backendKey = fieldMap[sortKey];
  if (!backendKey) return undefined;

  return direction === "desc" ? `-${backendKey}` : backendKey;
}

function buildListQueryString(params: PurchaseRequestListParams): string {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("page_size", String(params.pageSize));
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.search) query.set("search", params.search);

  const filters = params.apiFilters ?? {};
  for (const key of [
    "required_by_date_from",
    "required_by_date_to",
    "pr_date_from",
    "pr_date_to",
    "requested_by_name",
    "pr_number",
    "status",
    "po_status",
    "priority",
  ] as const) {
    const value = filters[key];
    if (typeof value === "string" && value.trim()) {
      query.set(key, value.trim());
    }
  }

  return query.toString();
}

function bodyFilters(
  apiFilters?: Record<string, unknown>,
): Record<string, unknown> {
  if (!apiFilters) return {};
  const body: Record<string, unknown> = {};
  for (const key of [
    "status",
    "priority",
    "requested_by_id",
    "pr_number",
    "po_status",
    "required_by_date_from",
    "required_by_date_to",
    "pr_date_from",
    "pr_date_to",
    "requested_by_name",
  ] as const) {
    if (apiFilters[key] !== undefined) body[key] = apiFilters[key];
  }
  return body;
}

export const PurchaseRequestListService = {
  async list(
    params: PurchaseRequestListParams,
  ): Promise<PurchaseRequestListResult> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.LIST}?${buildListQueryString(params)}`,
      { filters: bodyFilters(params.apiFilters) },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row) =>
      mapItem((row ?? {}) as Record<string, unknown>),
    );
    const totalRecords = Number(payload.totalRecords);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async getSummary(signal?: AbortSignal): Promise<PurchaseRequestListSummary> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.SUMMARY,
      { signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapSummary(data as Record<string, unknown>);
  },

  async getFilterDropdown(
    fieldName: PurchaseRequestFilterField,
    signal?: AbortSignal,
  ): Promise<PurchaseRequestFilterOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.FILTER_DROPDOWN,
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

  async export(params: {
    search: string;
    apiFilters?: Record<string, unknown>;
    ordering?: string;
  }): Promise<void> {
    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("page_size", "100");
    if (params.ordering) query.set("ordering", params.ordering);
    if (params.search) query.set("search", params.search);

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.EXPORT}?${query.toString()}`,
      { filters: bodyFilters(params.apiFilters) },
      { responseType: "blob" },
    );

    const contentType = String(response.headers?.["content-type"] ?? "");
    if (contentType.includes("application/json")) {
      const text = await (response.data as Blob).text();
      let message = "No records found to export.";
      try {
        const body = JSON.parse(text) as Record<string, unknown>;
        message = asString(body.message) || message;
      } catch {
        // keep default
      }
      throw new Error(message);
    }

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `purchase_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
