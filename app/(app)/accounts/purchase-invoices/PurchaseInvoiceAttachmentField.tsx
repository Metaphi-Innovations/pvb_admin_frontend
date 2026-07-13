"use client";

import { Eye, Trash2, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PurchaseAttachment } from "./purchase-invoices-data";
import { newPurchaseAttachmentId } from "./purchase-invoices-data";
import { putPurchaseAttachment } from "./purchase-invoice-attachment-store";
import { usePurchaseAttachmentPreviewUrl } from "./usePurchaseAttachmentPreviewUrl";
import { cn } from "@/lib/utils";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

export function PurchaseInvoiceAttachmentField({
  attachment,
  onChange,
  disabled,
  required,
  error,
}: {
  attachment: PurchaseAttachment | null;
  onChange: (att: PurchaseAttachment | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  const previewUrl = usePurchaseAttachmentPreviewUrl(attachment);

  const handleFile = (file: File) => {
    const id = newPurchaseAttachmentId();
    const blobUrl = URL.createObjectURL(file);
    const uploadedAt = new Date().toISOString();

    onChange({
      id,
      documentName: "Supplier Invoice",
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: id,
      uploadedAt,
      dataUrl: blobUrl,
    });

    void putPurchaseAttachment({
      id,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      blob: file,
      uploadedAt,
    }).catch(() => {});
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 min-h-8">
        {attachment ? (
          <>
            <span className="text-[13px] font-medium text-foreground truncate max-w-[140px]">
              {attachment.fileName}
            </span>
            {previewUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2 gap-1"
                onClick={() => window.open(previewUrl, "_blank")}
              >
                <Eye className="w-3.5 h-3.5" /> View
              </Button>
            )}
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onChange(null)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </>
        ) : (
          <label
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-white text-xs font-medium cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap",
              disabled && "opacity-50 pointer-events-none",
              error && "border-red-400",
            )}
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            Upload
            {required && <span className="text-red-500">*</span>}
            <input
              type="file"
              className="hidden"
              accept={ACCEPT}
              disabled={disabled}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
