import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface OpeningBalanceSummaryDto {
  total_debit: string;
  total_credit: string;
  difference: string;
  is_balanced: boolean;
  row_count: number;
}

export interface OpeningBalanceFyRowDto {
  openingBalanceId: string;
  ledgerId: string;
  financialYearId: string;
  amount: string;
  balanceType: "DEBIT" | "CREDIT" | string;
  effectiveDate: string;
  narration?: string | null;
  ledger?: {
    ledgerId: string;
    ledgerCode: string;
    ledgerName: string;
    primaryHead?: { id: string; code: string; name: string } | null;
    group?: { id: string; code: string; name: string } | null;
    subGroup?: { id: string; code: string; name: string } | null;
  };
  fySummary?: OpeningBalanceSummaryDto;
}

export interface OpeningBalanceFyListResponse {
  financial_year: {
    financial_year_id: string;
    code: string;
    name: string;
    is_current: boolean;
    is_closed: boolean;
    is_active: boolean;
  };
  summary: OpeningBalanceSummaryDto;
  rows: OpeningBalanceFyRowDto[];
  lifecycle: {
    has_finalize_action: boolean;
    row_level_edits_allowed_while_unbalanced: boolean;
    note: string;
  };
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
        data?: {
          total_debit?: string;
          total_credit?: string;
          difference?: string;
          is_balanced?: boolean;
        };
      };
    };
    message?: string;
  };
  const base =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;
  const details = err?.response?.data?.data;
  if (
    details &&
    typeof details === "object" &&
    details.difference !== undefined
  ) {
    return `${base} (Debit ${details.total_debit ?? "—"}, Credit ${details.total_credit ?? "—"}, Difference ${details.difference})`;
  }
  return base;
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

export const OpeningBalanceApiService = {
  async listByFinancialYear(
    financialYearId: string,
    signal?: AbortSignal
  ): Promise<OpeningBalanceFyListResponse> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.OPENING_BALANCES_BY_FY,
        {
          params: { financial_year_id: financialYearId },
          headers: { "x-financial-year-id": financialYearId },
          signal,
        }
      );
      return unwrapData<OpeningBalanceFyListResponse>(response);
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to load opening balances.")
      );
    }
  },

  async validate(
    financialYearId: string,
    requireBalanced = false
  ): Promise<OpeningBalanceSummaryDto> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.OPENING_BALANCES_VALIDATE,
        {
          financial_year_id: financialYearId,
          require_balanced: requireBalanced,
        },
        { headers: { "x-financial-year-id": financialYearId } }
      );
      return unwrapData<OpeningBalanceSummaryDto>(response);
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to validate opening balances.")
      );
    }
  },

  async update(
    ledgerId: string,
    openingBalanceId: string,
    payload: {
      amount?: string;
      balanceType?: "DEBIT" | "CREDIT";
      effectiveDate?: string;
      narration?: string | null;
    },
    financialYearId?: string
  ): Promise<OpeningBalanceFyRowDto> {
    try {
      const headers: Record<string, string> = {};
      if (financialYearId) headers["x-financial-year-id"] = financialYearId;
      const response = await axiosInstance.patch(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.OPENING_BALANCE(ledgerId, openingBalanceId),
        payload,
        { headers }
      );
      return unwrapData<OpeningBalanceFyRowDto>(response);
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to update opening balance.")
      );
    }
  },

  async softDelete(
    ledgerId: string,
    openingBalanceId: string,
    financialYearId?: string
  ): Promise<{ openingBalanceId: string; deleted: boolean; fySummary: OpeningBalanceSummaryDto }> {
    try {
      const headers: Record<string, string> = {};
      if (financialYearId) headers["x-financial-year-id"] = financialYearId;
      const response = await axiosInstance.delete(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.OPENING_BALANCE(ledgerId, openingBalanceId),
        { headers }
      );
      return unwrapData(response);
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to delete opening balance.")
      );
    }
  },
};
