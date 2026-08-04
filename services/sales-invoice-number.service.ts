import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export type SiNumberParams = {
  warehouseId?: string | null;
  state?: string | null;
};

export const SalesInvoiceNumberService = {
  async getPreviewNumber(params: SiNumberParams = {}): Promise<string> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.PREVIEW_NUMBER,
      {
        params: {
          ...(params.warehouseId ? { warehouse_id: params.warehouseId } : {}),
          ...(params.state ? { state: params.state } : {}),
        },
        headers: { "Cache-Control": "no-cache" },
      },
    );
    const data = response.data?.data;
    return (
      (typeof data === "string" ? data : null) ||
      data?.invoice_no ||
      data?.invoiceNo ||
      ""
    );
  },

  async allocateNumber(
    params: SiNumberParams = {},
  ): Promise<{ invoice_no: string; document_sequence_id: string }> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.ALLOCATE,
      {
        ...(params.warehouseId ? { warehouse_id: params.warehouseId } : {}),
        ...(params.state ? { state: params.state } : {}),
      },
    );
    const data = response.data?.data ?? {};
    return {
      invoice_no: data.invoice_no || data.invoiceNo || "",
      document_sequence_id:
        data.document_sequence_id || data.documentSequenceId || "",
    };
  },

  async generatePdf(params: {
    htmlContent: string;
    filename: string;
  }): Promise<Blob> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.PDF,
      { htmlContent: params.htmlContent, filename: params.filename },
      { responseType: "blob" },
    );
    return response.data as Blob;
  },

  async generateExcel(params: {
    headers: string[];
    rows: any[][];
    filename: string;
  }): Promise<Blob> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.EXCEL,
      { headers: params.headers, rows: params.rows, filename: params.filename },
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
};
