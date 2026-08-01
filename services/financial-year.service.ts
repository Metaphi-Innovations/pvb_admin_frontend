import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";

export type ApiFinancialYear = {
  financialYearId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isClosed?: boolean;
  isActive?: boolean;
};

function unwrapData<T>(response: { data?: ApiResponse<T> | T }): T {
  const body = response.data as ApiResponse<T> | T | undefined;
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as ApiResponse<T>).data !== undefined
  ) {
    return (body as ApiResponse<T>).data as T;
  }
  return body as T;
}

export const FinancialYearApiService = {
  /** Active financial years for the Working FY selector. */
  async list(activeOnly = true): Promise<ApiFinancialYear[]> {
    const response = await axiosInstance.get<ApiResponse<ApiFinancialYear[]>>(
      API_ENDPOINTS.ACCOUNTS.FINANCIAL_YEARS.LIST,
      { params: activeOnly ? { activeOnly: true } : undefined },
    );
    return unwrapData(response) ?? [];
  },

  async getCurrent(): Promise<ApiFinancialYear | null> {
    try {
      const response = await axiosInstance.get<ApiResponse<ApiFinancialYear>>(
        API_ENDPOINTS.ACCOUNTS.FINANCIAL_YEARS.CURRENT,
      );
      return unwrapData(response) ?? null;
    } catch {
      return null;
    }
  },

  async getDropdown(): Promise<ApiFinancialYear[]> {
    const response = await axiosInstance.get<ApiResponse<ApiFinancialYear[]>>(
      API_ENDPOINTS.ACCOUNTS.FINANCIAL_YEARS.DROPDOWN,
    );
    return unwrapData(response) ?? [];
  },
};
