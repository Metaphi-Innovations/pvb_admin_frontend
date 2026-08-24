import { roundMoney } from "@/lib/accounts/money-format";
import type {
  CreateJournalVoucherPayload,
  JournalAttachmentMeta,
  JournalPendingFile,
  JournalVoucherDetail,
  JournalVoucherStatus,
  UpdateJournalVoucherPayload,
} from "@/types/journal-voucher.types";
import { validateJournalAttachmentFiles } from "./journal-attachment-formdata";

export const JOURNAL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isJournalUuid(value: unknown): value is string {
  return typeof value === "string" && JOURNAL_UUID_RE.test(value);
}

export function toMoneyNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? roundMoney(n) : 0;
}

export function sanitizeNonNegativeMoneyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot < 0) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

export function formatDateInput(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatSrNo(sr: unknown): string {
  if (sr == null) return "—";
  return String(sr);
}

export function snapshotLabel(
  snapshot: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!snapshot) return "";
  for (const key of keys) {
    const v = snapshot[key];
    if (v != null && String(v).trim()) return String(v);
  }
  return "";
}

export function ledgerDisplayName(input: {
  ledger?: {
    ledger_name?: string | null;
    ledger_code?: string | null;
  } | null;
  snapshot?: Record<string, unknown> | null;
}): string {
  return (
    input.ledger?.ledger_name ||
    snapshotLabel(input.snapshot, "ledger_name", "ledgerName") ||
    "—"
  );
}

export function ledgerDisplayCode(input: {
  ledger?: {
    ledger_code?: string | null;
  } | null;
  snapshot?: Record<string, unknown> | null;
}): string {
  return (
    input.ledger?.ledger_code ||
    snapshotLabel(input.snapshot, "ledger_code", "ledgerCode") ||
    ""
  );
}

/** Backend SOURCE_ENTITY_TYPES.CUSTOMER / SUPPLIER */
export function isPartyLedgerEntity(
  sourceEntityType: string | null | undefined,
): boolean {
  return sourceEntityType === "Customer" || sourceEntityType === "Supplier";
}

export type JournalFormState = {
  voucher_date: string;
  warehouse_id: string;
  reference_number: string;
  debit_ledger_id: string;
  debit_ledger_name: string;
  debit_ledger_code: string;
  debit_source_entity_type: string;
  credit_ledger_id: string;
  credit_ledger_name: string;
  credit_ledger_code: string;
  credit_source_entity_type: string;
  amount: string;
  narration: string;
  persistedAttachments: JournalAttachmentMeta[];
  pendingFiles: JournalPendingFile[];
};

export function emptyJournalForm(): JournalFormState {
  return {
    voucher_date: todayDateInput(),
    warehouse_id: "",
    reference_number: "",
    debit_ledger_id: "",
    debit_ledger_name: "",
    debit_ledger_code: "",
    debit_source_entity_type: "",
    credit_ledger_id: "",
    credit_ledger_name: "",
    credit_ledger_code: "",
    credit_source_entity_type: "",
    amount: "",
    narration: "",
    persistedAttachments: [],
    pendingFiles: [],
  };
}

function normalizePersistedAttachments(value: unknown): JournalAttachmentMeta[] {
  if (!Array.isArray(value)) return [];
  const result: JournalAttachmentMeta[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const file_url = typeof row.file_url === "string" ? row.file_url.trim() : "";
    const file_name = typeof row.file_name === "string" ? row.file_name.trim() : "";
    if (!file_url || !file_name) continue;
    if (file_url.startsWith("blob:") || file_url.startsWith("data:")) continue;
    result.push({
      file_name,
      file_url,
      file_type: typeof row.file_type === "string" ? row.file_type : null,
      uploaded_at: typeof row.uploaded_at === "string" ? row.uploaded_at : null,
      uploaded_by: typeof row.uploaded_by === "string" ? row.uploaded_by : null,
    });
  }
  return result;
}

export function mapDetailToForm(detail: JournalVoucherDetail): JournalFormState {
  const base = emptyJournalForm();
  return {
    ...base,
    voucher_date: formatDateInput(detail.voucher_date) || todayDateInput(),
    warehouse_id: detail.warehouse_id || "",
    reference_number: detail.reference_number || "",
    debit_ledger_id: detail.debit_ledger_id || "",
    debit_ledger_name: ledgerDisplayName({
      ledger: detail.debit_ledger,
      snapshot: detail.debit_ledger_snapshot,
    }),
    debit_ledger_code: ledgerDisplayCode({
      ledger: detail.debit_ledger,
      snapshot: detail.debit_ledger_snapshot,
    }),
    debit_source_entity_type: detail.debit_ledger?.source_entity_type || "",
    credit_ledger_id: detail.credit_ledger_id || "",
    credit_ledger_name: ledgerDisplayName({
      ledger: detail.credit_ledger,
      snapshot: detail.credit_ledger_snapshot,
    }),
    credit_ledger_code: ledgerDisplayCode({
      ledger: detail.credit_ledger,
      snapshot: detail.credit_ledger_snapshot,
    }),
    credit_source_entity_type: detail.credit_ledger?.source_entity_type || "",
    amount: String(toMoneyNumber(detail.amount) || ""),
    narration: detail.narration || "",
    persistedAttachments: normalizePersistedAttachments(detail.attachments),
    pendingFiles: [],
  };
}

export function computeJournalPreview(form: JournalFormState) {
  const amount = toMoneyNumber(form.amount);
  const debitName = form.debit_ledger_name || "Debit Account";
  const creditName = form.credit_ledger_name || "Credit Account";
  return {
    amount,
    debitName,
    creditName,
    totalDebit: amount,
    totalCredit: amount,
    difference: 0,
  };
}

export function validateJournalForm(form: JournalFormState): string | null {
  if (!form.voucher_date) return "Voucher date is required.";
  if (!form.warehouse_id) return "Warehouse / Branch is required.";
  if (!form.debit_ledger_id) return "Debit Account is required.";
  if (!form.credit_ledger_id) return "Credit Account is required.";
  if (form.debit_ledger_id === form.credit_ledger_id) {
    return "Debit Account and Credit Account must be different.";
  }
  const amount = toMoneyNumber(form.amount);
  if (amount <= 0) return "Amount must be greater than zero.";
  if (!form.narration.trim()) return "Narration is required.";

  const pendingFileObjs = form.pendingFiles.map((p) => p.file);
  const attachErr = validateJournalAttachmentFiles(
    pendingFileObjs,
    form.persistedAttachments.length,
  );
  if (attachErr) return attachErr;

  return null;
}

export function buildCreatePayload(form: JournalFormState): CreateJournalVoucherPayload {
  return {
    voucher_date: form.voucher_date,
    warehouse_id: form.warehouse_id,
    debit_ledger_id: form.debit_ledger_id,
    credit_ledger_id: form.credit_ledger_id,
    amount: toMoneyNumber(form.amount),
    reference_number: form.reference_number.trim() || null,
    narration: form.narration.trim(),
  };
}

export function buildUpdatePayload(form: JournalFormState): UpdateJournalVoucherPayload {
  return {
    ...buildCreatePayload(form),
    existing_attachments: form.persistedAttachments,
  };
}

export function isDraftEditable(status?: JournalVoucherStatus | null): boolean {
  return !status || status === "DRAFT" || status === "REJECTED";
}

export function canCancelStatus(status?: JournalVoucherStatus | null): boolean {
  return (
    status === "DRAFT" ||
    status === "PENDING_APPROVAL" ||
    status === "APPROVED" ||
    status === "REJECTED"
  );
}

export function canPostStatus(
  status: JournalVoucherStatus | null | undefined,
  approvalRequired: boolean,
): boolean {
  if (!status) return false;
  if (status === "PENDING_APPROVAL") return false;
  if (status === "APPROVED") return true;
  if (!approvalRequired && status === "DRAFT") return true;
  return false;
}

export const JOURNAL_LIST_PATH = "/accounts/vouchers?tab=journal";

export function journalViewPath(id: string) {
  return `/accounts/vouchers/journal/${id}`;
}

export function journalEditPath(id: string) {
  return `/accounts/vouchers/journal/${id}/edit`;
}
