"use client";

import { Eye, Paperclip, Trash2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ContraAttachmentMeta, ContraPendingFile } from "@/types/contra-voucher.types";
import {
  CONTRA_ATTACHMENT_ACCEPT,
  CONTRA_ATTACHMENT_MAX_FILES,
  formatContraFileSize,
} from "../contra-attachment-formdata";

export function ContraAttachmentsPanel({
  persisted,
  pending,
  readOnly,
  onAddFiles,
  onRemovePersisted,
  onRemovePending,
}: {
  persisted: ContraAttachmentMeta[];
  pending: ContraPendingFile[];
  readOnly?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemovePersisted: (fileUrl: string) => void;
  onRemovePending: (id: string) => void;
}) {
  const total = persisted.length + pending.length;

  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-xs font-medium">Attachments</Label>
      <p className="text-[11px] text-muted-foreground">
        Max {CONTRA_ATTACHMENT_MAX_FILES} files, 10MB each. JPEG, PNG, GIF, PDF, DOC,
        DOCX, XLS, XLSX, CSV.
      </p>

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
            multiple
            accept={CONTRA_ATTACHMENT_ACCEPT}
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              if (list.length) onAddFiles(list);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}

      {total > 0 ? (
        <ul className="space-y-1 mt-1">
          {persisted.map((att) => (
            <li
              key={`p:${att.file_url}`}
              className="flex items-center gap-2 h-8 px-2 rounded-lg border border-border bg-muted/15 text-[11px]"
            >
              <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1 font-medium text-foreground">
                {att.file_name}
              </span>
              {att.file_type ? (
                <span className="text-muted-foreground truncate max-w-[72px]">
                  {att.file_type}
                </span>
              ) : null}
              <button
                type="button"
                className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                onClick={() => window.open(att.file_url, "_blank", "noopener,noreferrer")}
                aria-label="View attachment"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              {!readOnly ? (
                <button
                  type="button"
                  className="p-1 rounded-md hover:bg-red-50 text-red-600"
                  onClick={() => onRemovePersisted(att.file_url)}
                  aria-label="Remove attachment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </li>
          ))}

          {pending.map((item) => (
            <li
              key={`n:${item.id}`}
              className="flex items-center gap-2 h-8 px-2 rounded-lg border border-dashed border-brand-200 bg-brand-50/40 text-[11px]"
            >
              <Paperclip className="w-3 h-3 text-brand-600 flex-shrink-0" />
              <span className="truncate flex-1 font-medium text-foreground">
                {item.file.name}
              </span>
              <span className="text-muted-foreground whitespace-nowrap">
                {formatContraFileSize(item.file.size)} · pending
              </span>
              {item.previewUrl ? (
                <button
                  type="button"
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                  onClick={() =>
                    window.open(item.previewUrl, "_blank", "noopener,noreferrer")
                  }
                  aria-label="Preview pending file"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              ) : null}
              {!readOnly ? (
                <button
                  type="button"
                  className="p-1 rounded-md hover:bg-red-50 text-red-600"
                  onClick={() => onRemovePending(item.id)}
                  aria-label="Remove pending file"
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
