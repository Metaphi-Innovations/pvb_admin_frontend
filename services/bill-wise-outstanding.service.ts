import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  BillWiseOutstandingDetailApi,
  BillWiseOutstandingListQuery,
  BillWiseOutstandingListResultApi,
} from "@/types/bill-wise-outstanding.types";

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

function buildQueryParams(
  params: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

async function withBwoError<T>(
  action: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(extractErrorMessage(error, fallback));
  }
}

/**
 * Bill-wise Outstanding (receivables / customer open items).
 * Backend recalculates outstanding as of date from AccountingSettlement.
 * Does not support payable/vendor open items — use PayablesService for those.
 */
export const BillWiseOutstandingService = {
  extractErrorMessage,

  async list(
    query: BillWiseOutstandingListQuery = {},
  ): Promise<BillWiseOutstandingListResultApi> {
    return withBwoError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BILL_WISE_OUTSTANDING.LIST,
        {
          params: buildQueryParams({
            financialYearId: query.financialYearId,
            startDate: query.startDate,
            endDate: query.endDate,
            asOfDate: query.asOfDate,
            branchId: query.branchId,
            partyLedgerId: query.partyLedgerId,
            status: query.status,
            search: query.search,
            openOutstandingOnly: query.openOutstandingOnly,
            page: query.page,
            limit: query.limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          }),
        },
      );
      return unwrapData<BillWiseOutstandingListResultApi>(response);
    }, "Failed to load bill-wise outstanding.");
  },

  async listByParty(
    partyLedgerId: string,
    query: BillWiseOutstandingListQuery = {},
  ): Promise<BillWiseOutstandingListResultApi> {
    return withBwoError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BILL_WISE_OUTSTANDING.BY_PARTY(partyLedgerId),
        {
          params: buildQueryParams({
            financialYearId: query.financialYearId,
            startDate: query.startDate,
            endDate: query.endDate,
            asOfDate: query.asOfDate,
            branchId: query.branchId,
            status: query.status,
            search: query.search,
            openOutstandingOnly: query.openOutstandingOnly,
            page: query.page,
            limit: query.limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          }),
        },
      );
      return unwrapData<BillWiseOutstandingListResultApi>(response);
    }, "Failed to load party bill-wise outstanding.");
  },

  async getDetail(
    openItemId: string,
    query?: { asOfDate?: string; financialYearId?: string },
  ): Promise<BillWiseOutstandingDetailApi> {
    return withBwoError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.BILL_WISE_OUTSTANDING.DETAIL(openItemId),
        {
          params: buildQueryParams({
            asOfDate: query?.asOfDate,
            financialYearId: query?.financialYearId,
          }),
        },
      );
      return unwrapData<BillWiseOutstandingDetailApi>(response);
    }, "Failed to load bill outstanding detail.");
  },
};
