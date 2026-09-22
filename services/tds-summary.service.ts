import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  TdsSummaryExportPayload,
  TdsSummaryFiltersConfig,
  TdsSummaryQueryParams,
  TdsSummaryReportResult,
} from "@/types/tds-summary.types";

export class TdsSummaryApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TdsSummaryApiError";
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
): Promise<TdsSummaryApiError> {
  if (error instanceof TdsSummaryApiError) return error;
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
    if (fromBlob) return new TdsSummaryApiError(fromBlob, status);
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
  return new TdsSummaryApiError(message, status);
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

export function buildTdsSummaryQueryParams(
  params: TdsSummaryQueryParams,
  options?: { includePage?: boolean },
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
    tds_nature: params.tds_nature ?? "ALL",
    application_mode: params.application_mode ?? "ALL",
    sort_by: params.sort_by ?? "voucher_date",
    sort_order: params.sort_order ?? "desc",
  };

  if (options?.includePage !== false) {
    query.page = params.page ?? 1;
    query.page_size = params.page_size ?? 25;
  }

  if (params.month && params.month !== "all") {
    query.month = params.month;
  }

  const branchIds = joinIds(params.branch_ids);
  if (branchIds) query.branch_ids = branchIds;

  const warehouseIds = joinIds(params.warehouse_ids);
  if (warehouseIds) query.warehouse_ids = warehouseIds;

  const sectionIds = joinIds(params.tds_section_ids);
  if (sectionIds) query.tds_section_ids = sectionIds;

  const partyIds = joinIds(params.party_ids);
  if (partyIds) query.party_ids = partyIds;

  const partyLedgerIds = joinIds(params.party_ledger_ids);
  if (partyLedgerIds) query.party_ledger_ids = partyLedgerIds;

  if (params.search?.trim()) query.search = params.search.trim();

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
      (await messageFromBlob(blob)) || "Failed to export TDS Summary.";
    throw new TdsSummaryApiError(message);
  }
  if (!blob || blob.size === 0) {
    throw new TdsSummaryApiError("Export returned an empty file.");
  }
}

export const TdsSummaryApiService = {
  async getFilters(signal?: AbortSignal): Promise<TdsSummaryFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.TDS_SUMMARY.FILTERS,
        { signal },
      );
      return unwrapData<TdsSummaryFiltersConfig>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load TDS Summary filters.");
    }
  },

  async getReport(
    params: TdsSummaryQueryParams,
    signal?: AbortSignal,
  ): Promise<TdsSummaryReportResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.TDS_SUMMARY.LIST,
        {
          params: buildTdsSummaryQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<TdsSummaryReportResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load TDS Summary.");
    }
  },

  async exportReport(payload: TdsSummaryExportPayload): Promise<void> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.TDS_SUMMARY.EXPORT,
        {
          ...buildTdsSummaryQueryParams(payload, { includePage: false }),
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
      const fallback = `TDS_Summary_${payload.from_date}_${payload.to_date}.${ext}`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw await toApiError(error, "Failed to export TDS Summary.");
    }
  },
};
