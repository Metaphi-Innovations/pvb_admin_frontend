import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  StockValuationDetailsResult,
  StockValuationExportPayload,
  StockValuationFiltersConfig,
  StockValuationQueryParams,
  StockValuationSaveMarketRatePayload,
  StockValuationSaveMarketRateResult,
  StockValuationSummaryResult,
} from "@/types/stock-valuation.types";

export class StockValuationApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StockValuationApiError";
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
): Promise<StockValuationApiError> {
  if (error instanceof StockValuationApiError) return error;
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
    if (fromBlob) return new StockValuationApiError(fromBlob, status);
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
  return new StockValuationApiError(message, status);
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
export function buildStockValuationOrdering(
  sortBy: string | null | undefined,
  sortOrder: "asc" | "desc" | "none" | undefined,
): string | undefined {
  if (!sortBy || !sortOrder || sortOrder === "none") return undefined;
  return sortOrder === "desc" ? `-${sortBy}` : sortBy;
}

/** UI column key → backend filter-dropdown field_name */
export const STOCK_VALUATION_FILTER_FIELD_BY_COLUMN: Record<
  string,
  import("@/types/stock-valuation.types").StockValuationFilterField
> = {
  productName: "product_name",
  warehouse: "warehouse_name",
  voucherNumber: "voucher_number",
};

export function mapStockValuationFilterOptions(
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

export function buildStockValuationColumnFilterParams(
  columnFilters: import("@/lib/accounts/column-filter-types").AccountsColumnFilters,
): import("@/types/stock-valuation.types").StockValuationColumnFilters {
  const pick = (colKey: string): string[] => {
    const selected = columnFilters[colKey]?.selectedValues;
    if (!selected?.length) return [];
    return selected.map((v) => String(v).trim()).filter(Boolean);
  };
  return {
    product_name: pick("productName"),
    warehouse_name: pick("warehouse"),
    voucher_number: pick("voucherNumber"),
  };
}

export function buildStockValuationQueryParams(
  params: StockValuationQueryParams,
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

  const warehouseIds = joinIds(params.warehouse_ids);
  if (warehouseIds) query.warehouse_ids = warehouseIds;

  const productIds = joinIds(params.product_ids);
  if (productIds) query.product_ids = productIds;

  const cf = params.column_filters;
  if (cf?.product_name?.length) query.product_name = cf.product_name.join(",");
  if (cf?.warehouse_name?.length)
    query.warehouse_name = cf.warehouse_name.join(",");
  if (cf?.voucher_number?.length)
    query.voucher_number = cf.voucher_number.join(",");

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
      (await messageFromBlob(blob)) || "Failed to export Stock Valuation.";
    throw new StockValuationApiError(message);
  }
  if (!blob || blob.size === 0) {
    throw new StockValuationApiError("Export returned an empty file.");
  }
}

export const StockValuationApiService = {
  async getFilters(signal?: AbortSignal): Promise<StockValuationFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_VALUATION.FILTERS,
        { signal },
      );
      return unwrapData<StockValuationFiltersConfig>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Stock Valuation filters.");
    }
  },

  async getFilterDropdown(
    fieldName: string,
    signal?: AbortSignal,
  ): Promise<unknown[]> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_VALUATION.FILTER_DROPDOWN,
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
        "Failed to load Stock Valuation filter dropdown.",
      );
    }
  },

  async getSummary(
    params: StockValuationQueryParams,
    signal?: AbortSignal,
  ): Promise<StockValuationSummaryResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_VALUATION.LIST,
        {
          params: buildStockValuationQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<StockValuationSummaryResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Stock Valuation summary.");
    }
  },

  async getAccountingDetails(
    params: StockValuationQueryParams,
    signal?: AbortSignal,
  ): Promise<StockValuationDetailsResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_VALUATION.DETAILS,
        {
          params: buildStockValuationQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<StockValuationDetailsResult>(response);
    } catch (error) {
      throw await toApiError(
        error,
        "Failed to load Stock Valuation accounting details.",
      );
    }
  },

  async exportReport(payload: StockValuationExportPayload): Promise<void> {
    try {
      const query = buildStockValuationQueryParams(payload, {
        includePage: false,
      });
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_VALUATION.EXPORT,
        {
          ...query,
          format: payload.format,
          view: payload.view,
          basis: payload.basis ?? "cost",
        },
        {
          headers: authHeaders(payload.financial_year_id),
          responseType: "blob",
        },
      );

      const blob = response.data as Blob;
      const contentType = String(
        response.headers?.["content-type"] ?? blob.type ?? "",
      );
      await assertExportBlob(blob, contentType);

      const fallback =
        payload.format === "PDF"
          ? "Stock_Valuation.pdf"
          : "Stock_Valuation.xlsx";
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"],
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw await toApiError(error, "Failed to export Stock Valuation.");
    }
  },

  async saveMarketRate(
    payload: StockValuationSaveMarketRatePayload,
    financialYearId?: string,
  ): Promise<StockValuationSaveMarketRateResult> {
    try {
      const response = await axiosInstance.put(
        API_ENDPOINTS.ACCOUNTS.REPORTS.STOCK_VALUATION.MARKET_RATE,
        {
          product_id: payload.product_id,
          warehouse_id: payload.warehouse_id,
          as_on_date: payload.as_on_date,
          market_rate: payload.market_rate,
        },
        {
          headers: financialYearId ? authHeaders(financialYearId) : undefined,
        },
      );
      return unwrapData<StockValuationSaveMarketRateResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to save market rate.");
    }
  },
};
