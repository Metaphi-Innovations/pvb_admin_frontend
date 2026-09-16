import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  TrialBalanceExportPayload,
  TrialBalanceFiltersConfig,
  TrialBalanceQueryParams,
  TrialBalanceReportResult,
} from "@/types/trial-balance.types";

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

function buildQueryParams(params: TrialBalanceQueryParams): Record<string, string | boolean> {
  const query: Record<string, string | boolean> = {
    report_type: params.report_type,
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
    balance_type: params.balance_type ?? "ALL",
    include_zero_balance: params.include_zero_balance ?? false,
  };
  if (params.warehouse_id) query.warehouse_id = params.warehouse_id;
  if (params.primary_head_id) query.primary_head_id = params.primary_head_id;
  if (params.group_id) query.group_id = params.group_id;
  if (params.sub_group_id) query.sub_group_id = params.sub_group_id;
  if (params.ledger_id) query.ledger_id = params.ledger_id;
  return query;
}

function filenameFromDisposition(
  disposition: string | undefined,
  fallback: string
): string {
  if (!disposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(disposition);
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

export const TrialBalanceApiService = {
  async getFilters(signal?: AbortSignal): Promise<TrialBalanceFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.TRIAL_BALANCE.FILTERS,
        { signal }
      );
      return unwrapData<TrialBalanceFiltersConfig>(response);
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to load Trial Balance filters.")
      );
    }
  },

  async getReport(
    params: TrialBalanceQueryParams,
    signal?: AbortSignal
  ): Promise<TrialBalanceReportResult> {
    try {
      const headers: Record<string, string> = {};
      if (params.financial_year_id.trim()) {
        headers["x-financial-year-id"] = params.financial_year_id.trim();
      }

      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.TRIAL_BALANCE.LIST,
        {
          params: buildQueryParams(params),
          headers,
          signal,
        }
      );
      return unwrapData<TrialBalanceReportResult>(response);
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to load Trial Balance.")
      );
    }
  },

  async exportReport(payload: TrialBalanceExportPayload): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (payload.financial_year_id.trim()) {
        headers["x-financial-year-id"] = payload.financial_year_id.trim();
      }

      const body: Record<string, unknown> = {
        report_type: payload.report_type,
        format: payload.format,
        financial_year_id: payload.financial_year_id,
        from_date: payload.from_date,
        to_date: payload.to_date,
        balance_type: payload.balance_type ?? "ALL",
        include_zero_balance: payload.include_zero_balance ?? false,
      };
      if (payload.warehouse_id) body.warehouse_id = payload.warehouse_id;
      if (payload.primary_head_id) body.primary_head_id = payload.primary_head_id;
      if (payload.group_id) body.group_id = payload.group_id;
      if (payload.sub_group_id) body.sub_group_id = payload.sub_group_id;
      if (payload.ledger_id) body.ledger_id = payload.ledger_id;

      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.REPORTS.TRIAL_BALANCE.EXPORT,
        body,
        {
          headers,
          responseType: "blob",
        }
      );

      const contentType = String(response.headers?.["content-type"] ?? "");
      const blob = response.data as Blob;

      // Some gateways return JSON errors with 200 + blob; surface them clearly.
      if (
        contentType.includes("application/json") ||
        (blob.type && blob.type.includes("application/json"))
      ) {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text) as { message?: string; error?: string };
          throw new Error(
            parsed.message || parsed.error || "Failed to export Trial Balance."
          );
        } catch (inner) {
          if (inner instanceof Error && !inner.message.startsWith("Unexpected")) {
            throw inner;
          }
          throw new Error("Failed to export Trial Balance.");
        }
      }

      const ext = payload.format === "PDF" ? "pdf" : "xlsx";
      const fallback = `Trial_Balance_${payload.from_date}_${payload.to_date}.${ext}`;
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        fallback
      );
      downloadBlob(blob, filename);
    } catch (error) {
      // Blob error responses may contain JSON — try to surface message
      const err = error as {
        response?: { data?: Blob | { message?: string }; status?: number };
        message?: string;
      };
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text) as { message?: string; error?: string };
          throw new Error(
            parsed.message || parsed.error || "Failed to export Trial Balance."
          );
        } catch (inner) {
          if (inner instanceof Error && inner.message !== "Failed to export Trial Balance.") {
            throw inner;
          }
        }
      }
      if (error instanceof Error) throw error;
      throw new Error(
        extractErrorMessage(error, "Failed to export Trial Balance.")
      );
    }
  },
};
