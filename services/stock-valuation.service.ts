import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  StockValuationDetailsResult,
  StockValuationExportPayload,
  StockValuationFiltersConfig,
  StockValuationQueryParams,
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

export function buildStockValuationQueryParams(
  params: StockValuationQueryParams,
  options?: { includePage?: boolean },
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
    sort_by: params.sort_by ?? "product_name",
    sort_order: params.sort_order ?? "asc",
  };

  if (options?.includePage !== false) {
    query.page = params.page ?? 1;
    query.page_size = params.page_size ?? 25;
  }

  const warehouseIds = joinIds(params.warehouse_ids);
  if (warehouseIds) query.warehouse_ids = warehouseIds;

  const productIds = joinIds(params.product_ids);
  if (productIds) query.product_ids = productIds;

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
          params: buildStockValuationQueryParams({
            ...params,
            sort_by: params.sort_by ?? "voucher_date",
            sort_order: params.sort_order ?? "asc",
          }),
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
};
