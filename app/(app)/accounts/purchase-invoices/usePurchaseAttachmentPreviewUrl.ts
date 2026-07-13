"use client";

import { useEffect, useState } from "react";
import type { PurchaseAttachment } from "./purchase-invoices-data";
import { getPurchaseAttachmentObjectUrl } from "./purchase-invoice-attachment-store";

/** Resolve a session blob URL or IndexedDB-backed attachment for preview/download. */
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
