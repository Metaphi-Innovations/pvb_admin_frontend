import { escapeHtml } from "./formatters";
import { paramverseBaseCss } from "./styles";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface PdfDocumentShellInput {
  /** Prefer empty/short to avoid Chrome print header showing filename. */
  title?: string;
  bodyHtml: string;
  extraCss?: string;
}

/** Full HTML document wrapper for browser print PDFs. */
export function buildParamversePdfDocument(input: PdfDocumentShellInput): string {
  const title = String(input.title ?? "").trim();
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title || " ")}</title>
  <style>
    ${paramverseBaseCss()}
    ${input.extraCss || ""}
  </style>
</head>
<body>
  <div class="pv-sheet">
    ${input.bodyHtml}
  </div>
</body>
</html>`;
}

export async function loadNavbarLogoDataUrl(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  const path = "/images/dharitri%20sutra.png";
  try {
    const response = await fetch(path);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return `${window.location.origin}${path}`;
  }
}

export function openPdfPrintWindow(preparingLabel = "Preparing PDF..."): Window | null {
  if (typeof window === "undefined") return null;
  const popup = window.open("", "_blank");
  if (popup?.document) {
    popup.document.write(
      `<!doctype html><html><head><title> </title></head><body style="font-family:Arial,sans-serif;padding:12px">${preparingLabel}</body></html>`,
    );
    popup.document.close();
  }
  return popup;
}

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

/**
 * Download HTML as PDF using server-side Puppeteer (exact print layout).
 * Falls back to hidden-iframe print only when an openedWindow is provided.
 */
export async function writeHtmlAndPrint(
  html: string,
  openedWindow?: Window | null,
  fileName?: string,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF download is only supported in the browser.");
  }

  const resolvedName = (fileName || "document.pdf").endsWith(".pdf")
    ? fileName || "document.pdf"
    : `${fileName || "document"}.pdf`;

  // Legacy popup print path (kept for callers that still open a window).
  if (openedWindow) {
    openedWindow.document.open();
    openedWindow.document.write(html);
    openedWindow.document.close();
    openedWindow.document.title = " ";
    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        openedWindow.focus();
        openedWindow.print();
        resolve();
      }, 250);
    });
    return;
  }

  const response = await axiosInstance.post(
    API_ENDPOINTS.PDF.FROM_HTML,
    { html, fileName: resolvedName },
    {
      responseType: "blob",
      timeout: 120000,
    },
  );

  const blob = response.data as Blob;
  if (!blob || blob.size === 0) {
    throw new Error("Empty PDF received from server.");
  }

  // Guard against JSON error payloads returned as blob.
  if (blob.type && blob.type.includes("application/json")) {
    const text = await blob.text();
    let message = "Failed to generate PDF.";
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed?.message) message = parsed.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  triggerBlobDownload(blob, resolvedName);
}
