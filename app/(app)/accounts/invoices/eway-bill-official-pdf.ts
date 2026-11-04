"use client";

import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

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

async function readAxiosErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  const err = error as {
    response?: { data?: unknown; statusText?: string };
    message?: string;
  };
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object" && !(data instanceof Blob)) {
    const msg =
      (data as { message?: string; error?: string }).message ||
      (data as { error?: string }).error;
    if (msg) return String(msg);
  }
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      if (parsed?.message) return String(parsed.message);
      if (parsed?.error) return String(parsed.error);
      if (text.trim()) return text;
    } catch {
      /* ignore */
    }
  }
  return err?.message || err?.response?.statusText || fallback;
}

async function downloadPdfBlob(
  url: string,
  fallbackName: string,
): Promise<void> {
  try {
    const response = await axiosInstance.get(url, {
      responseType: "blob",
      timeout: 120000,
    });
    const blob = response.data as Blob;
    if (blob.type && blob.type.includes("application/json")) {
      const text = await blob.text();
      try {
        const parsed = JSON.parse(text) as { message?: string; error?: string };
        throw new Error(
          parsed?.message || parsed?.error || "Failed to download E-Way Bill PDF.",
        );
      } catch (inner) {
        if (inner instanceof Error && inner.message !== text) throw inner;
        throw new Error(text || "Failed to download E-Way Bill PDF.");
      }
    }
    const fileName = fileNameFromDisposition(
      response.headers?.["content-disposition"] as string | undefined,
      fallbackName,
    );
    triggerBlobDownload(blob, fileName);
  } catch (error) {
    throw new Error(
      await readAxiosErrorMessage(error, "Failed to download E-Way Bill PDF."),
    );
  }
}

export async function downloadSalesInvoiceEwayBillPdf(
  salesInvoiceId: string,
): Promise<void> {
  await downloadPdfBlob(
    API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.EWAY_BILL_PDF(salesInvoiceId),
    `EWAY_BILL_PART_A_${salesInvoiceId}.pdf`,
  );
}

export async function downloadDispatchEwayBillPdf(
  dispatchId: string,
): Promise<void> {
  await downloadPdfBlob(
    API_ENDPOINTS.WAREHOUSE.DISPATCH.EWAY_BILL_PDF(dispatchId),
    `EWAY_BILL_PART_A_${dispatchId}.pdf`,
  );
}
