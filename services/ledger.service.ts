import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";

export interface LedgerOpeningBalanceDto {
  openingBalanceId: string;
  financialYearId: string;
  amount: string;
  balanceType: "DEBIT" | "CREDIT" | string;
  effectiveDate: string;
  narration?: string | null;
}

export interface LedgerPeriodBalanceDto {
  ledgerId: string;
  openingAmount: number;
  openingBalanceType: "Debit" | "Credit" | string;
  currentBalance: number;
  balanceType: "Debit" | "Credit" | string;
  totalDebit: number;
  totalCredit: number;
}

export interface LedgerTransactionDto {
  date: string;
  voucherNo: string;
  voucherType: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: "Debit" | "Credit";
  narration: string;
  voucherId: string;
}

export interface LedgerDetailWithTransactionsDto extends LedgerDetailDto {
  transactions?: LedgerTransactionDto[];
  totalDebit?: number;
  totalCredit?: number;
  currentBalance?: number;
  balanceType?: "Debit" | "Credit" | string;
}

export interface LedgerDetailDto {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  aliasName?: string | null;
  description?: string | null;
  accountSubGroupId: string;
  sourceType?: string | null;
  sourceEntityId?: string | null;
  sourceEntityCode?: string | null;
  status?: string;
  gstApplicable?: boolean;
  registrationType?: string | null;
  gstinNo?: string | null;
  registeredGstAddress?: string | null;
  tdsApplicable?: boolean;
  tdsSectionId?: string | null;
  tcsApplicable?: boolean;
  tcsSection?: string | null;
  costCenterApplicable?: boolean;
  billWiseOutstanding?: boolean;
  openingBalance?: LedgerOpeningBalanceDto | null;
  openingBalances?: LedgerOpeningBalanceDto[];
}

export interface CreateLedgerPayload {
  ledgerName: string;
  aliasName?: string | null;
  accountSubGroupId: string;
  description?: string | null;
  allowManualPosting?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  gstApplicable?: boolean;
  registrationType?: string | null;
  gstinNo?: string | null;
  registeredGstAddress?: string | null;
  tdsApplicable?: boolean;
  tdsSectionId?: string | null;
  tcsApplicable?: boolean;
  tcsSection?: string | null;
  costCenterApplicable?: boolean;
  billWiseOutstanding?: boolean;
  openingBalance?: {
    financialYearId: string;
    amount: string;
    balanceType: "DEBIT" | "CREDIT";
    effectiveDate: string;
    narration?: string | null;
  };
}

export interface UpdateLedgerPayload {
  ledgerName?: string;
  aliasName?: string | null;
  accountSubGroupId?: string;
  description?: string | null;
  allowManualPosting?: boolean;
  gstApplicable?: boolean;
  registrationType?: string | null;
  gstinNo?: string | null;
  registeredGstAddress?: string | null;
  tdsApplicable?: boolean;
  tdsSectionId?: string | null;
  tcsApplicable?: boolean;
  tcsSection?: string | null;
  costCenterApplicable?: boolean;
  billWiseOutstanding?: boolean;
}

export interface LedgerSyncResult {
  created: boolean;
  updated: boolean;
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
}

export interface FinancialYearDto {
  financialYearId: string;
  name?: string;
  code?: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
}

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

export const LedgerService = {
  async previewNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get<ApiResponse<{ previewNumber: string }>>(
      API_ENDPOINTS.ACCOUNTS.LEDGERS.PREVIEW_NUMBER,
      { signal },
    );
    const data = unwrapData(response);
    return data?.previewNumber ?? "";
  },

  async view(
    ledgerId: string,
    params?: { dateFrom?: string; dateTo?: string },
    signal?: AbortSignal,
  ): Promise<LedgerDetailWithTransactionsDto> {
    const response = await axiosInstance.get<ApiResponse<LedgerDetailWithTransactionsDto>>(
      API_ENDPOINTS.ACCOUNTS.LEDGERS.VIEW(ledgerId),
      { params, signal },
    );
    return unwrapData(response);
  },

  async getBalances(
    payload: { ledgerIds: string[]; dateFrom?: string; dateTo?: string },
    signal?: AbortSignal,
  ): Promise<LedgerPeriodBalanceDto[]> {
    const ids = [...new Set(payload.ledgerIds.filter(Boolean))];
    if (ids.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 500) {
      chunks.push(ids.slice(i, i + 500));
    }

    const results = await Promise.all(
      chunks.map(async (ledgerIds) => {
        const response = await axiosInstance.post<ApiResponse<LedgerPeriodBalanceDto[]>>(
          API_ENDPOINTS.ACCOUNTS.LEDGERS.BALANCES,
          {
            ledgerIds,
            ...(payload.dateFrom ? { dateFrom: payload.dateFrom } : {}),
            ...(payload.dateTo ? { dateTo: payload.dateTo } : {}),
          },
          { signal },
        );
        return unwrapData(response) ?? [];
      }),
    );

    return results.flat();
  },

  async create(payload: CreateLedgerPayload): Promise<LedgerDetailDto> {
    try {
      const response = await axiosInstance.post<ApiResponse<LedgerDetailDto>>(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.CREATE,
        payload,
      );
      return unwrapData(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to create ledger."));
    }
  },

  async update(ledgerId: string, payload: UpdateLedgerPayload): Promise<LedgerDetailDto> {
    try {
      const response = await axiosInstance.patch<ApiResponse<LedgerDetailDto>>(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.UPDATE(ledgerId),
        payload,
      );
      return unwrapData(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to update ledger."));
    }
  },

  async createOpeningBalance(
    ledgerId: string,
    payload: {
      financialYearId: string;
      amount: string;
      balanceType: "DEBIT" | "CREDIT";
      effectiveDate: string;
      narration?: string | null;
    },
  ): Promise<LedgerOpeningBalanceDto> {
    try {
      const response = await axiosInstance.post<ApiResponse<LedgerOpeningBalanceDto>>(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.OPENING_BALANCES(ledgerId),
        payload,
      );
      return unwrapData(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to save opening balance."));
    }
  },

  async updateOpeningBalance(
    ledgerId: string,
    openingBalanceId: string,
    payload: {
      amount?: string;
      balanceType?: "DEBIT" | "CREDIT";
      effectiveDate?: string;
      narration?: string | null;
    },
  ): Promise<LedgerOpeningBalanceDto> {
    try {
      const response = await axiosInstance.patch<ApiResponse<LedgerOpeningBalanceDto>>(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.OPENING_BALANCE(ledgerId, openingBalanceId),
        payload,
      );
      return unwrapData(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to update opening balance."));
    }
  },

  async syncCustomerLedger(customerId: string): Promise<LedgerSyncResult> {
    const response = await axiosInstance.post<ApiResponse<LedgerSyncResult>>(
      API_ENDPOINTS.ACCOUNTS.INTEGRATIONS.SYNC_CUSTOMER_LEDGER(customerId),
    );
    return unwrapData(response);
  },

  async syncSupplierLedger(supplierId: string): Promise<LedgerSyncResult> {
    const response = await axiosInstance.post<ApiResponse<LedgerSyncResult>>(
      API_ENDPOINTS.ACCOUNTS.INTEGRATIONS.SYNC_SUPPLIER_LEDGER(supplierId),
    );
    return unwrapData(response);
  },

  async getCurrentFinancialYear(): Promise<FinancialYearDto | null> {
    try {
      const response = await axiosInstance.get<ApiResponse<FinancialYearDto>>(
        API_ENDPOINTS.ACCOUNTS.FINANCIAL_YEARS.CURRENT,
      );
      return unwrapData(response) ?? null;
    } catch {
      return null;
    }
  },

  async delete(ledgerId: string): Promise<LedgerDetailDto> {
    try {
      const response = await axiosInstance.delete<ApiResponse<LedgerDetailDto>>(
        `${API_ENDPOINTS.ACCOUNTS.LEDGERS.LIST}/${ledgerId}`,
      );
      return unwrapData(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to delete ledger."));
    }
  },
};
