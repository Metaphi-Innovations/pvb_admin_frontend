"use client";

import { openEditablePdfPreview } from "@/lib/pdf/paramverse";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export const TAX_INVOICE_COPY_LABELS = [
  "Original",
  "Duplicate for Warehouse",
  "Duplicate for Transport",
] as const;

export type TaxInvoiceCopyLabel = (typeof TAX_INVOICE_COPY_LABELS)[number];

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
}

function fileNameFromDisposition(
  disposition: string | undefined,
  fallback: string,
): string {
  const matched = disposition?.match(/filename="?([^"]+)"?/i);
  return matched?.[1] || fallback;
}

async function fetchPreview(
  url: string,
  params?: Record<string, string>,
): Promise<{ html: string; fileName: string }> {
  const response = await axiosInstance.get(url, {
    params,
    timeout: 120000,
  });
  const data = response.data?.data || {};
  return {
    html: String(data.html || ""),
    fileName: String(data.fileName || "invoice.pdf"),
  };
}

async function downloadPdfBlob(
  url: string,
  fallbackName: string,
  params?: Record<string, string>,
): Promise<void> {
  const response = await axiosInstance.get(url, {
    params,
    responseType: "blob",
  });
  const blob = response.data as Blob;
  const fileName = fileNameFromDisposition(
    response.headers?.["content-disposition"] as string | undefined,
    fallbackName,
  );
  triggerBlobDownload(blob, fileName);
}

async function openServerPreview(params: {
  title: string;
  html: string;
  fileName: string;
  printButtonLabel: string;
  onDownload: () => Promise<void>;
}): Promise<void> {
  if (!params.html.trim()) {
    throw new Error("Empty invoice preview received from server.");
  }
  await openEditablePdfPreview({
    title: params.title,
    initialData: { html: params.html },
    renderHtml: (data) => String(data.html || ""),
    enableDirectPreviewEditing: false,
    printButtonLabel: params.printButtonLabel,
    outputFileName: params.fileName,
    onDownload: params.onDownload,
  });
}

export async function openProformaInvoicePreview(
  salesInvoiceId: string,
): Promise<void> {
  const { html, fileName } = await fetchPreview(
    API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.PROFORMA_PREVIEW(salesInvoiceId),
  );
  await openServerPreview({
    title: "Proforma Invoice PDF Preview",
    html,
    fileName,
    printButtonLabel: "Download Proforma Invoice PDF",
    onDownload: () =>
      downloadPdfBlob(
        API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.PROFORMA_PDF(salesInvoiceId),
        fileName,
      ),
  });
}

export async function openTaxInvoicePreview(
  salesInvoiceId: string,
  copyLabel: TaxInvoiceCopyLabel = "Original",
): Promise<void> {
  const params = { copyLabel };
  const { html, fileName } = await fetchPreview(
    API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.TAX_INVOICE_PREVIEW(salesInvoiceId),
    params,
  );
  await openServerPreview({
    title: `Tax Invoice PDF Preview (${copyLabel})`,
    html,
    fileName,
    printButtonLabel: `Download Tax Invoice PDF (${copyLabel})`,
    onDownload: () =>
      downloadPdfBlob(
        API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.TAX_INVOICE_PDF(salesInvoiceId),
        fileName,
        params,
      ),
  });
}
