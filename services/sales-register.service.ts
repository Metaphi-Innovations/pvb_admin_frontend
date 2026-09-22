import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  SalesRegisterExportPayload,
  SalesRegisterFiltersConfig,
  SalesRegisterQueryParams,
  SalesRegisterReportResult,
} from "@/types/sales-register.types";

export class SalesRegisterApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SalesRegisterApiError";
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
        statusCode?: number;
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
): Promise<SalesRegisterApiError> {
  if (error instanceof SalesRegisterApiError) return error;
  const err = error as {
    status?: number;
    message?: string;
    error?: string;
    response?: {
      status?: number;
      data?:
        | Blob
        | { message?: string; error?: string }
        | string;
    };
  };
  const status = err.status ?? err.response?.status;
  const data = err.response?.data;

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const fromBlob = await messageFromBlob(data);
    if (fromBlob) {
      return new SalesRegisterApiError(fromBlob, status);
    }
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
  return new SalesRegisterApiError(message, status);
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

/** Comma-join multi-select UUIDs for GET query and export JSON body. */
export function joinIds(ids: string[] | undefined): string | undefined {
  const unique = Array.from(
    new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)),
  );
  return unique.length > 0 ? unique.join(",") : undefined;
}

export function buildSalesRegisterQueryParams(
  params: SalesRegisterQueryParams,
  options?: { includePage?: boolean },
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
    gst_type: params.gst_type ?? "ALL",
    sort_by: params.sort_by ?? "invoice_date",
    sort_order: params.sort_order ?? "desc",
  };

  if (options?.includePage !== false) {
    query.page = params.page ?? 1;
    query.page_size = params.page_size ?? 25;
  }

  const branchIds = joinIds(params.branch_ids);
  if (branchIds) query.branch_ids = branchIds;

  const warehouseIds = joinIds(params.warehouse_ids);
  if (warehouseIds) query.warehouse_ids = warehouseIds;

  const customerIds = joinIds(params.customer_ids);
  if (customerIds) query.customer_ids = customerIds;

  const salespersonIds = joinIds(params.salesperson_ids);
  if (salespersonIds) query.salesperson_ids = salespersonIds;

  if (params.customer_type_id) query.customer_type_id = params.customer_type_id;
  if (params.invoice_number?.trim()) {
    query.invoice_number = params.invoice_number.trim();
  }
  if (params.state_code?.trim()) query.state_code = params.state_code.trim();

  const statuses = joinIds(params.statuses);
  if (statuses) query.statuses = statuses;

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
      (await messageFromBlob(blob)) || "Failed to export Sales Register.";
    throw new SalesRegisterApiError(message);
  }
  if (!blob || blob.size === 0) {
    throw new SalesRegisterApiError("Export returned an empty file.");
  }
}

export const SalesRegisterApiService = {
  async getFilters(signal?: AbortSignal): Promise<SalesRegisterFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.SALES_REGISTER.FILTERS,
        { signal },
      );
      return unwrapData<SalesRegisterFiltersConfig>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Sales Register filters.");
    }
  },

  async getReport(
    params: SalesRegisterQueryParams,
    signal?: AbortSignal,
  ): Promise<SalesRegisterReportResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.SALES_REGISTER.LIST,
        {
          params: buildSalesRegisterQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<SalesRegisterReportResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Sales Register.");
    }
  },

  async exportReport(payload: SalesRegisterExportPayload): Promise<void> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.SALES_REGISTER.EXPORT,
        {
          ...buildSalesRegisterQueryParams(payload, { includePage: false }),
          format: payload.format,
        },
        {
          headers: authHeaders(payload.financial_year_id),
          responseType: "blob",
          // Surface 401/403 as thrown errors so blob body can be parsed.
          validateStatus: (status) => status >= 200 && status < 300,
        },
      );

      const contentType = String(response.headers?.["content-type"] ?? "");
      const blob = response.data as Blob;
      await assertExportBlob(blob, contentType);

      const ext = payload.format === "PDF" ? "pdf" : "xlsx";
      const fallback = `Sales_Register_${payload.from_date}_${payload.to_date}.${ext}`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw await toApiError(error, "Failed to export Sales Register.");
    }
  },
};
