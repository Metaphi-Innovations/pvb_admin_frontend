import axios from "axios";
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

export type LedgerDropdownNodeType =
  | "PRIMARY_HEAD"
  | "ACCOUNT_GROUP"
  | "ACCOUNT_SUB_GROUP"
  | "LEDGER";

export interface LedgerDropdownNode {
  id: string;
  code: string;
  name: string;
  type: LedgerDropdownNodeType;
  parentPath: string;
  selectable: boolean;
  aliasName?: string | null;
  allowManualPosting?: boolean;
  isSystemGenerated?: boolean;
  status?: string;
  sourceType?: string;
  children: LedgerDropdownNode[];
}

export interface LedgerDropdownItem {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  aliasName?: string | null;
  parentPath: string;
  allowManualPosting: boolean;
  isSystemGenerated: boolean;
  status: string;
  sourceType: string;
  primaryHead: { id: string; code: string; name: string };
  accountGroup: { id: string; code: string; name: string };
  accountSubGroup: { id: string; code: string; name: string };
}

export interface LedgerDropdownResponse {
  tree: LedgerDropdownNode[];
  ledgers: LedgerDropdownItem[];
}

export interface LedgerDropdownQuery {
  search?: string;
  status?: string;
  sourceType?: string;
  primaryHeadId?: string;
  accountGroupId?: string;
  accountSubGroupId?: string;
  allowManualPosting?: boolean;
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

export interface InventoryProductWiseRow {
  productId: string;
  productCode: string | null;
  productName: string;
  uom: string | null;
  netQuantityConsumed: number;
  netInventoryValue: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  averageUnitCost: number;
}

export interface CogsProductWiseRow {
  productId: string;
  productCode: string | null;
  productName: string;
  uom: string | null;
  netQuantitySold: number;
  netCogsValue: number;
  totalDebitAmount: number;
  totalCreditAmount: number;
  averageUnitCost: number;
}

export interface InventoryProductWiseLedger {
  ledger_id: string;
  ledger_name: string;
  ledger_code: string;
}

export interface InventoryProductWiseResponse {
  ledger: InventoryProductWiseLedger | null;
  data: InventoryProductWiseRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalProducts: number; totalInventoryValue: number };
}

export interface CogsProductWiseResponse {
  ledger: InventoryProductWiseLedger | null;
  data: CogsProductWiseRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalProducts: number; totalCogsValue: number };
}

export interface SalesProductWiseRow {
  productId: string;
  productCode: string | null;
  productName: string;
  uom: string | null;
  netSalesQty: number;
  netSalesValue: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  averageUnitCost: number;
}

export interface SalesProductWiseResponse {
  ledger: InventoryProductWiseLedger | null;
  data: SalesProductWiseRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalProducts: number; totalSalesValue: number };
}

export interface ProductTransactionRow {
  lineId: string;
  date: string;
  voucherNo: string;
  voucherType: string;
  narration: string | null;
  sourceModule: string | null;
  referenceNo: string | null;
  quantity: number | null;
  unitRate: number | null;
  debit: number;
  credit: number;
}

export interface ProductTransactionsResponse {
  ledger: InventoryProductWiseLedger | null;
  data: ProductTransactionRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const LedgerService = {
  async getDropdown(
    query: LedgerDropdownQuery = {},
    signal?: AbortSignal,
  ): Promise<LedgerDropdownResponse> {
    try {
      const response = await axiosInstance.get<ApiResponse<LedgerDropdownResponse>>(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.DROPDOWN,
        { params: query, signal },
      );
      const data = unwrapData(response);
      return {
        tree: data?.tree ?? [],
        ledgers: data?.ledgers ?? [],
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load ledger dropdown."));
    }
  },

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

  async getStockInHandProductWise(params?: {
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    search?: string;
    minValue?: number;
    maxValue?: number;
    minQty?: number;
    maxQty?: number;
  }, signal?: AbortSignal): Promise<InventoryProductWiseResponse> {
    try {
      const response = await axiosInstance.get<ApiResponse<InventoryProductWiseResponse>>(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.STOCK_IN_HAND,
        { params, signal },
      );
      return unwrapData(response) ?? { ledger: null, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }, summary: { totalProducts: 0, totalInventoryValue: 0 } };
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(extractErrorMessage(error, "Failed to load Stock in Hand product-wise listing."));
    }
  },

  async getCogsProductWise(params?: {
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    search?: string;
    minValue?: number;
    maxValue?: number;
    minQty?: number;
    maxQty?: number;
  }, signal?: AbortSignal): Promise<CogsProductWiseResponse> {
    try {
      const response = await axiosInstance.get<ApiResponse<CogsProductWiseResponse>>(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.COGS,
        { params, signal },
      );
      return unwrapData(response) ?? { ledger: null, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }, summary: { totalProducts: 0, totalCogsValue: 0 } };
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(extractErrorMessage(error, "Failed to load COGS product-wise listing."));
    }
  },

  async getSalesProductWise(params?: {
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    search?: string;
    minValue?: number;
    maxValue?: number;
    minQty?: number;
    maxQty?: number;
  }, signal?: AbortSignal): Promise<SalesProductWiseResponse> {
    try {
      const response = await axiosInstance.get<ApiResponse<SalesProductWiseResponse>>(
        API_ENDPOINTS.ACCOUNTS.LEDGERS.SALES_PRODUCT_WISE,
        { params, signal },
      );
      return unwrapData(response) ?? { ledger: null, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }, summary: { totalProducts: 0, totalSalesValue: 0 } };
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(extractErrorMessage(error, "Failed to load Sales product-wise listing."));
    }
  },

  async getProductTransactions(
    ledgerType: "stock-in-hand" | "cogs" | "sales",
    params: { productId: string; dateFrom?: string; dateTo?: string; warehouseId?: string; page?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<ProductTransactionsResponse> {
    const endpointMap = {
      "stock-in-hand": API_ENDPOINTS.ACCOUNTS.LEDGERS.STOCK_IN_HAND_PRODUCT_TRANSACTIONS,
      "cogs": API_ENDPOINTS.ACCOUNTS.LEDGERS.COGS_PRODUCT_TRANSACTIONS,
      "sales": API_ENDPOINTS.ACCOUNTS.LEDGERS.SALES_PRODUCT_TRANSACTIONS,
    };
    try {
      const response = await axiosInstance.get<ApiResponse<ProductTransactionsResponse>>(
        endpointMap[ledgerType],
        { params, signal },
      );
      return unwrapData(response) ?? { ledger: null, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(extractErrorMessage(error, "Failed to load product transactions."));
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
