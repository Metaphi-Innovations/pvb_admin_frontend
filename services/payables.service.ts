import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  AgingApiRow,
  AgingQuery,
  BillSettlementApiRow,
  BillsQuery,
  PaginatedPayablesResponse,
  PayableBillApiRow,
  PayablesExportQuery,
  SupplierOutstandingDetailApi,
  SupplierSummaryApiRow,
  SupplierSummaryQuery,
} from "@/types/payables.types";

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

async function withPayablesError<T>(
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

async function downloadPayablesExport(
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

export const PayablesService = {
  extractErrorMessage,

  async getSupplierSummary(
    query: SupplierSummaryQuery = {},
  ): Promise<PaginatedPayablesResponse<SupplierSummaryApiRow>> {
    return withPayablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYABLES.SUPPLIER_SUMMARY,
        {
          params: buildQueryParams({
            search: query.search,
            supplierId: query.supplierId,
            supplierIds: query.supplierIds,
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
      return unwrapData<PaginatedPayablesResponse<SupplierSummaryApiRow>>(response);
    }, "Failed to load supplier summary.");
  },

  async listBills(
    query: BillsQuery = {},
  ): Promise<PaginatedPayablesResponse<PayableBillApiRow>> {
    return withPayablesError(async () => {
      const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.PAYABLES.BILLS, {
        params: buildQueryParams({
          search: query.search,
          supplierId: query.supplierId,
          supplierIds: query.supplierIds,
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
      return unwrapData<PaginatedPayablesResponse<PayableBillApiRow>>(response);
    }, "Failed to load payable bills.");
  },

  async getAging(
    query: AgingQuery = {},
  ): Promise<PaginatedPayablesResponse<AgingApiRow>> {
    return withPayablesError(async () => {
      const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.PAYABLES.AGING, {
        params: buildQueryParams({
          search: query.search,
          supplierId: query.supplierId,
          supplierIds: query.supplierIds,
          branchId: query.branchId,
          warehouseId: query.warehouseId,
          asOfDate: query.asOfDate,
          agingBreakpoints: query.agingBreakpoints,
          page: query.page,
          page_size: query.page_size,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }),
      });
      return unwrapData<PaginatedPayablesResponse<AgingApiRow>>(response);
    }, "Failed to load supplier ageing.");
  },

  async getSupplierOutstanding(
    supplierId: string,
    asOfDate?: string,
  ): Promise<SupplierOutstandingDetailApi> {
    return withPayablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYABLES.SUPPLIER_DETAIL(supplierId),
        {
          params: buildQueryParams({ asOfDate }),
        },
      );
      return unwrapData<SupplierOutstandingDetailApi>(response);
    }, "Failed to load supplier outstanding detail.");
  },

  async getBillByOpenItemId(
    openItemId: string,
    asOfDate?: string,
  ): Promise<PayableBillApiRow> {
    return withPayablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYABLES.BILL_DETAIL(openItemId),
        {
          params: buildQueryParams({ asOfDate }),
        },
      );
      return unwrapData<PayableBillApiRow>(response);
    }, "Failed to load payable bill.");
  },

  async getBillSettlements(openItemId: string): Promise<BillSettlementApiRow[]> {
    return withPayablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYABLES.BILL_SETTLEMENTS(openItemId),
      );
      const data = unwrapData<BillSettlementApiRow[] | { data: BillSettlementApiRow[] }>(
        response,
      );
      return Array.isArray(data) ? data : (data as { data: BillSettlementApiRow[] }).data ?? [];
    }, "Failed to load bill settlements.");
  },

  async exportExcel(query: PayablesExportQuery): Promise<void> {
    return withPayablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYABLES.EXPORT_EXCEL,
        {
          params: buildQueryParams({
            view: query.view,
            search: query.search,
            supplierId: query.supplierId,
            supplierIds: query.supplierIds,
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
      await downloadPayablesExport(
        response,
        `${query.view}_export.xlsx`,
        "No payables records found to export.",
      );
    }, "Failed to export payables to Excel.");
  },

  async exportPdf(query: PayablesExportQuery): Promise<void> {
    return withPayablesError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYABLES.EXPORT_PDF,
        {
          params: buildQueryParams({
            view: query.view,
            search: query.search,
            supplierId: query.supplierId,
            supplierIds: query.supplierIds,
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
      await downloadPayablesExport(
        response,
        `${query.view}_export.pdf`,
        "No payables records found to export.",
      );
    }, "Failed to export payables to PDF.");
  },
};
