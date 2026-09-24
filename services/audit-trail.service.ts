import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  AuditTrailExportPayload,
  AuditTrailFiltersConfig,
  AuditTrailQueryParams,
  AuditTrailReportResult,
} from "@/types/audit-trail.types";

export class AuditTrailApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuditTrailApiError";
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
): Promise<AuditTrailApiError> {
  if (error instanceof AuditTrailApiError) return error;
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
      return new AuditTrailApiError(fromBlob, status);
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
  return new AuditTrailApiError(message, status);
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
  const unique = Array.from(
    new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)),
  );
  return unique.length > 0 ? unique.join(",") : undefined;
}

export function buildAuditTrailQueryParams(
  params: AuditTrailQueryParams,
  options?: { includePage?: boolean },
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
    sort_field: params.sort_field ?? "performed_at",
    sort_direction: params.sort_direction ?? "desc",
  };

  if (options?.includePage !== false) {
    query.page = params.page ?? 1;
    query.page_size = params.page_size ?? 50;
  }

  const entityTypes = joinIds(params.entity_types);
  if (entityTypes) query.entity_types = entityTypes;

  const actions = joinIds(params.actions);
  if (actions) query.actions = actions;

  const userIds = joinIds(params.user_ids);
  if (userIds) query.user_ids = userIds;

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
      (await messageFromBlob(blob)) || "Failed to export Audit Trail.";
    throw new AuditTrailApiError(message);
  }
  if (!blob || blob.size === 0) {
    throw new AuditTrailApiError("Export returned an empty file.");
  }
}

export const AuditTrailApiService = {
  async getFilters(signal?: AbortSignal): Promise<AuditTrailFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.AUDIT_TRAIL.FILTERS,
        { signal },
      );
      return unwrapData<AuditTrailFiltersConfig>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Audit Trail filters.");
    }
  },

  async getReport(
    params: AuditTrailQueryParams,
    signal?: AbortSignal,
  ): Promise<AuditTrailReportResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.AUDIT_TRAIL.LIST,
        {
          params: buildAuditTrailQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<AuditTrailReportResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load Audit Trail.");
    }
  },

  async exportReport(payload: AuditTrailExportPayload): Promise<void> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.AUDIT_TRAIL.EXPORT,
        {
          ...buildAuditTrailQueryParams(payload, { includePage: false }),
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
      const fallback = `audit_trail_${payload.from_date}_${payload.to_date}.${ext}`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw await toApiError(error, "Failed to export Audit Trail.");
    }
  },
};
