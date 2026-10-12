"use client";

import { useState } from "react";
import { Download, Eye, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { downloadPurchaseInvoiceAttachment } from "@/services/purchase-invoice.service";
import type { PurchaseAttachment } from "./purchase-invoices-data";
import { usePurchaseAttachmentPreviewUrl } from "./usePurchaseAttachmentPreviewUrl";

export function DirectPurchaseAttachmentPanel({
  attachment,
}: {
  attachment: PurchaseAttachment;
}) {
  const previewUrl = usePurchaseAttachmentPreviewUrl(attachment);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    const source = attachment.fileUrl || attachment.dataUrl || previewUrl;
    if (!source || downloading) return;
    setDownloading(true);
    try {
      await downloadPurchaseInvoiceAttachment(source, attachment.fileName);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Failed to download supplier invoice.",
        "error",
      );
    } finally {
      setDownloading(false);
    }
  };

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
            onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
          >
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            <Download className="w-3.5 h-3.5" /> Download supplier invoice
          </Button>
        </>
      )}
    </div>
  );
}
