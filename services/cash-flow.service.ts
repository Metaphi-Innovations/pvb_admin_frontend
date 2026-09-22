import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { buildCashFlowExportBody } from "@/lib/accounts/cash-flow-query";
import type {
  CashFlowExportPayload,
  CashFlowFiltersConfig,
  CashFlowQueryParams,
  CashFlowReportResult,
} from "@/types/cash-flow.types";

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
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

function buildQueryParams(params: CashFlowQueryParams): Record<string, string> {
  const query: Record<string, string> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
  };
  if (params.warehouse_id) query.warehouse_id = params.warehouse_id;
  if (params.activity_type && params.activity_type !== "ALL") {
    query.activity_type = params.activity_type;
  }
  if (params.cash_bank_ledger_id) {
    query.cash_bank_ledger_id = params.cash_bank_ledger_id;
  }
  return query;
}

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
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

export const CashFlowApiService = {
  async getFilters(signal?: AbortSignal): Promise<CashFlowFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.CASH_FLOW.FILTERS,
        { signal },
      );
      return unwrapData<CashFlowFiltersConfig>(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load Cash Flow filters."));
    }
  },

  async getReport(
    params: CashFlowQueryParams,
    signal?: AbortSignal,
  ): Promise<CashFlowReportResult> {
    try {
      const headers: Record<string, string> = {};
      if (params.financial_year_id.trim()) {
        headers["x-financial-year-id"] = params.financial_year_id.trim();
      }
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.CASH_FLOW.LIST,
        { params: buildQueryParams(params), headers, signal },
      );
      return unwrapData<CashFlowReportResult>(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load Cash Flow Statement."));
    }
  },

  async exportReport(payload: CashFlowExportPayload): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (payload.financial_year_id.trim()) {
        headers["x-financial-year-id"] = payload.financial_year_id.trim();
      }
      const body = buildCashFlowExportBody(payload);
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.CASH_FLOW.EXPORT,
        body,
        { headers, responseType: "blob" },
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
          throw new Error(parsed.message || parsed.error || "Failed to export Cash Flow.");
        } catch (inner) {
          if (inner instanceof Error && !inner.message.startsWith("Unexpected")) throw inner;
          throw new Error("Failed to export Cash Flow.");
        }
      }

      const ext = payload.format === "PDF" ? "pdf" : "xlsx";
      const fallback = `cash_flow_${payload.from_date}_to_${payload.to_date}.${ext}`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to export Cash Flow."));
    }
  },
};
