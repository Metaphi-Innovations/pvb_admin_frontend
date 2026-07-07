import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  getPOStatusLabel,
  mapBackendStatusToFrontend,
  mapFrontendStatusToBackend,
  type POListStatus,
} from "@/lib/procurement/po-status";
import type { FilterState } from "@/components/listing/types";

export interface PurchaseOrderListItem {
  id: string;
  poNumber: string;
  poDate: string;
  supplierId: string;
  supplierName: string;
  supplierGstin: string;
  supplierSecondaryLine: string;
  sourcePrId: string;
  sourcePrNumber: string;
  totalItems: number;
  grandTotal: number;
  status: POListStatus;
  paymentType: string;
  warehouseName: string;
  followUpCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PurchaseOrderListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface PurchaseOrderListResult {
  items: PurchaseOrderListItem[];
  total: number;
}

/** Only fields that match backend `/summary` are populated; others stay 0. */
export interface PurchaseOrderListSummary {
  total: number;
  closedPo: number;
  draftPo: number;
  pendingApproval: number;
}

export interface PurchaseOrderFilterOption {
  label: string;
  value: string;
}

export type PurchaseOrderFilterField =
  | "supplier__supplier_name"
  | "purchase_requisition__pr_number"
  | "po_status";

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
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

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function mapSupplierSecondaryLine(supplier: Record<string, unknown>): string {
  const gstin = asString(supplier.gstin_number).trim();
  if (gstin) return "GST Registered";
  return "";
}

function mapItem(raw: Record<string, unknown>): PurchaseOrderListItem {
  const supplier =
    raw.supplier &&
    typeof raw.supplier === "object" &&
    !Array.isArray(raw.supplier)
      ? (raw.supplier as Record<string, unknown>)
      : {};
  const pr =
    raw.purchase_requisition &&
    typeof raw.purchase_requisition === "object" &&
    !Array.isArray(raw.purchase_requisition)
      ? (raw.purchase_requisition as Record<string, unknown>)
      : {};
  const counts =
    raw._count && typeof raw._count === "object" && !Array.isArray(raw._count)
      ? (raw._count as Record<string, unknown>)
      : {};

  return {
    id: asString(raw.purchase_order_id ?? raw.id),
    poNumber: asString(raw.po_no),
    poDate: asDateOnly(raw.po_date),
    supplierId: asString(supplier.supplier_id ?? raw.supplier_id),
    supplierName: asString(supplier.supplier_name),
    supplierGstin: asString(supplier.gstin_number),
    supplierSecondaryLine: mapSupplierSecondaryLine(supplier),
    sourcePrId: asString(pr.id ?? raw.purchase_requisition_id),
    sourcePrNumber: asString(pr.pr_number),
    totalItems: asNumber(counts.products),
    grandTotal: asNumber(raw.grand_total),
    status: mapBackendStatusToFrontend(raw.po_status),
    paymentType: asString(raw.payment_type),
    warehouseName: asString(raw.warehouse_name),
    followUpCount: asNumber(counts.followups),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapSummary(raw: Record<string, unknown>): PurchaseOrderListSummary {
  return {
    total: asNumber(raw.totalPO),
    closedPo: asNumber(raw.closedPO),
    draftPo: asNumber(raw.draftPO),
    pendingApproval: asNumber(raw.pendingApproval),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: PurchaseOrderFilterField,
): PurchaseOrderFilterOption[] {
  const options: PurchaseOrderFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const value = asString(record[fieldName]).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "po_status") {
      const frontendStatus = mapBackendStatusToFrontend(value);
      options.push({
        label: getPOStatusLabel(frontendStatus),
        value: frontendStatus,
      });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function firstFilterValue(value: unknown): string {
  if (Array.isArray(value)) return asString(value[0]).trim();
  return asString(value).trim();
}

/**
 * Maps MasterListing filter state + tab into backend list `filters` payload.
 */
export function buildPurchaseOrderApiFilters(
  filters: FilterState,
  tabStatus?: string | null,
): Record<string, unknown> {
  const apiFilters: Record<string, unknown> = {};

  const supplierName = firstFilterValue(filters.supplierName);
  if (supplierName) {
    apiFilters.supplier = { supplier_name: supplierName };
  }

  const sourcePrNumber = firstFilterValue(filters.sourcePrNumber);
  if (sourcePrNumber) {
    apiFilters.purchase_requisition = { pr_number: sourcePrNumber };
  }

  const columnStatus = firstFilterValue(filters.status);
  const statusToken =
    columnStatus ||
    (tabStatus && tabStatus !== "all" && tabStatus !== "po_return"
      ? tabStatus
      : "");
  const backendStatus = mapFrontendStatusToBackend(statusToken);
  if (backendStatus) {
    apiFilters.po_status = backendStatus;
  }

  const poDate = filters.poDate;
  if (poDate && typeof poDate === "object" && !Array.isArray(poDate)) {
    const range = poDate as { fromDate?: string; toDate?: string };
    if (range.fromDate) apiFilters.po_date_from = range.fromDate;
    if (range.toDate) apiFilters.po_date_to = range.toDate;
  }

  return apiFilters;
}

/** Maps UI sort state to backend `ordering` query param. */
export function buildPurchaseOrderOrdering(
  sortKey: string,
  direction: "asc" | "desc" | "none",
): string | undefined {
  if (!sortKey || direction === "none") return undefined;

  const fieldMap: Record<string, string> = {
    poNumber: "poNo",
    supplierName: "supplier__supplier_name",
    status: "po_status",
    poDate: "poDate",
    totalItems: "itemCount",
    grandTotal: "poAmount",
    followUp: "followupCount",
  };

  const backendKey = fieldMap[sortKey];
  if (!backendKey) return undefined;

  return direction === "desc" ? `-${backendKey}` : backendKey;
}

function buildListQueryString(params: PurchaseOrderListParams): string {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("limit", String(params.pageSize));
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.search) query.set("search", params.search);
  return query.toString();
}

export const PurchaseOrderListService = {
  async list(
    params: PurchaseOrderListParams,
  ): Promise<PurchaseOrderListResult> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.LIST}?${buildListQueryString(params)}`,
      {
        filters: params.apiFilters ?? {},
      },
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

  async getSummary(signal?: AbortSignal): Promise<PurchaseOrderListSummary> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.SUMMARY,
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
    fieldName: PurchaseOrderFilterField,
    signal?: AbortSignal,
  ): Promise<PurchaseOrderFilterOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.FILTER_DROPDOWN,
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
    if (params.ordering) query.set("ordering", params.ordering);
    if (params.search) query.set("search", params.search);

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.EXPORT}?${query.toString()}`,
      {
        filters: params.apiFilters ?? {},
      },
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
        // keep default message
      }
      throw new Error(message);
    }

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
