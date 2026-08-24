import type {
  CreateJournalVoucherPayload,
  JournalAttachmentMeta,
  JournalPendingFile,
  UpdateJournalVoucherPayload,
} from "@/types/journal-voucher.types";

/** Aligns with backend multer journal_voucher limits. */
export const JOURNAL_ATTACHMENT_MAX_FILES = 20;
export const JOURNAL_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const JOURNAL_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.csv";

const JOURNAL_ATTACHMENT_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
]);

export function journalFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx).toLowerCase();
}

export function validateJournalAttachmentFiles(
  files: File[],
  currentTotalCount: number,
): string | null {
  if (files.length === 0) return null;
  if (currentTotalCount + files.length > JOURNAL_ATTACHMENT_MAX_FILES) {
    return `Too many files. Maximum ${JOURNAL_ATTACHMENT_MAX_FILES} attachments allowed.`;
  }
  for (const file of files) {
    if (file.size > JOURNAL_ATTACHMENT_MAX_BYTES) {
      return `File "${file.name}" exceeds the 10MB limit.`;
    }
    const ext = journalFileExtension(file.name);
    if (!JOURNAL_ATTACHMENT_EXTENSIONS.has(ext)) {
      return `Unsupported file type for "${file.name}". Allowed: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, CSV.`;
    }
  }
  return null;
}

export function createJournalPendingFiles(files: File[]): JournalPendingFile[] {
  return files.map((file) => ({
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
}

export function revokeJournalPendingPreviews(
  pending: JournalPendingFile | JournalPendingFile[],
): void {
  const list = Array.isArray(pending) ? pending : [pending];
  for (const item of list) {
    if (item.previewUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        /* ignore */
      }
    }
  }
}

function appendScalar(
  formData: FormData,
  key: string,
  value: string | number | boolean | null | undefined,
): void {
  if (value === undefined) return;
  if (value === null) {
    formData.append(key, "");
    return;
  }
  formData.append(key, String(value));
}

/**
 * Build multipart body for Journal create/update.
 * existing_attachments is a JSON string on update.
 * New files are appended as `attachments` File parts (never blob URL metadata).
 */
export function buildJournalMultipartFormData(
  payload: CreateJournalVoucherPayload | UpdateJournalVoucherPayload,
  options?: {
    pendingFiles?: File[];
    existingAttachments?: JournalAttachmentMeta[] | null;
    isUpdate?: boolean;
  },
): FormData {
  const formData = new FormData();
  const isUpdate = options?.isUpdate === true;

  appendScalar(formData, "voucher_date", payload.voucher_date);
  appendScalar(formData, "warehouse_id", payload.warehouse_id);
  appendScalar(formData, "debit_ledger_id", payload.debit_ledger_id);
  appendScalar(formData, "credit_ledger_id", payload.credit_ledger_id);
  appendScalar(formData, "amount", payload.amount);
  appendScalar(formData, "reference_number", payload.reference_number);
  appendScalar(formData, "narration", payload.narration);

  if (isUpdate) {
    const retained =
      options?.existingAttachments ??
      (payload as UpdateJournalVoucherPayload).existing_attachments ??
      [];
    formData.append("existing_attachments", JSON.stringify(retained));
  }

  const files = options?.pendingFiles ?? [];
  for (const file of files) {
    formData.append("attachments", file);
  }

  return formData;
}

export function formatJournalFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
