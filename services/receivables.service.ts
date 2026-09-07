import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  AgingApiRow,
  AgingQuery,
  CreateFollowUpPayload,
  CustomerOutstandingDetailApi,
  CustomerSummaryApiRow,
  CustomerSummaryQuery,
  FollowUpApiRow,
  FollowUpHistoryApiRow,
  FollowUpsQuery,
  InvoiceSettlementApiRow,
  PaginatedReceivablesResponse,
  ReceivableInvoiceApiRow,
  ReceivableInvoicesQuery,
  ReceivablesExportQuery,
  UpdateFollowUpPayload,
} from "@/types/receivables.types";

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

async function withReceivablesError<T>(
  action: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(extractErrorMessage(error, fallback));
  }
}

function buildQueryParams(
  params: Record<
    string,
    string | number | boolean | string[] | undefined | null
  >,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      out[key] = value.join(",");
      continue;
    }
    out[key] = value;
  }
  return out;
}

async function downloadReceivablesExport(
  response: { data: Blob; headers?: Record<string, unknown> },
  fallbackFilename: string,
  emptyMessage: string,
): Promise<void> {
  const contentType = String(response.headers?.["content-type"] ?? "");
  if (contentType.includes("application/json")) {
    const text = await (response.data as Blob).text();
    let message = emptyMessage;
    try {
      const body = JSON.parse(text) as { message?: string };
      message = body.message || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const disposition = String(response.headers?.["content-disposition"] ?? "");
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename = match?.[1] ?? fallbackFilename;
  const url = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const ReceivablesService = {
  extractErrorMessage,

  async getCustomerSummary(
    query: CustomerSummaryQuery = {},
  ): Promise<PaginatedReceivablesResponse<CustomerSummaryApiRow>> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.CUSTOMER_SUMMARY,
        {
          params: buildQueryParams({
            search: query.search,
            customerId: query.customerId,
            customerIds: query.customerIds,
            salespersonId: query.salespersonId,
            branchId: query.branchId,
            warehouseId: query.warehouseId,
            asOfDate: query.asOfDate,
            excludeZeroBalance: query.excludeZeroBalance,
            status: query.status,
            page: query.page,
            page_size: query.page_size,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          }),
        },
      );
      return unwrapData<PaginatedReceivablesResponse<CustomerSummaryApiRow>>(response);
    }, "Failed to load customer summary.");
  },

  async getInvoices(
    query: ReceivableInvoicesQuery = {},
  ): Promise<PaginatedReceivablesResponse<ReceivableInvoiceApiRow>> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.RECEIVABLES.INVOICES, {
        params: buildQueryParams({
          search: query.search,
          customerId: query.customerId,
          customerIds: query.customerIds,
          branchId: query.branchId,
          warehouseId: query.warehouseId,
          invoiceDateFrom: query.invoiceDateFrom,
          invoiceDateTo: query.invoiceDateTo,
          dueDateFrom: query.dueDateFrom,
          dueDateTo: query.dueDateTo,
          status: query.status,
          asOfDate: query.asOfDate,
          page: query.page,
          page_size: query.page_size,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }),
      });
      return unwrapData<PaginatedReceivablesResponse<ReceivableInvoiceApiRow>>(response);
    }, "Failed to load receivable invoices.");
  },

  async getAging(
    query: AgingQuery = {},
  ): Promise<PaginatedReceivablesResponse<AgingApiRow>> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.RECEIVABLES.AGING, {
        params: buildQueryParams({
          search: query.search,
          customerId: query.customerId,
          customerIds: query.customerIds,
          branchId: query.branchId,
          warehouseId: query.warehouseId,
          salespersonId: query.salespersonId,
          asOfDate: query.asOfDate,
          excludeZeroBalance: query.excludeZeroBalance,
          status: query.status,
          agingBreakpoints: query.agingBreakpoints,
          page: query.page,
          page_size: query.page_size,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }),
      });
      return unwrapData<PaginatedReceivablesResponse<AgingApiRow>>(response);
    }, "Failed to load ageing data.");
  },

  async getCustomerOutstanding(
    customerId: string,
    asOfDate?: string,
  ): Promise<CustomerOutstandingDetailApi> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.CUSTOMER_DETAIL(customerId),
        {
          params: buildQueryParams({ asOfDate }),
        },
      );
      return unwrapData<CustomerOutstandingDetailApi>(response);
    }, "Failed to load customer outstanding details.");
  },

  async getInvoiceByOpenItem(
    openItemId: string,
    asOfDate?: string,
  ): Promise<ReceivableInvoiceApiRow> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.INVOICE_DETAIL(openItemId),
        {
          params: buildQueryParams({ asOfDate }),
        },
      );
      return unwrapData<ReceivableInvoiceApiRow>(response);
    }, "Failed to load invoice outstanding details.");
  },

  async getInvoiceSettlements(openItemId: string): Promise<InvoiceSettlementApiRow[]> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.INVOICE_SETTLEMENTS(openItemId),
      );
      const data = unwrapData<InvoiceSettlementApiRow[] | { data: InvoiceSettlementApiRow[] }>(
        response,
      );
      return Array.isArray(data) ? data : (data as { data: InvoiceSettlementApiRow[] }).data ?? [];
    }, "Failed to load invoice settlements.");
  },

  async getFollowUps(
    query: FollowUpsQuery = {},
  ): Promise<PaginatedReceivablesResponse<FollowUpApiRow>> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.RECEIVABLES.FOLLOW_UPS, {
        params: buildQueryParams({
          search: query.search,
          customerId: query.customerId,
          openItemId: query.openItemId,
          status: query.status,
          assignedTo: query.assignedTo,
          nextFollowUpDateFrom: query.nextFollowUpDateFrom,
          nextFollowUpDateTo: query.nextFollowUpDateTo,
          page: query.page,
          page_size: query.page_size,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }),
      });
      return unwrapData<PaginatedReceivablesResponse<FollowUpApiRow>>(response);
    }, "Failed to load collection follow-ups.");
  },

  async getFollowUp(id: string): Promise<FollowUpApiRow> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.FOLLOW_UP_BY_ID(id),
      );
      return unwrapData<FollowUpApiRow>(response);
    }, "Failed to load follow-up.");
  },

  async createFollowUp(payload: CreateFollowUpPayload): Promise<FollowUpApiRow> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.FOLLOW_UPS,
        payload,
      );
      return unwrapData<FollowUpApiRow>(response);
    }, "Failed to create follow-up.");
  },

  async updateFollowUp(
    id: string,
    payload: UpdateFollowUpPayload,
  ): Promise<FollowUpApiRow> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.patch(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.FOLLOW_UP_BY_ID(id),
        payload,
      );
      return unwrapData<FollowUpApiRow>(response);
    }, "Failed to update follow-up.");
  },

  async getFollowUpHistory(id: string): Promise<FollowUpHistoryApiRow[]> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.FOLLOW_UP_HISTORY(id),
      );
      const data = unwrapData<FollowUpHistoryApiRow[] | { data: FollowUpHistoryApiRow[] }>(
        response,
      );
      return Array.isArray(data) ? data : (data as { data: FollowUpHistoryApiRow[] }).data ?? [];
    }, "Failed to load follow-up history.");
  },

  async exportExcel(query: ReceivablesExportQuery): Promise<void> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.EXPORT_EXCEL,
        {
          params: buildQueryParams({
            view: query.view,
            search: query.search,
            customerId: query.customerId,
            customerIds: query.customerIds,
            salespersonId: query.salespersonId,
            branchId: query.branchId,
            warehouseId: query.warehouseId,
            asOfDate: query.asOfDate,
            excludeZeroBalance: query.excludeZeroBalance,
            status: query.status,
            dueStatus: query.dueStatus,
            invoiceDateFrom: query.invoiceDateFrom,
            invoiceDateTo: query.invoiceDateTo,
            dueDateFrom: query.dueDateFrom,
            dueDateTo: query.dueDateTo,
            agingBreakpoints: query.agingBreakpoints,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          }),
          responseType: "blob",
          timeout: 120000,
        },
      );
      await downloadReceivablesExport(
        response,
        `${query.view}_export.xlsx`,
        "No receivables records found to export.",
      );
    }, "Failed to export receivables to Excel.");
  },

  async exportPdf(query: ReceivablesExportQuery): Promise<void> {
    return withReceivablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIVABLES.EXPORT_PDF,
        {
          params: buildQueryParams({
            view: query.view,
            search: query.search,
            customerId: query.customerId,
            customerIds: query.customerIds,
            salespersonId: query.salespersonId,
            branchId: query.branchId,
            warehouseId: query.warehouseId,
            asOfDate: query.asOfDate,
            excludeZeroBalance: query.excludeZeroBalance,
            status: query.status,
            dueStatus: query.dueStatus,
            invoiceDateFrom: query.invoiceDateFrom,
            invoiceDateTo: query.invoiceDateTo,
            dueDateFrom: query.dueDateFrom,
            dueDateTo: query.dueDateTo,
            agingBreakpoints: query.agingBreakpoints,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          }),
          responseType: "blob",
          timeout: 120000,
        },
      );
      await downloadReceivablesExport(
        response,
        `${query.view}_export.pdf`,
        "No receivables records found to export.",
      );
    }, "Failed to export receivables to PDF.");
  },
};
