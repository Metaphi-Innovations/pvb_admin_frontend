"use client";

import React, { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  Plus,
  Upload,
  Trash2,
  Eye,
  Download,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  type EmployeeDocument,
  type EmployeeDocumentStatus,
  ALL_EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_DOCUMENT_MAX_BYTES,
  EMPLOYEE_DOCUMENT_ACCEPT,
  DOCUMENT_STATUS_STYLES,
  newDocumentId,
  computeProfileCompletion,
} from "../employee-documents";
import type { Employee } from "../employee-data";
import { todayStr } from "../employee-data";

const DOC_STATUS_OPTIONS: { value: EmployeeDocumentStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "uploaded", label: "Uploaded" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

function DocStatusBadge({ status }: { status: EmployeeDocumentStatus }) {
  const style = DOCUMENT_STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize"
      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
    >
      {status}
    </span>
  );
}

export function EmployeeDocumentsSection({
  documents,
  onChange,
  readOnly = false,
  employee,
}: {
  documents: EmployeeDocument[];
  onChange?: (docs: EmployeeDocument[]) => void;
  readOnly?: boolean;
  employee?: Partial<Employee>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeOptions = useMemo(
    () => ALL_EMPLOYEE_DOCUMENT_TYPES.map((t) => ({ value: t, label: t })),
    [],
  );

  const profile = useMemo(
    () => (employee ? computeProfileCompletion({ ...employee, documents }) : null),
    [employee, documents],
  );

  const patch = (id: string, partial: Partial<EmployeeDocument>) => {
    if (!onChange) return;
    onChange(documents.map((d) => (d.id === id ? { ...d, ...partial } : d)));
  };

  const setDocStatus = (id: string, status: EmployeeDocumentStatus) => {
    const now = todayStr();
    if (status === "verified") {
      patch(id, { status, verifiedBy: "Admin", verifiedDate: now, remarks: "" });
    } else if (status === "rejected") {
      patch(id, { status, verifiedBy: "Admin", verifiedDate: now });
    } else {
      patch(id, { status, verifiedBy: undefined, verifiedDate: undefined, remarks: undefined });
    }
  };

  const addRow = () => {
    if (!onChange) return;
    onChange([
      ...documents,
      {
        id: newDocumentId(),
        documentType: "",
        status: "pending",
        uploadedBy: "Admin",
        uploadedOn: todayStr(),
      },
    ]);
  };

  const removeRow = (id: string) => {
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
        status: "uploaded",
        uploadedBy: "Admin",
        uploadedOn: todayStr(),
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

  const downloadFile = (doc: EmployeeDocument) => {
    if (!doc.fileUrl || !doc.fileName) return;
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.click();
  };

  return (
    <div className="space-y-4">
      {profile && (
        <div className="rounded-lg border border-border/60 bg-[#F8FAFC] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Profile Completion</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Personal: {profile.personalComplete ? "Complete" : "Incomplete"} · Employment:{" "}
                {profile.employmentComplete ? "Complete" : "Incomplete"} · Documents:{" "}
                {profile.documentsUploaded}/{profile.documentsTotal} uploaded
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#E57A1F] tabular-nums">{profile.percent}%</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#E57A1F] transition-all"
              style={{ width: `${profile.percent}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
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

      <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
        <table className="w-full text-xs min-w-[1100px]">
          <thead>
            <tr className="text-left border-b bg-[#F8FAFC] text-[#64748B]">
              <th className="px-3 py-2 font-semibold">Document Type</th>
              <th className="px-3 py-2 font-semibold">Document No.</th>
              <th className="px-3 py-2 font-semibold">Issue / Expiry</th>
              <th className="px-3 py-2 font-semibold">File Name</th>
              <th className="px-3 py-2 font-semibold">Uploaded</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Verification</th>
              <th className="px-3 py-2 text-right font-semibold w-44">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[#64748B]">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No documents uploaded yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                  <td className="px-3 py-2 align-top min-w-[160px]">
                    {readOnly ? (
                      <span className="font-medium text-[#0F172A]">{doc.documentType || "—"}</span>
                    ) : (
                      <AutocompleteSelect
                        options={typeOptions}
                        value={doc.documentType}
                        onChange={(v) => patch(doc.id, { documentType: v })}
                        placeholder="Select type…"
                        searchPlaceholder="Search document type…"
                        className="h-8 text-xs"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      doc.documentNumber || "—"
                    ) : (
                      <Input
                        value={doc.documentNumber || ""}
                        onChange={(e) => patch(doc.id, { documentNumber: e.target.value })}
                        placeholder="Optional"
                        className="h-8 text-xs"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span className="text-[11px] text-[#64748B]">
                        {[doc.issueDate, doc.expiryDate].filter(Boolean).join(" → ") || "—"}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Input
                          type="date"
                          value={doc.issueDate || ""}
                          onChange={(e) => patch(doc.id, { issueDate: e.target.value })}
                          className="h-8 text-xs"
                        />
                        <Input
                          type="date"
                          value={doc.expiryDate || ""}
                          onChange={(e) => patch(doc.id, { expiryDate: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {doc.fileName ? (
                      <button
                        type="button"
                        className="text-[#E57A1F] hover:underline text-left truncate max-w-[140px] block"
                        onClick={() => openFile(doc)}
                      >
                        {doc.fileName}
                      </button>
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-[#64748B]">
                    <p>{doc.uploadedBy}</p>
                    <p className="font-mono">{doc.uploadedOn}</p>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <DocStatusBadge status={doc.status} />
                    ) : (
                      <AutocompleteSelect
                        options={DOC_STATUS_OPTIONS}
                        value={doc.status}
                        onChange={(v) => setDocStatus(doc.id, v as EmployeeDocumentStatus)}
                        placeholder="Status…"
                        className="h-8 text-xs min-w-[110px]"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top min-w-[140px]">
                    {readOnly ? (
                      <div className="text-[11px] text-[#64748B] space-y-0.5">
                        {doc.verifiedBy && <p>By: {doc.verifiedBy}</p>}
                        {doc.verifiedDate && <p className="font-mono">{doc.verifiedDate}</p>}
                        {doc.remarks && <p className="text-[#0F172A]">{doc.remarks}</p>}
                        {!doc.verifiedBy && !doc.remarks && "—"}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {(doc.status === "verified" || doc.status === "rejected") && (
                          <>
                            <Input
                              value={doc.verifiedBy || "Admin"}
                              onChange={(e) => patch(doc.id, { verifiedBy: e.target.value })}
                              placeholder="Verified by"
                              className="h-7 text-[10px]"
                            />
                            <Input
                              type="date"
                              value={doc.verifiedDate || todayStr()}
                              onChange={(e) => patch(doc.id, { verifiedDate: e.target.value })}
                              className="h-7 text-[10px]"
                            />
                          </>
                        )}
                        <Input
                          value={doc.remarks || ""}
                          onChange={(e) => patch(doc.id, { remarks: e.target.value })}
                          placeholder="Remarks (optional)"
                          className="h-7 text-[10px]"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {doc.fileUrl && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => openFile(doc)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => downloadFile(doc)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </>
                      )}
                      {!readOnly && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => pickFile(doc.id)}
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            {doc.fileName ? "Replace" : "Upload"}
                          </Button>
                          <button
                            type="button"
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                            onClick={() => removeRow(doc.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
          onClick={addRow}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Document
        </Button>
      )}
    </div>
  );
}
