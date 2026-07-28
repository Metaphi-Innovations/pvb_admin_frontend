"use client";

import { Download, Eye, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PurchaseAttachment } from "./purchase-invoices-data";
import { usePurchaseAttachmentPreviewUrl } from "./usePurchaseAttachmentPreviewUrl";

export function DirectPurchaseAttachmentPanel({
  attachment,
}: {
  attachment: PurchaseAttachment;
}) {
  const previewUrl = usePurchaseAttachmentPreviewUrl(attachment);

  return (
    <div className="flex items-center gap-3">
      <Paperclip className="w-4 h-4 text-brand-600" />
      <span className="text-xs font-medium">{attachment.fileName}</span>
      {previewUrl && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => window.open(previewUrl, "_blank")}
          >
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
          <a href={previewUrl} download={attachment.fileName}>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          </a>
        </>
      )}
    </div>
  );
}
