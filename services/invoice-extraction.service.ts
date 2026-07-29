import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export type InvoiceExtractionItem = {
  sku: string | null;
  product_name: string | null;
  batch_number: string | null;
  mfg_date: string | null;
  exp_date: string | null;
  total_quantity: number | null;
  bag_case_quantity: number | null;
  price: number | null;
  gst_percentage: number | null;
  amount: number | null;
};

export type InvoiceExtractionResult = {
  invoice_number: string | null;
  invoice_date: string | null;
  supplier_name: string | null;
  total_amount: number | null;
  items: InvoiceExtractionItem[];
  warnings: string[];
  success: boolean;
};

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function asItems(value: unknown): InvoiceExtractionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((item) => ({
      sku: asString(item.sku),
      product_name: asString(item.product_name ?? item.productName),
      batch_number: asString(item.batch_number ?? item.batchNumber),
      mfg_date: asString(item.mfg_date ?? item.mfgDate),
      exp_date: asString(item.exp_date ?? item.expDate),
      total_quantity: asNumber(item.total_quantity ?? item.totalQuantity),
      bag_case_quantity: asNumber(
        item.bag_case_quantity ?? item.bagCaseQuantity,
      ),
      price: asNumber(item.price),
      gst_percentage: asNumber(item.gst_percentage ?? item.gstPercentage),
      amount: asNumber(item.amount),
    }));
}

function mapExtractionPayload(raw: unknown): InvoiceExtractionResult {
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  // Support both direct standard response and ApiResponse-wrapped `{ data }`
  const payload =
    body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : body;

  if (body.success === false) {
    throw new Error(
      asString(body.message) ||
        asString(body.error) ||
        "Invoice extraction failed.",
    );
  }

  return {
    invoice_number: asString(
      payload.invoice_number ?? payload.invoiceNumber,
    ),
    invoice_date: asString(payload.invoice_date ?? payload.invoiceDate),
    supplier_name: asString(payload.supplier_name ?? payload.supplierName),
    total_amount: asNumber(payload.total_amount ?? payload.totalAmount),
    items: asItems(payload.items ?? payload.lineItems ?? payload.tables),
    warnings: asWarnings(payload.warnings),
    success: payload.success !== false,
  };
}

/**
 * Normalize loose OCR dates into `YYYY-MM-DD` for HTML date inputs.
 */
export function normalizeExtractionDate(
  value: string | null | undefined,
): string {
  if (!value?.trim()) return "";
  const raw = value.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (String(dmy[3]).length <= 2) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const ymd = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

export const InvoiceExtractionService = {
  /**
   * POST /api/invoice-extraction/extract
   * multipart field name: `file`
   */
  async extractInvoice(file: File): Promise<InvoiceExtractionResult> {
    if (!file) {
      throw new Error("Please select an invoice file to extract.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post(
      API_ENDPOINTS.INVOICE_EXTRACTION.EXTRACT,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        // OCR / PDF parsing can exceed the default 15s axios timeout
        timeout: 120_000,
      },
    );

    return mapExtractionPayload(response.data);
  },
};
