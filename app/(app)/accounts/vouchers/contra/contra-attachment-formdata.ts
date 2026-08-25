import type {
  CreateContraVoucherPayload,
  ContraAttachmentMeta,
  ContraPendingFile,
  UpdateContraVoucherPayload,
} from "@/types/contra-voucher.types";

/** Aligns with backend multer contra_voucher limits. */
export const CONTRA_ATTACHMENT_MAX_FILES = 20;
export const CONTRA_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const CONTRA_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.csv";

const CONTRA_ATTACHMENT_EXTENSIONS = new Set([
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

export function contraFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx).toLowerCase();
}

export function validateContraAttachmentFiles(
  files: File[],
  currentTotalCount: number,
): string | null {
  if (files.length === 0) return null;
  if (currentTotalCount + files.length > CONTRA_ATTACHMENT_MAX_FILES) {
    return `Too many files. Maximum ${CONTRA_ATTACHMENT_MAX_FILES} attachments allowed.`;
  }
  for (const file of files) {
    if (file.size > CONTRA_ATTACHMENT_MAX_BYTES) {
      return `File "${file.name}" exceeds the 10MB limit.`;
    }
    const ext = contraFileExtension(file.name);
    if (!CONTRA_ATTACHMENT_EXTENSIONS.has(ext)) {
      return `Unsupported file type for "${file.name}". Allowed: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, CSV.`;
    }
  }
  return null;
}

export function createContraPendingFiles(files: File[]): ContraPendingFile[] {
  return files.map((file) => ({
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
}

export function revokeContraPendingPreviews(
  pending: ContraPendingFile | ContraPendingFile[],
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
 * Build multipart body for Contra create/update.
 * existing_attachments is a JSON string on update.
 * New files are appended as `attachments` File parts (never blob URL metadata).
 */
export function buildContraMultipartFormData(
  payload: CreateContraVoucherPayload | UpdateContraVoucherPayload,
  options?: {
    pendingFiles?: File[];
    existingAttachments?: ContraAttachmentMeta[] | null;
    isUpdate?: boolean;
  },
): FormData {
  const formData = new FormData();
  const isUpdate = options?.isUpdate === true;

  appendScalar(formData, "voucher_date", payload.voucher_date);
  appendScalar(formData, "from_warehouse_id", payload.from_warehouse_id);
  appendScalar(formData, "to_warehouse_id", payload.to_warehouse_id);
  appendScalar(formData, "from_account_type", payload.from_account_type);
  appendScalar(formData, "to_account_type", payload.to_account_type);
  appendScalar(formData, "from_cash_ledger_id", payload.from_cash_ledger_id);
  appendScalar(formData, "to_cash_ledger_id", payload.to_cash_ledger_id);
  appendScalar(formData, "from_bank_account_id", payload.from_bank_account_id);
  appendScalar(formData, "to_bank_account_id", payload.to_bank_account_id);
  appendScalar(formData, "amount", payload.amount);
  appendScalar(formData, "reference_number", payload.reference_number);
  appendScalar(formData, "transaction_mode", payload.transaction_mode);
  appendScalar(formData, "cheque_number", payload.cheque_number);
  appendScalar(formData, "cheque_date", payload.cheque_date);
  appendScalar(formData, "utr_number", payload.utr_number);
  appendScalar(formData, "transaction_reference", payload.transaction_reference);
  appendScalar(formData, "instrument_date", payload.instrument_date);
  appendScalar(formData, "transaction_date", payload.transaction_date);
  appendScalar(formData, "narration", payload.narration);

  if (isUpdate) {
    const retained =
      options?.existingAttachments ??
      (payload as UpdateContraVoucherPayload).existing_attachments ??
      [];
    formData.append("existing_attachments", JSON.stringify(retained));
  }

  const files = options?.pendingFiles ?? [];
  for (const file of files) {
    formData.append("attachments", file);
  }

  return formData;
}

export function formatContraFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
