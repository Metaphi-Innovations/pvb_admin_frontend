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

async function readAxiosErrorMessage(error: unknown, fallback: string): Promise<string> {
  const err = error as {
    response?: { data?: unknown; statusText?: string };
    message?: string;
  };
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object" && !(data instanceof Blob)) {
    const msg = (data as { message?: string; error?: string }).message
      || (data as { error?: string }).error;
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

export function canDownloadCreditNoteOfficialPdf(status: string | undefined): boolean {
  const s = String(status || "").toUpperCase();
  return s === "APPROVED" || s === "POSTED";
}

async function fetchPreview(
  url: string,
): Promise<{ html: string; fileName: string }> {
  try {
    const response = await axiosInstance.get(url, { timeout: 120000 });
    const data = response.data?.data || {};
    return {
      html: String(data.html || ""),
      fileName: String(data.fileName || "credit_note.pdf"),
    };
  } catch (error) {
    throw new Error(await readAxiosErrorMessage(error, "Failed to load Credit Note preview."));
  }
}

export async function downloadCreditNotePdf(creditNoteId: string): Promise<void> {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.CREDIT_NOTE.PDF(creditNoteId),
      { responseType: "blob", timeout: 120000 },
    );
    const blob = response.data as Blob;
    if (blob.type && blob.type.includes("application/json")) {
      const text = await blob.text();
      try {
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || "Failed to download Credit Note PDF.");
      } catch (e) {
        if (e instanceof Error && e.message !== "Failed to download Credit Note PDF.") throw e;
        throw new Error(text || "Failed to download Credit Note PDF.");
      }
    }
    const fileName = fileNameFromDisposition(
      response.headers?.["content-disposition"] as string | undefined,
      "credit_note.pdf",
    );
    triggerBlobDownload(blob, fileName);
  } catch (error) {
    throw new Error(await readAxiosErrorMessage(error, "Failed to download Credit Note PDF."));
  }
}

export async function openCreditNotePdfPreview(
  creditNoteId: string,
): Promise<void> {
  const { html, fileName } = await fetchPreview(
    API_ENDPOINTS.ACCOUNTS.CREDIT_NOTE.PDF_PREVIEW(creditNoteId),
  );
  if (!html.trim()) {
    throw new Error("Empty credit note preview received from server.");
  }
  await openEditablePdfPreview({
    title: "Credit Note PDF Preview",
    initialData: { html },
    renderHtml: (data) => String(data.html || ""),
    enableDirectPreviewEditing: false,
    printButtonLabel: "Download Credit Note PDF",
    outputFileName: fileName,
    onDownload: () => downloadCreditNotePdf(creditNoteId),
  });
}
