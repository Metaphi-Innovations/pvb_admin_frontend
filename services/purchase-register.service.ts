import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  PurchaseRegisterExportPayload,
  PurchaseRegisterFiltersConfig,
  PurchaseRegisterQueryParams,
  PurchaseRegisterReportResult,
} from "@/types/purchase-register.types";

export class PurchaseRegisterApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "PurchaseRegisterApiError";
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
): Promise<PurchaseRegisterApiError> {
  if (error instanceof PurchaseRegisterApiError) return error;
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
    if (fromBlob) {
      return new PurchaseRegisterApiError(fromBlob, status);
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
  return new PurchaseRegisterApiError(message, status);
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

/** Comma-join multi-select values for GET query and export JSON body. */
export function joinIds(ids: string[] | undefined): string | undefined {
  const unique = Array.from(
    new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)),
  );
  return unique.length > 0 ? unique.join(",") : undefined;
}

export function buildPurchaseRegisterQueryParams(
  params: PurchaseRegisterQueryParams,
  options?: { includePage?: boolean },
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
    sort_by: params.sort_by ?? "purchase_date",
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

  const supplierIds = joinIds(params.supplier_ids);
  if (supplierIds) query.supplier_ids = supplierIds;

  if (params.supplier_gstin?.trim()) {
    query.supplier_gstin = params.supplier_gstin.trim();
  }

  const invoiceTypes = joinIds(params.invoice_types);
  if (invoiceTypes) query.invoice_types = invoiceTypes;

  const statuses = joinIds(params.statuses);
  if (statuses) query.statuses = statuses;

  const gstr2b = joinIds(params.gstr2b_statuses);
  if (gstr2b) query.gstr2b_statuses = gstr2b;

  if (params.product_search?.trim()) {
    query.product_search = params.product_search.trim();
  }
  if (params.hsn_sac?.trim()) {
    query.hsn_sac = params.hsn_sac.trim();
  }
  if (params.search?.trim()) {
    query.search = params.search.trim();
  }

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
      (await messageFromBlob(blob)) || "Failed to export Purchase Register.";
    throw new PurchaseRegisterApiError(message);
  }
  if (!blob || blob.size === 0) {
    throw new PurchaseRegisterApiError("Export returned an empty file.");
  }
}

export const PurchaseRegisterApiService = {
  async getFilters(
    signal?: AbortSignal,
  ): Promise<PurchaseRegisterFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.PURCHASE_REGISTER.FILTERS,
        { signal },
      );
      return unwrapData<PurchaseRegisterFiltersConfig>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Purchase Register filters.");
    }
  },

  async getReport(
    params: PurchaseRegisterQueryParams,
    signal?: AbortSignal,
  ): Promise<PurchaseRegisterReportResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.PURCHASE_REGISTER.LIST,
        {
          params: buildPurchaseRegisterQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<PurchaseRegisterReportResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Purchase Register.");
    }
  },

  async exportReport(payload: PurchaseRegisterExportPayload): Promise<void> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.PURCHASE_REGISTER.EXPORT,
        {
          ...buildPurchaseRegisterQueryParams(payload, { includePage: false }),
          format: payload.format,
        },
        {
          headers: authHeaders(payload.financial_year_id),
          responseType: "blob",
          validateStatus: (status) => status >= 200 && status < 300,
        },
      );

      const contentType = String(response.headers?.["content-type"] ?? "");
      const blob = response.data as Blob;
      await assertExportBlob(blob, contentType);

      const ext = payload.format === "PDF" ? "pdf" : "xlsx";
      const fallback = `Purchase_Register_${payload.from_date}_${payload.to_date}.${ext}`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw await toApiError(error, "Failed to export Purchase Register.");
    }
  },
};
