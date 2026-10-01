"use client";

import { Paperclip } from "lucide-react";
import type { PurchaseAttachment } from "./purchase-invoices-data";
import { hasPurchaseInvoiceAttachment } from "./purchase-invoices-data";
import { usePurchaseAttachmentPreviewUrl } from "./usePurchaseAttachmentPreviewUrl";

export function PurchaseInvoiceAttachmentLink({
  attachment,
}: {
  attachment: PurchaseAttachment | null | undefined;
}) {
  const previewUrl = usePurchaseAttachmentPreviewUrl(attachment);

  if (!hasPurchaseInvoiceAttachment(attachment)) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (!previewUrl) {
    return <Paperclip className="w-4 h-4 text-muted-foreground" aria-label="Attachment on file" />;
  }

  return (
    <button
      type="button"
      title="View attachment"
      className="p-1 hover:bg-muted rounded-md"
      onClick={() => window.open(previewUrl, "_blank")}
    >
      <Paperclip className="w-4 h-4 text-brand-600" />
    </button>
  );
}
