import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  DayBookExportPayload,
  DayBookFiltersConfig,
  DayBookQueryParams,
  DayBookReportResponse,
} from "@/types/day-book.types";

export class DayBookApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "DayBookApiError";
    this.status = status;
  }
}

function toApiError(error: unknown, fallback: string): DayBookApiError {
  if (error instanceof DayBookApiError) return error;
  const err = error as {
    status?: number;
    message?: string;
    error?: string;
    response?: { status?: number; data?: { message?: string; error?: string } };
  };
  const status = err.status ?? err.response?.status;
  const message =
    err.message ||
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.error ||
    fallback;
  return new DayBookApiError(message, status);
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

function joinIds(ids: string[] | undefined): string | undefined {
  const unique = Array.from(new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)));
  return unique.length > 0 ? unique.join(",") : undefined;
}

function buildQueryParams(
  params: DayBookQueryParams,
  options?: { includePage?: boolean },
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
    balance_side: params.balance_side ?? "ALL",
  };
  if (options?.includePage !== false) {
    query.page = params.page ?? 1;
    query.page_size = params.page_size ?? 25;
  }
  if (params.ledger_id) query.ledger_id = params.ledger_id;
  if (params.voucher_number) query.voucher_number = params.voucher_number;
  if (params.reference) query.reference = params.reference;
  const branch = joinIds(params.branch_ids) ?? joinIds(params.warehouse_ids);
  if (branch) query.branch_id = branch;
  const voucherTypes = joinIds(params.voucher_types);
  if (voucherTypes) query.voucher_type = voucherTypes;
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

export const DayBookApiService = {
  async getFilters(signal?: AbortSignal): Promise<DayBookFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.DAY_BOOK.FILTERS,
        { signal },
      );
      return unwrapData<DayBookFiltersConfig>(response);
    } catch (error) {
      throw toApiError(error, "Failed to load Day Book filters.");
    }
  },

  async getReport(
    params: DayBookQueryParams,
    signal?: AbortSignal,
  ): Promise<DayBookReportResponse> {
    try {
      const headers: Record<string, string> = {};
      if (params.financial_year_id.trim()) {
        headers["x-financial-year-id"] = params.financial_year_id.trim();
      }
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.DAY_BOOK.LIST,
        {
          params: buildQueryParams(params),
          headers,
          signal,
        },
      );
      return unwrapData<DayBookReportResponse>(response);
    } catch (error) {
      throw toApiError(error, "Failed to load Day Book.");
    }
  },

  async exportReport(payload: DayBookExportPayload): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (payload.financial_year_id.trim()) {
        headers["x-financial-year-id"] = payload.financial_year_id.trim();
      }
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.DAY_BOOK.EXPORT,
        {
          ...buildQueryParams(payload, { includePage: false }),
          format: payload.format,
        },
        {
          headers,
          responseType: "blob",
        },
      );

      const contentType = String(response.headers?.["content-type"] ?? "");
      const blob = response.data as Blob;
      if (
        contentType.includes("application/json") ||
        (blob.type && blob.type.includes("application/json"))
      ) {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text) as { message?: string; error?: string };
          throw new DayBookApiError(
            parsed.message || parsed.error || "Failed to export Day Book.",
          );
        } catch (inner) {
          if (inner instanceof DayBookApiError) throw inner;
          throw new DayBookApiError("Failed to export Day Book.");
        }
      }

      const ext = payload.format === "PDF" ? "pdf" : "xlsx";
      const fallback = `day_book_${payload.from_date}_${payload.to_date}.${ext}`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw toApiError(error, "Failed to export Day Book.");
    }
  },
};
