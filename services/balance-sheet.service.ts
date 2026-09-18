import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { buildBalanceSheetExportBody } from "@/lib/accounts/balance-sheet-query";
import type {
  BalanceSheetExportPayload,
  BalanceSheetFiltersConfig,
  BalanceSheetQueryParams,
  BalanceSheetReportResult,
} from "@/types/balance-sheet.types";

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

function buildQueryParams(params: BalanceSheetQueryParams): Record<string, string | boolean> {
  const query: Record<string, string | boolean> = {
    report_type: params.report_type,
    financial_year_id: params.financial_year_id,
    as_on_date: params.as_on_date,
    show_zero: params.show_zero,
  };
  if (params.warehouse_id) query.warehouse_id = params.warehouse_id;
  if (params.group_id) query.group_id = params.group_id;
  if (params.sub_group_id) query.sub_group_id = params.sub_group_id;
  if (params.ledger_id) query.ledger_id = params.ledger_id;
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

export const BalanceSheetApiService = {
  async getFilters(signal?: AbortSignal): Promise<BalanceSheetFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.BALANCE_SHEET.FILTERS,
        { signal },
      );
      return unwrapData<BalanceSheetFiltersConfig>(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load Balance Sheet filters."));
    }
  },

  async getReport(
    params: BalanceSheetQueryParams,
    signal?: AbortSignal,
  ): Promise<BalanceSheetReportResult> {
    try {
      const headers: Record<string, string> = {};
      if (params.financial_year_id.trim()) {
        headers["x-financial-year-id"] = params.financial_year_id.trim();
      }
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.BALANCE_SHEET.LIST,
        { params: buildQueryParams(params), headers, signal },
      );
      return unwrapData<BalanceSheetReportResult>(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load Balance Sheet."));
    }
  },

  async exportReport(payload: BalanceSheetExportPayload): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (payload.financial_year_id.trim()) {
        headers["x-financial-year-id"] = payload.financial_year_id.trim();
      }
      const body = buildBalanceSheetExportBody(payload);
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.BALANCE_SHEET.EXPORT,
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
          throw new Error(parsed.message || parsed.error || "Failed to export Balance Sheet.");
        } catch (inner) {
          if (inner instanceof Error && !inner.message.startsWith("Unexpected")) throw inner;
          throw new Error("Failed to export Balance Sheet.");
        }
      }

      const ext = payload.format === "PDF" ? "pdf" : "xlsx";
      const fallback = `balance_sheet_${payload.as_on_date}.${ext}`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        fallback,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to export Balance Sheet."));
    }
  },
};
