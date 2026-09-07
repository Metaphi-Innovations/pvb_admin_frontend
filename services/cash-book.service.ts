import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  ApiCashBookLedgerOption,
  ApiCashBookListResponse,
  ApiCashBookVoucherType,
  CashBookQueryParams,
} from "@/types/cash-book.types";

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

export const CashBookApiService = {
  async getCashBook(
    params: CashBookQueryParams,
    financialYearId?: string | null,
    signal?: AbortSignal
  ): Promise<ApiCashBookListResponse> {
    try {
      const headers: Record<string, string> = {};
      if (financialYearId?.trim()) {
        headers["x-financial-year-id"] = financialYearId.trim();
      }

      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.CASH_BOOK.LIST,
        {
          params,
          headers,
          signal,
        }
      );

      return unwrapData<ApiCashBookListResponse>(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load Cash Book transactions."));
    }
  },

  async getCashLedgers(signal?: AbortSignal): Promise<ApiCashBookLedgerOption[]> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.CASH_BOOK.LEDGERS,
        { signal }
      );
      return unwrapData<ApiCashBookLedgerOption[]>(response) || [];
    } catch (error) {
      console.warn("Failed to fetch cash ledgers:", error);
      return [];
    }
  },

  async getVoucherTypes(signal?: AbortSignal): Promise<ApiCashBookVoucherType[]> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.CASH_BOOK.VOUCHER_TYPES,
        { signal }
      );
      return unwrapData<ApiCashBookVoucherType[]>(response) || [];
    } catch (error) {
      console.warn("Failed to fetch cash book voucher types:", error);
      return [];
    }
  },

  async exportExcel(
    params: Omit<CashBookQueryParams, "page" | "limit">,
    financialYearId?: string | null
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (financialYearId?.trim()) {
        headers["x-financial-year-id"] = financialYearId.trim();
      }

      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.CASH_BOOK.EXPORT_EXCEL,
        {
          params,
          headers,
          responseType: "blob",
        }
      );

      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cash_book_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to export Cash Book to Excel."));
    }
  },

  async exportPdf(
    params: Omit<CashBookQueryParams, "page" | "limit">,
    financialYearId?: string | null
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (financialYearId?.trim()) {
        headers["x-financial-year-id"] = financialYearId.trim();
      }

      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.CASH_BOOK.EXPORT_PDF,
        {
          params,
          headers,
          responseType: "blob",
        }
      );

      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cash_book_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to export Cash Book to PDF."));
    }
  },
};
