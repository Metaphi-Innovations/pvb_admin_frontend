"use client";

import { useEffect, useState } from "react";
import type { PurchaseAttachment } from "./purchase-invoices-data";
import { getPurchaseAttachmentObjectUrl } from "./purchase-invoice-attachment-store";
import { resolvePurchaseInvoiceAttachmentUrl } from "@/services/purchase-invoice.service";

/** Resolve a session blob URL, IndexedDB blob, or server `/uploads` attachment for preview/download. */
export function usePurchaseAttachmentPreviewUrl(
  attachment: PurchaseAttachment | null | undefined,
): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!attachment) {
        setPreviewUrl(null);
        return;
      }

      if (attachment.dataUrl) {
        setPreviewUrl(attachment.dataUrl);
        return;
      }

      const ref = attachment.fileUrl ?? attachment.id;
      if (!ref) {
        setPreviewUrl(null);
        return;
      }

      if (
        ref.startsWith("blob:") ||
        ref.startsWith("data:") ||
        ref.includes("/uploads/") ||
        /^https?:\/\//i.test(ref)
      ) {
        const resolved = resolvePurchaseInvoiceAttachmentUrl(ref);
        if (!cancelled) setPreviewUrl(resolved || null);
        return;
      }

      const url = await getPurchaseAttachmentObjectUrl(ref);
      if (!cancelled) setPreviewUrl(url);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [
    attachment?.id,
    attachment?.dataUrl,
    attachment?.fileUrl,
    attachment?.fileName,
  ]);

  return previewUrl;
}
