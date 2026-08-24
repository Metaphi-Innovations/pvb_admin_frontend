import type {
  CreatePaymentVoucherPayload,
  PaymentAttachmentMeta,
  PaymentPendingFile,
  UpdatePaymentVoucherPayload,
} from "@/types/payment-voucher.types";

/** Aligns with backend multer payment_voucher limits (same as Receipt). */
export const PAYMENT_ATTACHMENT_MAX_FILES = 20;
export const PAYMENT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const PAYMENT_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.csv";

const PAYMENT_ATTACHMENT_EXTENSIONS = new Set([
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

export function paymentFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx).toLowerCase();
}

export function validatePaymentAttachmentFiles(
  files: File[],
  currentTotalCount: number,
): string | null {
  if (files.length === 0) return null;
  if (currentTotalCount + files.length > PAYMENT_ATTACHMENT_MAX_FILES) {
    return `Too many files. Maximum ${PAYMENT_ATTACHMENT_MAX_FILES} attachments allowed.`;
  }
  for (const file of files) {
    if (file.size > PAYMENT_ATTACHMENT_MAX_BYTES) {
      return `File "${file.name}" exceeds the 10MB limit.`;
    }
    const ext = paymentFileExtension(file.name);
    if (!PAYMENT_ATTACHMENT_EXTENSIONS.has(ext)) {
      return `Unsupported file type for "${file.name}". Allowed: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, CSV.`;
    }
  }
  return null;
}

export function createPaymentPendingFiles(files: File[]): PaymentPendingFile[] {
  return files.map((file) => ({
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
}

export function revokePaymentPendingPreviews(
  pending: PaymentPendingFile | PaymentPendingFile[],
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
 * Build multipart body for Payment create/update.
 * Nested allocations/adjustments/existing_attachments are JSON strings.
 * New files are appended as `attachments` File parts (never blob URL metadata).
 */
export function buildPaymentMultipartFormData(
  payload: CreatePaymentVoucherPayload | UpdatePaymentVoucherPayload,
  options?: {
    pendingFiles?: File[];
    existingAttachments?: PaymentAttachmentMeta[] | null;
    isUpdate?: boolean;
  },
): FormData {
  const formData = new FormData();
  const isUpdate = options?.isUpdate === true;

  appendScalar(formData, "voucher_date", payload.voucher_date);
  appendScalar(formData, "warehouse_id", payload.warehouse_id);
  appendScalar(formData, "party_kind", payload.party_kind);
  appendScalar(formData, "customer_id", payload.customer_id);
  appendScalar(formData, "supplier_id", payload.supplier_id);
  appendScalar(formData, "other_ledger_id", payload.other_ledger_id);
  appendScalar(formData, "bank_account_id", payload.bank_account_id);
  appendScalar(formData, "cash_bank_ledger_id", payload.cash_bank_ledger_id);
  appendScalar(formData, "transaction_mode", payload.transaction_mode);
  appendScalar(formData, "cheque_number", payload.cheque_number);
  appendScalar(formData, "cheque_date", payload.cheque_date);
  appendScalar(formData, "utr_number", payload.utr_number);
  appendScalar(formData, "transaction_reference", payload.transaction_reference);
  appendScalar(formData, "instrument_date", payload.instrument_date);
  appendScalar(formData, "transaction_date", payload.transaction_date);
  appendScalar(formData, "gross_party_amount", payload.gross_party_amount);
  appendScalar(formData, "advance_amount", payload.advance_amount ?? 0);
  appendScalar(formData, "narration", payload.narration);
  appendScalar(formData, "remarks", payload.remarks);

  formData.append("allocations", JSON.stringify(payload.allocations ?? []));
  formData.append("adjustments", JSON.stringify(payload.adjustments ?? []));

  if (isUpdate) {
    const retained =
      options?.existingAttachments ??
      (payload as UpdatePaymentVoucherPayload).existing_attachments ??
      [];
    formData.append("existing_attachments", JSON.stringify(retained));
  }

  const files = options?.pendingFiles ?? [];
  for (const file of files) {
    formData.append("attachments", file);
  }

  return formData;
}

export function formatPaymentFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
