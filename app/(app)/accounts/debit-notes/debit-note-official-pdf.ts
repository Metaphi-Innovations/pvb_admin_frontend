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

export function canDownloadDebitNoteOfficialPdf(status: string | undefined): boolean {
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
      fileName: String(data.fileName || "debit_note.pdf"),
    };
  } catch (error) {
    throw new Error(await readAxiosErrorMessage(error, "Failed to load Debit Note preview."));
  }
}

export async function downloadDebitNotePdf(debitNoteId: string): Promise<void> {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.PDF(debitNoteId),
      { responseType: "blob", timeout: 120000 },
    );
    const blob = response.data as Blob;
    if (blob.type && blob.type.includes("application/json")) {
      const text = await blob.text();
      try {
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || "Failed to download Debit Note PDF.");
      } catch (e) {
        if (e instanceof Error && e.message !== "Failed to download Debit Note PDF.") throw e;
        throw new Error(text || "Failed to download Debit Note PDF.");
      }
    }
    const fileName = fileNameFromDisposition(
      response.headers?.["content-disposition"] as string | undefined,
      "debit_note.pdf",
    );
    triggerBlobDownload(blob, fileName);
  } catch (error) {
    throw new Error(await readAxiosErrorMessage(error, "Failed to download Debit Note PDF."));
  }
}

export async function openDebitNotePdfPreview(
  debitNoteId: string,
): Promise<void> {
  const { html, fileName } = await fetchPreview(
    API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.PDF_PREVIEW(debitNoteId),
  );
  if (!html.trim()) {
    throw new Error("Empty debit note preview received from server.");
  }
  await openEditablePdfPreview({
    title: "Debit Note PDF Preview",
    initialData: { html },
    renderHtml: (data) => String(data.html || ""),
    enableDirectPreviewEditing: false,
    printButtonLabel: "Download Debit Note PDF",
    outputFileName: fileName,
    onDownload: () => downloadDebitNotePdf(debitNoteId),
  });
}
