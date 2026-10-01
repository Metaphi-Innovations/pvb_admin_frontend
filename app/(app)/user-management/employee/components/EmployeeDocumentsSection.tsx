"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Upload,
  Trash2,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  type EmployeeDocument,
  EMPLOYEE_DOCUMENT_MAX_BYTES,
  EMPLOYEE_DOCUMENT_ACCEPT,
  newDocumentId,
} from "../employee-documents";

function DeleteIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Delete"
      onClick={onClick}
      className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

export function EmployeeDocumentsSection({
  documents,
  onChange,
  readOnly = false,
}: {
  documents: EmployeeDocument[];
  onChange?: (docs: EmployeeDocument[]) => void;
  readOnly?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = (id: string, partial: Partial<EmployeeDocument>) => {
    if (!onChange) return;
    onChange(documents.map((d) => (d.id === id ? { ...d, ...partial } : d)));
  };

  const addDocument = () => {
    if (!onChange) return;
    onChange([
      ...documents,
      { id: newDocumentId(), documentName: "" },
    ]);
  };

  const removeDocument = (id: string) => {
    if (!onChange) return;
    onChange(documents.filter((d) => d.id !== id));
  };

  const pickFile = (id: string) => {
    setPendingDocId(id);
    setError(null);
    fileRef.current?.click();
  };

  const onFileSelected = (file: File) => {
    if (!pendingDocId || !onChange) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      setError("Only PDF, JPG, JPEG, and PNG files are allowed.");
      return;
    }
    if (file.size > EMPLOYEE_DOCUMENT_MAX_BYTES) {
      setError("File exceeds maximum size of 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patch(pendingDocId, {
        fileName: file.name,
        fileUrl: reader.result as string,
        fileSize: file.size,
        mimeType: file.type,
      });
      setPendingDocId(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const openFile = (doc: EmployeeDocument) => {
    if (!doc.fileUrl) return;
    window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-2.5">
      {error && (
        <p className="text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={EMPLOYEE_DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
          e.target.value = "";
        }}
      />

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-muted/25 text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium w-[38%]">Document Name</th>
              <th className="px-3 py-2 text-left font-medium">File Name</th>
              <th className="px-3 py-2 text-right font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-5 text-center text-muted-foreground">
                  No documents added yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const displayName = doc.documentName || doc.documentType || "";
                const hasFile = Boolean(doc.fileName && doc.fileUrl);

                return (
                  <tr
                    key={doc.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/10"
                  >
                    <td className="px-3 py-2 align-middle">
                      {readOnly ? (
                        <span className="font-medium text-foreground">
                          {displayName || "—"}
                        </span>
                      ) : (
                        <Input
                          value={displayName}
                          onChange={(e) =>
                            patch(doc.id, { documentName: e.target.value })
                          }
                          placeholder="e.g. Aadhaar Card"
                          className="h-8 text-xs max-w-xs"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {hasFile ? (
                        <button
                          type="button"
                          className="text-brand-600 hover:underline text-left truncate max-w-[280px] block"
                          onClick={() => openFile(doc)}
                        >
                          {doc.fileName}
                        </button>
                      ) : readOnly ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px]"
                          onClick={() => pickFile(doc.id)}
                        >
                          <Upload className="w-3 h-3 mr-1 shrink-0" />
                          Upload File
                        </Button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {hasFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => openFile(doc)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        )}
                        {!readOnly && (
                          <DeleteIconButton onClick={() => removeDocument(doc.id)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs border-dashed"
          onClick={addDocument}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Document
        </Button>
      )}
    </div>
  );
}
