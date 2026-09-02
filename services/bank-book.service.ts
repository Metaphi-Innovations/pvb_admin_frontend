import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  ApiBankBookListResponse,
  ApiBankBookVoucherType,
  BankBookQueryParams,
} from "@/types/bank-book.types";

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

export const BankBookApiService = {
  async getBankBook(
    params: BankBookQueryParams,
    financialYearId?: string | null,
    signal?: AbortSignal
  ): Promise<ApiBankBookListResponse> {
    try {
      const headers: Record<string, string> = {};
      if (financialYearId?.trim()) {
        headers["x-financial-year-id"] = financialYearId.trim();
      }

      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.BANK_BOOK.LIST,
        {
          params,
          headers,
          signal,
        }
      );

      return unwrapData<ApiBankBookListResponse>(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load Bank Book transactions."));
    }
  },

  async getVoucherTypes(signal?: AbortSignal): Promise<ApiBankBookVoucherType[]> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.BANK_BOOK.VOUCHER_TYPES,
        { signal }
      );
      return unwrapData<ApiBankBookVoucherType[]>(response) || [];
    } catch (error) {
      console.warn("Failed to fetch bank book voucher types:", error);
      return [];
    }
  },

  async exportExcel(
    params: Omit<BankBookQueryParams, "page" | "limit">,
    financialYearId?: string | null
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (financialYearId?.trim()) {
        headers["x-financial-year-id"] = financialYearId.trim();
      }

      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.BANK_BOOK.EXPORT_EXCEL,
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
      link.download = `bank_book_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to export Bank Book to Excel."));
    }
  },

  async exportPdf(
    params: Omit<BankBookQueryParams, "page" | "limit">,
    financialYearId?: string | null
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (financialYearId?.trim()) {
        headers["x-financial-year-id"] = financialYearId.trim();
      }

      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BANKING.BANK_BOOK.EXPORT_PDF,
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
      link.download = `bank_book_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to export Bank Book to PDF."));
    }
  },
};
