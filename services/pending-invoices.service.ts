import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";

export interface PendingInvoiceDto {
  dispatch_id: string;
  dispatch_date: string;
  dispatch_no: string;
  source_order_no: string;
  source_type: "normal_sales" | "stock_transfer" | string;
  customer_name: string;
  customer_gstin: string;
  total_qty: number;
  invoice_value: number;
  branch: string;
  warehouse_id: string;
}

export interface ListPendingInvoicesQuery {
  source_type: "normal_sales" | "stock_transfer";
  from_date?: string;
  to_date?: string;
  branch_id?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface ListPendingInvoicesResponse {
  data: PendingInvoiceDto[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

export const pendingInvoicesService = {
  async list(query: ListPendingInvoicesQuery): Promise<ListPendingInvoicesResponse> {
    const params = new URLSearchParams();
    params.set("source_type", query.source_type);
    if (query.from_date) params.set("from_date", query.from_date);
    if (query.to_date) params.set("to_date", query.to_date);
    if (query.branch_id) params.set("branch_id", query.branch_id);
    if (query.page) params.set("page", String(query.page));
    if (query.page_size) params.set("page_size", String(query.page_size));
    if (query.ordering) params.set("ordering", query.ordering);

    const response = await axiosInstance.get<ApiResponse<ListPendingInvoicesResponse>>(
      `${API_ENDPOINTS.ACCOUNTS.PENDING_INVOICES.LIST}?${params.toString()}`
    );
    
    if (!response.data?.success || !response.data?.data) {
      throw new Error(response.data?.message || "Failed to load pending invoices.");
    }
    return response.data.data;
  },

  async generateInvoice(
    dispatchId: string,
    payload: {
      invoice_date: string;
      due_date?: string;
      bank_account_id: string;
      transport_mode?: string;
      transporter_name?: string;
      transporter_id?: string;
      vehicle_no?: string;
      distance_km?: number;
      lr_no?: string;
      lr_date?: string;
      transport_doc_no?: string;
      transport_doc_date?: string;
      additional_charges?: Array<{
        additional_charge_id: string;
        amount: number;
        gst_applicable: boolean;
        gst_percent?: number;
        remarks?: string;
      }>;
    }
  ): Promise<{ invoice_id: string; invoice_no: string; invoice_type: string }> {
    const response = await axiosInstance.post<ApiResponse<{ invoice_id: string; invoice_no: string; invoice_type: string }>>(
      API_ENDPOINTS.ACCOUNTS.PENDING_INVOICES.GENERATE(dispatchId),
      payload
    );
    if (!response.data?.success || !response.data?.data) {
      throw new Error(response.data?.message || "Failed to generate invoice.");
    }
    return response.data.data;
  }
};
