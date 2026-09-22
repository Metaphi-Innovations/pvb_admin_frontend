import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  StockRegisterBatchResult,
  StockRegisterDetailedResult,
  StockRegisterExportPayload,
  StockRegisterFiltersConfig,
  StockRegisterQueryParams,
  StockRegisterRejectedDetailedResult,
  StockRegisterRejectedSummaryResult,
  StockRegisterSummaryResult,
} from "@/types/stock-register.types";

export class StockRegisterApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StockRegisterApiError";
    this.status = status;
  }
}

async function messageFromBlob(blob: Blob): Promise<string | null> {
  try {
    const text = await blob.text();
    if (!text.trim()) return null;
    try {
      const parsed = JSON.parse(text) as {
        message?: string;
        error?: string;
      };
      return parsed.message || parsed.error || null;
    } catch {
      if (/<!doctype html|<html/i.test(text)) {
        return "Session expired or unauthorized. Please sign in again.";
      }
      return text.slice(0, 200);
    }
  } catch {
    return null;
  }
}

async function toApiError(
  error: unknown,
  fallback: string,
): Promise<StockRegisterApiError> {
  if (error instanceof StockRegisterApiError) return error;
  const err = error as {
    status?: number;
    message?: string;
    error?: string;
    response?: {
      status?: number;
      data?: Blob | { message?: string; error?: string } | string;
    };
  };
  const status = err.status ?? err.response?.status;
  const data = err.response?.data;

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const fromBlob = await messageFromBlob(data);
    if (fromBlob) return new StockRegisterApiError(fromBlob, status);
  }

  const message =
    err.message ||
    (data && typeof data === "object" && !(data instanceof Blob)
      ? data.message || data.error
      : undefined) ||
    (typeof data === "string" ? data : undefined) ||
    err.error ||
    (status === 401 || status === 403
      ? "Session expired or unauthorized. Please sign in again."
      : fallback);
  return new StockRegisterApiError(message, status);
}

function unwrapData<T>(response: { data?: { data?: T } | T }): T {
  const body = response.data as { data?: T } | T | undefined;
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as { data?: T }).data !== undefined
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export function joinIds(ids: string[] | undefined): string | undefined {
  const unique = Array.from(
    new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)),
  );
  return unique.length > 0 ? unique.join(",") : undefined;
}

/** Maps UI sort state to backend `ordering` query param (PO-style). */
export function buildStockRegisterOrdering(
  sortBy: string | null | undefined,
  sortOrder: "asc" | "desc" | "none" | undefined,
): string | undefined {
  if (!sortBy || !sortOrder || sortOrder === "none") return undefined;
  return sortOrder === "desc" ? `-${sortBy}` : sortBy;
}

/** UI column key → backend filter-dropdown field_name */
export const STOCK_REGISTER_FILTER_FIELD_BY_COLUMN: Record<
  string,
  import("@/types/stock-register.types").StockRegisterFilterField
> = {
  productName: "product_name",
  warehouse: "warehouse_name",
  voucherNumber: "document_no",
  batchNo: "batch_no",
  stockType: "stock_type",
};

export function mapStockRegisterFilterOptions(
  data: unknown[],
  fieldName: string,
): { value: string; count: number }[] {
  const seen = new Set<string>();
  const out: { value: string; count: number }[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const raw = (row as Record<string, unknown>)[fieldName];
    const value = raw == null ? "" : String(raw).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, count: 0 });
  }
  return out;
}

export function buildStockRegisterColumnFilterParams(
  columnFilters: import("@/lib/accounts/column-filter-types").AccountsColumnFilters,
): import("@/types/stock-register.types").StockRegisterColumnFilters {
  const pick = (colKey: string): string[] => {
    const selected = columnFilters[colKey]?.selectedValues;
    if (!selected?.length) return [];
    return selected.map((v) => String(v).trim()).filter(Boolean);
  };
  return {
    product_name: pick("productName"),
    warehouse_name: pick("warehouse"),
    document_no: pick("voucherNumber"),
    batch_no: pick("batchNo"),
    stock_type: pick("stockType"),
  };
}

export function buildStockRegisterQueryParams(
  params: StockRegisterQueryParams,
  options?: { includePage?: boolean },
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
  };

  if (params.ordering?.trim()) {
    query.ordering = params.ordering.trim();
  }

  if (options?.includePage !== false) {
    query.page = params.page ?? 1;
    query.page_size = params.page_size ?? 25;
  }

  if (params.include_rejected) {
    query.include_rejected = "true";
  }

  const warehouseIds = joinIds(params.warehouse_ids);
  if (warehouseIds) query.warehouse_ids = warehouseIds;

  const productIds = joinIds(params.product_ids);
  if (productIds) query.product_ids = productIds;

  const cf = params.column_filters;
  if (cf?.product_name?.length) query.product_name = cf.product_name.join(",");
  if (cf?.warehouse_name?.length)
    query.warehouse_name = cf.warehouse_name.join(",");
  if (cf?.document_no?.length) query.document_no = cf.document_no.join(",");
  if (cf?.batch_no?.length) query.batch_no = cf.batch_no.join(",");
  if (cf?.stock_type?.length) query.stock_type = cf.stock_type.join(",");

  return query;
}

function filenameFromDisposition(
  disposition: string | undefined,
  fallback: string,
): string {
  if (!disposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(disposition);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function authHeaders(financialYearId: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (financialYearId.trim()) {
    headers["x-financial-year-id"] = financialYearId.trim();
  }
  return headers;
}

async function assertExportBlob(
  blob: Blob,
  contentType: string,
): Promise<void> {
  const type = `${contentType} ${blob.type}`.toLowerCase();
  if (
    type.includes("application/json") ||
    type.includes("text/html") ||
    type.includes("text/plain")
  ) {
    const message =
      (await messageFromBlob(blob)) || "Failed to export Stock Register.";
    throw new StockRegisterApiError(message);
  }
  if (!blob || blob.size === 0) {
    throw new StockRegisterApiError("Export returned an empty file.");
  }
}

export const StockRegisterApiService = {
  async getFilters(signal?: AbortSignal): Promise<StockRegisterFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_REGISTER.FILTERS,
        { signal },
      );
      return unwrapData<StockRegisterFiltersConfig>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Stock Register filters.");
    }
  },

  async getFilterDropdown(
    fieldName: string,
    signal?: AbortSignal,
  ): Promise<unknown[]> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_REGISTER.FILTER_DROPDOWN,
        {
          params: { field_name: fieldName },
          signal,
        },
      );
      const payload = response.data as { data?: unknown };
      return Array.isArray(payload.data) ? payload.data : [];
    } catch (error) {
      throw await toApiError(
        error,
        "Failed to load Stock Register filter dropdown.",
      );
    }
  },

  async getSummary(
    params: StockRegisterQueryParams,
    signal?: AbortSignal,
  ): Promise<StockRegisterSummaryResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_REGISTER.LIST,
        {
          params: buildStockRegisterQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<StockRegisterSummaryResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Stock Register summary.");
    }
  },

  async getDetailed(
    params: StockRegisterQueryParams,
    signal?: AbortSignal,
  ): Promise<StockRegisterDetailedResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_REGISTER.DETAILED,
        {
          params: buildStockRegisterQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<StockRegisterDetailedResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Stock Register detailed.");
    }
  },

  async getBatchWise(
    params: StockRegisterQueryParams,
    signal?: AbortSignal,
  ): Promise<StockRegisterBatchResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_REGISTER.BATCH_WISE,
        {
          params: buildStockRegisterQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<StockRegisterBatchResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Stock Register batch-wise.");
    }
  },

  async getRejectedSummary(
    params: StockRegisterQueryParams,
    signal?: AbortSignal,
  ): Promise<StockRegisterRejectedSummaryResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_REGISTER.REJECTED,
        {
          params: buildStockRegisterQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<StockRegisterRejectedSummaryResult>(response);
    } catch (error) {
      throw await toApiError(
        error,
        "Failed to load Stock Register rejected summary.",
      );
    }
  },

  async getRejectedDetailed(
    params: StockRegisterQueryParams,
    signal?: AbortSignal,
  ): Promise<StockRegisterRejectedDetailedResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_REGISTER.REJECTED_DETAILED,
        {
          params: buildStockRegisterQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<StockRegisterRejectedDetailedResult>(response);
    } catch (error) {
      throw await toApiError(
        error,
        "Failed to load Stock Register rejected detailed.",
      );
    }
  },

  async export(payload: StockRegisterExportPayload): Promise<void> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_REGISTER.EXPORT,
        {
          ...buildStockRegisterQueryParams(payload, { includePage: false }),
          include_rejected: "true",
          format: payload.format,
          view: payload.view,
        },
        {
          responseType: "blob",
          headers: authHeaders(payload.financial_year_id),
        },
      );

      const blob = response.data as Blob;
      const contentType = String(response.headers?.["content-type"] ?? "");
      await assertExportBlob(blob, contentType);

      const viewTag =
        payload.view === "batch_wise"
          ? "BatchWise"
          : payload.view === "detailed"
            ? "Detailed"
            : payload.view === "rejected_detailed"
              ? "Rejected_Detailed"
              : payload.view === "rejected"
                ? "Rejected"
                : "Summary";
      const fallback = `Stock_Register_${viewTag}_${payload.from_date}_${payload.to_date}.${
        payload.format === "PDF" ? "pdf" : "xlsx"
      }`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"],
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw await toApiError(error, "Failed to export Stock Register.");
    }
  },
};
