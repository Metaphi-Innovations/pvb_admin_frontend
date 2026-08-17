"use client";

import { openEditablePdfPreview } from "@/lib/pdf/paramverse";
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

export async function fetchPackingListPreviewBySource(
  sourceType: string,
  sourceId: string,
): Promise<{ html: string; fileName: string }> {
  const response = await axiosInstance.get(
    API_ENDPOINTS.WAREHOUSE.PACKING_LIST.PDF_PREVIEW_BY_SOURCE,
    { params: { source_type: sourceType, source_id: sourceId } },
  );
  const data = response.data?.data || {};
  return {
    html: String(data.html || ""),
    fileName: String(data.fileName || "packing-list.pdf"),
  };
}

export async function downloadPackingListPdfBySource(
  sourceType: string,
  sourceId: string,
): Promise<void> {
  const response = await axiosInstance.get(
    API_ENDPOINTS.WAREHOUSE.PACKING_LIST.PDF_BY_SOURCE,
    {
      params: { source_type: sourceType, source_id: sourceId },
      responseType: "blob",
    },
  );
  const blob = response.data as Blob;
  const fileName = fileNameFromDisposition(
    response.headers?.["content-disposition"] as string | undefined,
    "packing-list.pdf",
  );
  triggerBlobDownload(blob, fileName);
}

export async function fetchPackingListPreviewById(
  packingListId: string,
): Promise<{ html: string; fileName: string }> {
  const response = await axiosInstance.get(
    API_ENDPOINTS.WAREHOUSE.PACKING_LIST.PREVIEW(packingListId),
  );
  const data = response.data?.data || {};
  return {
    html: String(data.html || ""),
    fileName: String(data.fileName || "packing-list.pdf"),
  };
}

export async function downloadPackingListPdfById(
  packingListId: string,
): Promise<void> {
  const response = await axiosInstance.get(
    API_ENDPOINTS.WAREHOUSE.PACKING_LIST.PDF(packingListId),
    { responseType: "blob" },
  );
  const blob = response.data as Blob;
  const fileName = fileNameFromDisposition(
    response.headers?.["content-disposition"] as string | undefined,
    "packing-list.pdf",
  );
  triggerBlobDownload(blob, fileName);
}

async function openPackingListServerPreview(params: {
  html: string;
  fileName: string;
  onDownload: () => Promise<void>;
}): Promise<void> {
  if (!params.html.trim()) {
    throw new Error("Empty Packing List preview received from server.");
  }
  await openEditablePdfPreview({
    title: "Packing List PDF Preview",
    initialData: { html: params.html },
    renderHtml: (data) => String(data.html || ""),
    enableDirectPreviewEditing: false,
    printButtonLabel: "Download Packing List PDF",
    outputFileName: params.fileName,
    onDownload: params.onDownload,
  });
}

/**
 * Opens official server preview / download for a sales order packing list.
 */
export async function downloadPackingListPdfForSalesOrder(
  salesOrderId: string,
  _openedWindow?: Window | null,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF download is only supported in the browser.");
  }
  const { html, fileName } = await fetchPackingListPreviewBySource(
    "normal_sales",
    String(salesOrderId),
  );
  await openPackingListServerPreview({
    html,
    fileName,
    onDownload: () =>
      downloadPackingListPdfBySource("normal_sales", String(salesOrderId)),
  });
}

export function openPackingListPdfWindow(): Window | null {
  return null;
}
