"use client";

import React, { useRef, useState } from "react";
import {
  Eye,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import {
  getDocumentTypeSelectOptions,
  getOnboardingDocumentChecklist,
} from "@/app/(app)/hr/settings/onboarding-data";
import { formatDateDisplay } from "../employee-display";
import {
  newProfileRecordId,
  type EmployeeDocumentRecord,
  type HrEmployee,
} from "../employee-master-data";
import {
  EmpField,
  EmpFormActions,
  EmpFormPanel,
  EmpInput,
  EmpSection,
  EmptyProfileState,
  EMP_HELPER,
  EMP_LABEL,
  EMP_SELECT_CONTENT,
  EMP_SELECT_ITEM,
  EMP_SELECT_TRIGGER,
  EMP_TEXT,
} from "./employee-form-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** @deprecated Use getDocumentTypeSelectOptions() from onboarding-data (Document Requirement Master). */
export const DOCUMENT_UI_TYPE_OPTIONS = [
  "Aadhaar Card",
  "PAN Card",
  "Bank Proof",
  "Passport",
  "Driving Licence",
  "Education Certificate",
  "Experience Letter",
  "Relieving Letter",
  "Address Proof",
  "Employee Photo",
  "Other",
] as const;

const ACCEPTED_EXT = [".pdf", ".jpg", ".jpeg", ".png"] as const;
const ACCEPTED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
const MAX_BYTES = 5 * 1024 * 1024;

interface DocDemoRecord {
  id: string;
  documentType: string;
  documentName: string;
  documentNumber: string;
  expiryDate: string;
  fileName: string;
  fileSizeLabel: string;
  remarks: string;
}

interface DocDraft extends DocDemoRecord {
  fileError: string | null;
}

function docsFromEmployee(employee: HrEmployee): DocDemoRecord[] {
  return (employee.documents ?? []).map((d) => ({
    id: d.id,
    documentType: d.documentType,
    documentName: d.documentName || d.fileName || "Document",
    documentNumber: d.documentNumber,
    expiryDate: d.expiryDate,
    fileName: d.fileName,
    fileSizeLabel: "—",
    remarks: d.comment ?? "",
  }));
}

function toEmployeeDocuments(list: DocDemoRecord[]): EmployeeDocumentRecord[] {
  return list.map((d) => ({
    id: d.id,
    documentType: d.documentType,
    documentName: d.documentName,
    documentNumber: d.documentNumber,
    fileName: d.fileName,
    uploadedDate: "",
    expiryDate: d.expiryDate,
    verificationStatus: "missing",
    verifiedBy: "",
    verifiedDate: "",
    comment: d.remarks,
  }));
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedFile(file: File): { ok: true } | { ok: false; message: string } {
  const name = file.name.toLowerCase();
  const extOk = ACCEPTED_EXT.some((ext) => name.endsWith(ext));
  const mimeOk =
    !file.type ||
    ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number]);
  if (!extOk || !mimeOk) {
    return { ok: false, message: "Only PDF, JPG and PNG files are allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "File size must be 5 MB or less." };
  }
  return { ok: true };
}

function emptyDraft(): DocDraft {
  return {
    id: newProfileRecordId(),
    documentType: "",
    documentName: "",
    documentNumber: "",
    expiryDate: "",
    fileName: "",
    fileSizeLabel: "",
    remarks: "",
    fileError: null,
  };
}

function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowEmpty,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  return (
    <Select
      value={value || (allowEmpty ? "__none__" : undefined)}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
    >
      <SelectTrigger className={cn(EMP_SELECT_TRIGGER, "w-full")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={EMP_SELECT_CONTENT} position="popper">
        {allowEmpty && (
          <SelectItem value="__none__" className={EMP_SELECT_ITEM}>
            {placeholder}
          </SelectItem>
        )}
        {options.map((o) => (
          <SelectItem key={o} value={o} className={EMP_SELECT_ITEM}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function IconAction({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
            destructive
              ? "text-muted-foreground hover:text-red-600 hover:bg-red-50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function FileUploadDropzone({
  fileName,
  fileSizeLabel,
  error,
  onPick,
  onClear,
}: {
  fileName: string;
  fileSizeLabel: string;
  error: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const applyFile = (file: File | undefined) => {
    if (!file) return;
    onPick(file);
  };

  if (fileName) {
    return (
      <div className="rounded-lg border border-border bg-white px-3 py-2.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(EMP_TEXT, "font-medium text-foreground truncate")}>{fileName}</p>
          {fileSizeLabel && fileSizeLabel !== "—" && (
            <p className={cn(EMP_HELPER, "text-muted-foreground")}>{fileSizeLabel}</p>
          )}
        </div>
        <button
          type="button"
          className="h-8 px-2.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-muted/40 inline-flex items-center gap-1"
          onClick={onClear}
        >
          <X className="w-3.5 h-3.5" /> Remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "rounded-lg border border-dashed px-4 py-5 text-center transition-colors bg-white",
          dragging ? "border-brand-500 bg-brand-50/40" : "border-border",
          error && "border-red-400",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          applyFile(e.dataTransfer.files?.[0]);
        }}
      >
        <Upload className="w-5 h-5 text-brand-600 mx-auto mb-2" />
        <p className={cn(EMP_TEXT, "font-semibold text-foreground")}>Upload Document</p>
        <p className={cn(EMP_HELPER, "text-muted-foreground mt-0.5")}>
          Drag &amp; drop file here
        </p>
        <p className={cn(EMP_HELPER, "text-muted-foreground my-1.5")}>OR</p>
        <button
          type="button"
          className="h-8 px-3 text-xs font-medium rounded-lg border border-border bg-white hover:bg-muted/40 inline-flex items-center gap-1.5"
          onClick={() => inputRef.current?.click()}
        >
          Browse File
        </button>
        <p className={cn(EMP_HELPER, "text-muted-foreground mt-2.5")}>
          PDF, JPG, PNG · Max file size: 5 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(e) => {
            applyFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className={cn(EMP_HELPER, "text-red-500")}>{error}</p>}
    </div>
  );
}

/**
 * Employee Profile → Documents.
 * Document Type options come from Document Requirement Master.
 * File pick is UI preview only (no upload backend).
 * Records persist on the same employee.documents array used by Onboarding.
 */
export function DocumentsSection({
  employee,
  onSave,
}: {
  employee: HrEmployee;
  onSave: (patch: Partial<HrEmployee>, successMsg?: string) => void;
}) {
  const [list, setList] = useState<DocDemoRecord[]>(() => docsFromEmployee(employee));
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<DocDraft | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    documentType?: string;
    documentName?: string;
  }>({});
  const [viewRec, setViewRec] = useState<DocDemoRecord | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [typeOptions, setTypeOptions] = useState<string[]>(() => getDocumentTypeSelectOptions());

  React.useEffect(() => {
    setList(docsFromEmployee(employee));
  }, [employee.id, employee.documents]);

  const onboardingChecklist = React.useMemo(
    () => getOnboardingDocumentChecklist(employee.documents),
    [employee.documents],
  );

  const persistList = (next: DocDemoRecord[], successMsg?: string) => {
    setList(next);
    onSave({ documents: toEmployeeDocuments(next) }, successMsg);
  };

  const startAdd = () => {
    setTypeOptions(getDocumentTypeSelectOptions());
    setDraft(emptyDraft());
    setIsEdit(false);
    setFieldErrors({});
    setFormOpen(true);
  };

  const startEdit = (rec: DocDemoRecord) => {
    setTypeOptions(getDocumentTypeSelectOptions(rec.documentType));
    setDraft({ ...rec, fileError: null });
    setIsEdit(true);
    setFieldErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setDraft(null);
    setFieldErrors({});
  };

  const applyPickedFile = (file: File) => {
    if (!draft) return;
    const check = isAcceptedFile(file);
    if (!check.ok) {
      setDraft({ ...draft, fileError: check.message, fileName: "", fileSizeLabel: "" });
      return;
    }
    setDraft({
      ...draft,
      fileName: file.name,
      fileSizeLabel: formatFileSize(file.size),
      fileError: null,
    });
  };

  const saveDocument = () => {
    if (!draft) return;
    const errors: { documentType?: string; documentName?: string } = {};
    if (!draft.documentType.trim()) errors.documentType = "Document type is required.";
    if (!draft.documentName.trim()) errors.documentName = "Document name is required.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const next: DocDemoRecord = {
      id: draft.id,
      documentType: draft.documentType.trim(),
      documentName: draft.documentName.trim(),
      documentNumber: draft.documentNumber.trim(),
      expiryDate: draft.expiryDate,
      fileName: draft.fileName,
      fileSizeLabel: draft.fileSizeLabel || "—",
      remarks: draft.remarks.trim(),
    };

    const nextList = list.some((r) => r.id === next.id)
      ? list.map((r) => (r.id === next.id ? next : r))
      : [...list, next];
    persistList(nextList, isEdit ? "Document updated successfully." : "Document added successfully.");
    closeForm();
  };

  const confirmRemove = () => {
    if (!removeId) return;
    persistList(
      list.filter((r) => r.id !== removeId),
      "Document removed successfully.",
    );
    setRemoveId(null);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-[16px] font-semibold leading-[22px] text-foreground">Documents</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Employee documents and supporting files.
            </p>
            <p className={cn(EMP_HELPER, "text-muted-foreground mt-1")}>
              File upload is currently shown for UI preview only.
            </p>
          </div>
          {!formOpen && (
            <button
              type="button"
              onClick={startAdd}
              className="h-8 px-3 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Document
            </button>
          )}
        </div>

        {!formOpen && onboardingChecklist.length > 0 && (
          <div className="mb-4 border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-foreground">Onboarding document checklist</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                From Document Requirements settings. Same employee documents as below.
              </p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-left">
                  <th className="px-3 py-2 font-semibold">Document Type</th>
                  <th className="px-3 py-2 font-semibold w-28">Requirement</th>
                  <th className="px-3 py-2 font-semibold w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {onboardingChecklist.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
                          row.mandatory
                            ? "bg-brand-50 text-brand-700 border border-brand-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200",
                        )}
                      >
                        {row.requirementLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          row.received ? "text-emerald-700" : "text-amber-700",
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {formOpen && draft && (
          <EmpFormPanel className="mb-4">
            <EmpSection title={isEdit ? "Edit Document" : "Add Document"}>
              <EmpField label="Document Type" required width="medium" error={fieldErrors.documentType}>
                <SimpleSelect
                  value={draft.documentType}
                  onChange={(v) => setDraft({ ...draft, documentType: v })}
                  options={typeOptions}
                  allowEmpty
                  placeholder="Select type…"
                />
              </EmpField>
              <EmpField label="Document Name" required width="wide" error={fieldErrors.documentName}>
                <EmpInput
                  value={draft.documentName}
                  onChange={(e) => setDraft({ ...draft, documentName: e.target.value })}
                  placeholder="e.g. Aadhaar Copy"
                />
              </EmpField>
              <EmpField label="Document Number" width="medium">
                <EmpInput
                  value={draft.documentNumber}
                  onChange={(e) => setDraft({ ...draft, documentNumber: e.target.value })}
                  placeholder="Optional"
                />
              </EmpField>
              <EmpField label="Expiry Date" width="small">
                <HrDateInput
                  value={draft.expiryDate}
                  onChange={(v) => setDraft({ ...draft, expiryDate: v })}
                  aria-label="Expiry Date"
                />
              </EmpField>
              <EmpField label="File Upload" width="medium">
                <FileUploadDropzone
                  fileName={draft.fileName}
                  fileSizeLabel={draft.fileSizeLabel}
                  error={draft.fileError}
                  onPick={applyPickedFile}
                  onClear={() =>
                    setDraft({
                      ...draft,
                      fileName: "",
                      fileSizeLabel: "",
                      fileError: null,
                    })
                  }
                />
              </EmpField>
              <EmpField label="Remarks" width="full">
                <EmpInput
                  value={draft.remarks}
                  onChange={(e) => setDraft({ ...draft, remarks: e.target.value })}
                  placeholder="Optional remarks"
                />
              </EmpField>
            </EmpSection>
            <EmpFormActions>
              <button
                type="button"
                className="h-8 px-3 text-xs border rounded-lg"
                onClick={closeForm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-8 px-3 text-xs rounded-lg bg-brand-600 hover:bg-brand-700 text-white"
                onClick={saveDocument}
              >
                {isEdit ? "Update" : "Save Document"}
              </button>
            </EmpFormActions>
          </EmpFormPanel>
        )}

        {!formOpen && list.length === 0 ? (
          <EmptyProfileState message="No employee documents added yet." />
        ) : list.length > 0 ? (
          <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="px-3 py-2.5 font-semibold">Document Type</th>
                    <th className="px-3 py-2.5 font-semibold">Document Name</th>
                    <th className="px-3 py-2.5 font-semibold">Document Number</th>
                    <th className="px-3 py-2.5 font-semibold">Expiry Date</th>
                    <th className="px-3 py-2.5 font-semibold">File</th>
                    <th className="px-3 py-2.5 font-semibold w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((doc) => (
                    <tr key={doc.id} className="border-b border-border/60 hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">
                        {doc.documentType || "—"}
                      </td>
                      <td className="px-3 py-2">{doc.documentName || "—"}</td>
                      <td className="px-3 py-2 font-mono text-brand-700">
                        {doc.documentNumber || "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDateDisplay(doc.expiryDate)}
                      </td>
                      <td className="px-3 py-2">
                        {doc.fileName ? (
                          <span className="inline-flex items-center gap-1.5 min-w-0 max-w-[160px]">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-0.5">
                          <IconAction
                            label="View Document"
                            onClick={() => setViewRec(doc)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </IconAction>
                          <IconAction
                            label="Edit Document"
                            onClick={() => startEdit(doc)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </IconAction>
                          <IconAction
                            label="Delete Document"
                            destructive
                            onClick={() => setRemoveId(doc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconAction>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-border bg-muted/20">
              <p className={cn(EMP_HELPER, "text-muted-foreground")}>
                Showing{" "}
                <span className="font-medium text-foreground">{list.length}</span> of{" "}
                <span className="font-medium text-foreground">{list.length}</span> records
              </p>
            </div>
          </div>
        ) : null}

        <Dialog open={!!viewRec} onOpenChange={(o) => !o && setViewRec(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">View Document</DialogTitle>
              <DialogDescription className="text-xs">
                Document details for UI preview. File storage is not connected.
              </DialogDescription>
            </DialogHeader>
            {viewRec && (
              <div className="space-y-2 text-xs pt-1">
                {(
                  [
                    ["Document Type", viewRec.documentType],
                    ["Document Name", viewRec.documentName],
                    ["Document Number", viewRec.documentNumber || "—"],
                    ["Expiry Date", formatDateDisplay(viewRec.expiryDate)],
                    ["File", viewRec.fileName || "—"],
                    ["Remarks", viewRec.remarks || "—"],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className={cn(EMP_LABEL, "text-muted-foreground")}>{label}</span>
                    <span
                      className={cn(
                        EMP_TEXT,
                        "text-foreground text-right truncate max-w-[180px]",
                      )}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Delete document?</DialogTitle>
              <DialogDescription className="text-xs">
                This will remove this document record.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="h-8 px-3 text-xs border rounded-lg"
                onClick={() => setRemoveId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-8 px-3 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmRemove}
              >
                Delete
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
