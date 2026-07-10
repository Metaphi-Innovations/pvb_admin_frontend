"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/api/axios";
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

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toBackendDocumentUrl(fileUrl?: string): string {
  const raw = (fileUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").trim();
  const normalizedBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;

  if (raw.startsWith("/api/")) {
    // file_url from backend is usually /api/..., so resolve against backend host.
    return `${normalizedBase.replace(/\/api$/, "")}${raw}`;
  }
  if (raw.startsWith("/")) {
    return `${normalizedBase}${raw}`;
  }
  return `${normalizedBase}/${raw}`;
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

  const onFileSelected = (files: FileList | File[]) => {
    if (!onChange) return;
    const selected = Array.from(files);
    if (selected.length === 0) return;

    const pickTargetId = pendingDocId;
    const remaining = documents.filter((d) => d.id !== pickTargetId);
    const baseTarget = pickTargetId ? documents.find((d) => d.id === pickTargetId) : undefined;
    const nextDocs: EmployeeDocument[] = [...remaining];

    for (let i = 0; i < selected.length; i += 1) {
      const file = selected[i];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "jpg", "jpeg", "png"].includes(ext)) {
        setError("Only PDF, JPG, JPEG, and PNG files are allowed.");
        return;
      }
      if (file.size > EMPLOYEE_DOCUMENT_MAX_BYTES) {
        setError("File exceeds maximum size of 5 MB.");
        return;
      }
    }

    selected.forEach((file, index) => {
      const target =
        index === 0 && baseTarget
          ? { ...baseTarget }
          : { id: newDocumentId(), documentName: "" };
      nextDocs.push({
        ...target,
        fileName: file.name,
        // Keep local preview working before save.
        fileUrl: URL.createObjectURL(file),
        file,
        fileSize: file.size,
        mimeType: file.type,
      });
    });

    onChange(nextDocs);
    setPendingDocId(null);
    setError(null);
  };

  const openFile = async (doc: EmployeeDocument) => {
    const rawUrl = (doc.fileUrl || "").trim();
    if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const targetUrl = toBackendDocumentUrl(rawUrl);
    if (!targetUrl) return;
    try {
      const response = await axiosInstance.get(targetUrl, {
        responseType: "blob",
      });
      const blob = response.data as Blob;
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      setError("Unable to open document. Please login again and retry.");
    }
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
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFileSelected(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-muted/25 text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium w-[38%]">Document Name</th>
              <th className="px-3 py-2 text-left font-medium">File</th>
              <th className="px-3 py-2 text-left font-medium w-36">Type</th>
              <th className="px-3 py-2 text-left font-medium w-28">Size</th>
              <th className="px-3 py-2 text-right font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-muted-foreground">
                  No documents added yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const documentName = doc.documentName || "";
                const hasFile = Boolean(doc.fileName && doc.fileUrl);

                return (
                  <tr
                    key={doc.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/10"
                  >
                    <td className="px-3 py-2 align-middle">
                      {readOnly ? (
                        <span className="font-medium text-foreground break-all">
                          {documentName || "—"}
                        </span>
                      ) : (
                        <Input
                          value={documentName}
                          onChange={(e) =>
                            onChange?.(
                              documents.map((d) =>
                                d.id === doc.id
                                  ? { ...d, documentName: e.target.value }
                                  : d,
                              ),
                            )
                          }
                          placeholder="e.g. Aadhaar Card"
                          className="h-8 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {hasFile ? (
                        <button
                          type="button"
                          className="text-brand-600 hover:underline text-left truncate max-w-[280px] block"
                          onClick={() => void openFile(doc)}
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
                    <td className="px-3 py-2 align-middle text-muted-foreground">
                      {doc.mimeType || "—"}
                    </td>
                    <td className="px-3 py-2 align-middle text-muted-foreground">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {hasFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => void openFile(doc)}
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
