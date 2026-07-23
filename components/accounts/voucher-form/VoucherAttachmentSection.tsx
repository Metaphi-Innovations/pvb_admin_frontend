"use client";

import { Upload, Eye, Trash2, Paperclip } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface VoucherAttachmentFile {
  id: string;
  fileName: string;
  /** Optional preview URL (data URL or blob URL). */
  previewUrl?: string;
}

export interface VoucherAttachmentSectionProps {
  files: VoucherAttachmentFile[];
  readOnly?: boolean;
  /** When true, only one file is kept (Credit Note style). */
  single?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  className?: string;
}

/**
 * Compact attachment UI for the six Accounts voucher modules only.
 * Storage/persistence is caller-owned — no backend upload.
 */
export function VoucherAttachmentSection({
  files,
  readOnly = false,
  single = false,
  onAddFiles,
  onRemove,
  className,
}: VoucherAttachmentSectionProps) {
  return (
    <div className={cn("space-y-1.5 min-w-0", className)}>
      <Label className="text-xs font-medium">Attachment</Label>

      {!readOnly ? (
        <label
          className={cn(
            "flex items-center justify-center gap-1.5 w-full h-9 px-3 text-xs",
            "border border-dashed border-border rounded-lg cursor-pointer",
            "hover:bg-muted/40 transition-colors text-muted-foreground",
          )}
        >
          <Upload className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Upload File</span>
          <input
            type="file"
            className="hidden"
            multiple={!single}
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              if (list.length) onAddFiles(list);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-1 mt-1">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 h-8 px-2 rounded-lg border border-border bg-muted/15 text-[11px]"
            >
              <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1 font-medium text-foreground">{f.fileName}</span>
              {f.previewUrl ? (
                <button
                  type="button"
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                  onClick={() => window.open(f.previewUrl, "_blank")}
                  aria-label="Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              ) : null}
              {!readOnly ? (
                <button
                  type="button"
                  className="p-1 rounded-md hover:bg-red-50 text-red-600"
                  onClick={() => onRemove(f.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">No files uploaded</p>
      )}
    </div>
  );
}
