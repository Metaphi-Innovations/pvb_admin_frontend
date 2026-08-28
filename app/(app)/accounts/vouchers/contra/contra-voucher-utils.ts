import { roundMoney } from "@/lib/accounts/money-format";
import type {
  ContraAccountType,
  ContraAttachmentMeta,
  ContraBankTransactionMode,
  ContraEligibleAccount,
  ContraEligibleBankAccount,
  ContraEligibleCashAccount,
  ContraPendingFile,
  ContraVoucherDetail,
  ContraVoucherStatus,
  CreateContraVoucherPayload,
  UpdateContraVoucherPayload,
} from "@/types/contra-voucher.types";
import { validateContraAttachmentFiles } from "./contra-attachment-formdata";

export const CONTRA_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isContraUuid(value: unknown): value is string {
  return typeof value === "string" && CONTRA_UUID_RE.test(value);
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

export function warehouseDisplayName(input: {
  warehouse?: { warehouse_name?: string | null } | null;
  snapshot?: Record<string, unknown> | null;
}): string {
  return (
    input.warehouse?.warehouse_name ||
    snapshotLabel(input.snapshot, "warehouse_name", "warehouseName", "name") ||
    "—"
  );
}

export function ledgerDisplayName(input: {
  ledger?: { ledger_name?: string | null; ledger_code?: string | null } | null;
  snapshot?: Record<string, unknown> | null;
}): string {
  return (
    input.ledger?.ledger_name ||
    snapshotLabel(input.snapshot, "ledger_name", "ledgerName") ||
    "—"
  );
}

export function bankAccountDisplayName(input: {
  bank?: {
    bank_name?: string | null;
    account_number?: string | null;
    branch_name?: string | null;
  } | null;
  ledger?: { ledger_name?: string | null } | null;
  snapshot?: Record<string, unknown> | null;
}): string {
  const bankName =
    input.bank?.bank_name ||
    snapshotLabel(input.snapshot, "bank_name", "bankName") ||
    input.ledger?.ledger_name ||
    snapshotLabel(input.snapshot, "ledger_name", "ledgerName");
  const acct =
    input.bank?.account_number ||
    snapshotLabel(input.snapshot, "account_number", "accountNumber");
  if (bankName && acct) return `${bankName} · ${acct}`;
  return bankName || acct || "—";
}

export function isCashEligible(
  row: ContraEligibleAccount,
): row is ContraEligibleCashAccount {
  return row.account_type === "CASH";
}

export function isBankEligible(
  row: ContraEligibleAccount,
): row is ContraEligibleBankAccount {
  return row.account_type === "BANK";
}

export function formatEligibleCashLabel(row: ContraEligibleCashAccount): string {
  return row.ledger_name;
}

export function formatEligibleCashSub(row: ContraEligibleCashAccount): string {
  return [row.ledger_code, row.alias_name].filter(Boolean).join(" · ");
}

export function formatEligibleBankLabel(row: ContraEligibleBankAccount): string {
  const name = row.bank_name || row.ledger_name;
  return row.account_number ? `${name} · ${row.account_number}` : name;
}

export function formatEligibleBankSub(row: ContraEligibleBankAccount): string {
  return [row.ledger_name, row.ifsc_code, row.branch_name].filter(Boolean).join(" · ");
}

export function electronicModes(): ContraBankTransactionMode[] {
  return ["NEFT", "RTGS", "IMPS", "UPI", "BANK_TRANSFER"];
}

export type ContraFormState = {
  voucher_date: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  from_account_type: ContraAccountType;
  to_account_type: ContraAccountType;
  from_cash_ledger_id: string;
  from_cash_ledger_name: string;
  from_cash_ledger_code: string;
  to_cash_ledger_id: string;
  to_cash_ledger_name: string;
  to_cash_ledger_code: string;
  from_bank_account_id: string;
  from_bank_account_name: string;
  from_bank_ledger_id: string;
  to_bank_account_id: string;
  to_bank_account_name: string;
  to_bank_ledger_id: string;
  amount: string;
  reference_number: string;
  transaction_mode: ContraBankTransactionMode;
  cheque_number: string;
  cheque_date: string;
  utr_number: string;
  transaction_reference: string;
  instrument_date: string;
  transaction_date: string;
  narration: string;
  persistedAttachments: ContraAttachmentMeta[];
  pendingFiles: ContraPendingFile[];
};

export function emptyContraForm(): ContraFormState {
  return {
    voucher_date: todayDateInput(),
    from_warehouse_id: "",
    to_warehouse_id: "",
    from_account_type: "CASH",
    to_account_type: "BANK",
    from_cash_ledger_id: "",
    from_cash_ledger_name: "",
    from_cash_ledger_code: "",
    to_cash_ledger_id: "",
    to_cash_ledger_name: "",
    to_cash_ledger_code: "",
    from_bank_account_id: "",
    from_bank_account_name: "",
    from_bank_ledger_id: "",
    to_bank_account_id: "",
    to_bank_account_name: "",
    to_bank_ledger_id: "",
    amount: "",
    reference_number: "",
    transaction_mode: "BANK_TRANSFER",
    cheque_number: "",
    cheque_date: "",
    utr_number: "",
    transaction_reference: "",
    instrument_date: "",
    transaction_date: todayDateInput(),
    narration: "",
    persistedAttachments: [],
    pendingFiles: [],
  };
}

function normalizePersistedAttachments(value: unknown): ContraAttachmentMeta[] {
  if (!Array.isArray(value)) return [];
  const result: ContraAttachmentMeta[] = [];
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

export function mapDetailToForm(detail: ContraVoucherDetail): ContraFormState {
  const base = emptyContraForm();
  const fromCashName = ledgerDisplayName({
    ledger: detail.from_cash_ledger ?? detail.from_ledger,
    snapshot: detail.from_cash_ledger_snapshot ?? detail.from_ledger_snapshot,
  });
  const toCashName = ledgerDisplayName({
    ledger: detail.to_cash_ledger ?? detail.to_ledger,
    snapshot: detail.to_cash_ledger_snapshot ?? detail.to_ledger_snapshot,
  });
  const fromBankName = bankAccountDisplayName({
    bank: detail.from_bank_account,
    ledger: detail.from_ledger,
    snapshot: detail.from_bank_account_snapshot,
  });
  const toBankName = bankAccountDisplayName({
    bank: detail.to_bank_account,
    ledger: detail.to_ledger,
    snapshot: detail.to_bank_account_snapshot,
  });

  return {
    ...base,
    voucher_date: formatDateInput(detail.voucher_date) || todayDateInput(),
    from_warehouse_id: detail.from_warehouse_id || "",
    to_warehouse_id: detail.to_warehouse_id || "",
    from_account_type: detail.from_account_type,
    to_account_type: detail.to_account_type,
    from_cash_ledger_id: detail.from_cash_ledger_id || "",
    from_cash_ledger_name: fromCashName === "—" ? "" : fromCashName,
    from_cash_ledger_code: detail.from_cash_ledger?.ledger_code || detail.from_ledger?.ledger_code || "",
    to_cash_ledger_id: detail.to_cash_ledger_id || "",
    to_cash_ledger_name: toCashName === "—" ? "" : toCashName,
    to_cash_ledger_code: detail.to_cash_ledger?.ledger_code || detail.to_ledger?.ledger_code || "",
    from_bank_account_id: detail.from_bank_account_id || "",
    from_bank_account_name: fromBankName === "—" ? "" : fromBankName,
    from_bank_ledger_id: detail.from_bank_account?.ledger_id || detail.from_ledger_id || "",
    to_bank_account_id: detail.to_bank_account_id || "",
    to_bank_account_name: toBankName === "—" ? "" : toBankName,
    to_bank_ledger_id: detail.to_bank_account?.ledger_id || detail.to_ledger_id || "",
    amount: String(toMoneyNumber(detail.amount) || ""),
    reference_number: detail.reference_number || "",
    transaction_mode: detail.transaction_mode || "CASH",
    cheque_number: detail.cheque_number || "",
    cheque_date: formatDateInput(detail.cheque_date),
    utr_number: detail.utr_number || "",
    transaction_reference: detail.transaction_reference || "",
    instrument_date: formatDateInput(detail.instrument_date),
    transaction_date: formatDateInput(detail.transaction_date) || todayDateInput(),
    narration: detail.narration || "",
    persistedAttachments: normalizePersistedAttachments(detail.attachments),
    pendingFiles: [],
  };
}

export function hasBankSide(form: ContraFormState): boolean {
  return form.from_account_type === "BANK" || form.to_account_type === "BANK";
}

export function isCrossWarehouseCashBlocked(form: ContraFormState): boolean {
  if (!form.from_warehouse_id || !form.to_warehouse_id) return false;
  if (form.from_warehouse_id === form.to_warehouse_id) return false;
  return form.from_account_type === "CASH" || form.to_account_type === "CASH";
}

export function sameAccountSelected(form: ContraFormState): boolean {
  if (form.from_account_type === "CASH" && form.to_account_type === "CASH") {
    return (
      !!form.from_cash_ledger_id &&
      form.from_cash_ledger_id === form.to_cash_ledger_id
    );
  }
  if (form.from_account_type === "BANK" && form.to_account_type === "BANK") {
    return (
      !!form.from_bank_account_id &&
      form.from_bank_account_id === form.to_bank_account_id
    );
  }
  // Mixed Cash/Bank — compare resolved ledger identities when available
  const fromLedger =
    form.from_account_type === "CASH"
      ? form.from_cash_ledger_id
      : form.from_bank_ledger_id;
  const toLedger =
    form.to_account_type === "CASH"
      ? form.to_cash_ledger_id
      : form.to_bank_ledger_id;
  return !!fromLedger && !!toLedger && fromLedger === toLedger;
}

export const CROSS_WAREHOUSE_CASH_MESSAGE =
  "Cross-branch Contra involving Cash is not currently supported. Please select the same branch for Cash transfers.";

export function validateContraForm(form: ContraFormState): string | null {
  if (!form.voucher_date) return "Voucher date is required.";
  if (!form.from_warehouse_id) return "From Warehouse / Branch is required.";
  if (!form.to_warehouse_id) return "To Warehouse / Branch is required.";
  if (!form.from_account_type) return "From Account Type is required.";
  if (!form.to_account_type) return "To Account Type is required.";

  if (isCrossWarehouseCashBlocked(form)) {
    return CROSS_WAREHOUSE_CASH_MESSAGE;
  }

  if (form.from_account_type === "CASH" && !form.from_cash_ledger_id) {
    return "Transfer From Cash account is required.";
  }
  if (form.from_account_type === "BANK" && !form.from_bank_account_id) {
    return "Transfer From Bank account is required.";
  }
  if (form.to_account_type === "CASH" && !form.to_cash_ledger_id) {
    return "Transfer To Cash account is required.";
  }
  if (form.to_account_type === "BANK" && !form.to_bank_account_id) {
    return "Transfer To Bank account is required.";
  }

  if (sameAccountSelected(form)) {
    return "Transfer From and Transfer To accounts must be different.";
  }

  const amount = toMoneyNumber(form.amount);
  if (amount <= 0) return "Amount must be greater than zero.";

  if (hasBankSide(form)) {
    if (!form.transaction_mode || form.transaction_mode === "CASH") {
      return "Transaction mode is required when a Bank account is selected.";
    }
    if (form.transaction_mode === "CHEQUE") {
      if (!form.cheque_number.trim()) return "Cheque number is required for CHEQUE mode.";
      if (!form.cheque_date) return "Cheque date is required for CHEQUE mode.";
    }
    if (electronicModes().includes(form.transaction_mode)) {
      if (!form.utr_number.trim() && !form.transaction_reference.trim()) {
        return "UTR or transaction reference is required for electronic bank transfer modes.";
      }
    }
  }

  if (!form.narration.trim()) return "Narration is required.";

  const pendingFileObjs = form.pendingFiles.map((p) => p.file);
  const attachErr = validateContraAttachmentFiles(
    pendingFileObjs,
    form.persistedAttachments.length,
  );
  if (attachErr) return attachErr;

  return null;
}

export function buildCreatePayload(form: ContraFormState): CreateContraVoucherPayload {
  const bankSide = hasBankSide(form);
  return {
    voucher_date: form.voucher_date,
    from_warehouse_id: form.from_warehouse_id,
    to_warehouse_id: form.to_warehouse_id,
    from_account_type: form.from_account_type,
    to_account_type: form.to_account_type,
    from_cash_ledger_id:
      form.from_account_type === "CASH" ? form.from_cash_ledger_id || null : null,
    to_cash_ledger_id:
      form.to_account_type === "CASH" ? form.to_cash_ledger_id || null : null,
    from_bank_account_id:
      form.from_account_type === "BANK" ? form.from_bank_account_id || null : null,
    to_bank_account_id:
      form.to_account_type === "BANK" ? form.to_bank_account_id || null : null,
    amount: toMoneyNumber(form.amount),
    reference_number: form.reference_number.trim() || null,
    transaction_mode: bankSide ? form.transaction_mode : "CASH",
    cheque_number:
      bankSide && form.transaction_mode === "CHEQUE"
        ? form.cheque_number.trim() || null
        : null,
    cheque_date:
      bankSide && form.transaction_mode === "CHEQUE"
        ? form.cheque_date || null
        : null,
    utr_number: bankSide ? form.utr_number.trim() || null : null,
    transaction_reference: bankSide
      ? form.transaction_reference.trim() || null
      : null,
    instrument_date: bankSide ? form.instrument_date || null : null,
    transaction_date: bankSide ? form.transaction_date || null : null,
    narration: form.narration.trim(),
  };
}

export function buildUpdatePayload(form: ContraFormState): UpdateContraVoucherPayload {
  return {
    ...buildCreatePayload(form),
    existing_attachments: form.persistedAttachments,
  };
}

export function isDraftEditable(status?: ContraVoucherStatus | null): boolean {
  return !status || status === "DRAFT" || status === "REJECTED";
}

export function canCancelStatus(status?: ContraVoucherStatus | null): boolean {
  return (
    status === "DRAFT" ||
    status === "PENDING_APPROVAL" ||
    status === "APPROVED" ||
    status === "REJECTED"
  );
}

export function canPostStatus(
  status: ContraVoucherStatus | null | undefined,
  approvalRequired: boolean,
): boolean {
  if (!status) return false;
  if (status === "PENDING_APPROVAL") return false;
  if (status === "APPROVED") return true;
  if (!approvalRequired && status === "DRAFT") return true;
  return false;
}

export const CONTRA_LIST_PATH = "/accounts/vouchers?tab=contra";

export function contraViewPath(id: string) {
  return `/accounts/vouchers/contra/${id}`;
}

export function contraEditPath(id: string) {
  return `/accounts/vouchers/contra/${id}/edit`;
}

export function clearFromAccountFields(
  accountType: ContraAccountType,
): Partial<ContraFormState> {
  if (accountType === "CASH") {
    return {
      from_cash_ledger_id: "",
      from_cash_ledger_name: "",
      from_cash_ledger_code: "",
      from_bank_account_id: "",
      from_bank_account_name: "",
      from_bank_ledger_id: "",
    };
  }
  return {
    from_bank_account_id: "",
    from_bank_account_name: "",
    from_bank_ledger_id: "",
    from_cash_ledger_id: "",
    from_cash_ledger_name: "",
    from_cash_ledger_code: "",
  };
}

export function clearToAccountFields(
  accountType: ContraAccountType,
): Partial<ContraFormState> {
  if (accountType === "CASH") {
    return {
      to_cash_ledger_id: "",
      to_cash_ledger_name: "",
      to_cash_ledger_code: "",
      to_bank_account_id: "",
      to_bank_account_name: "",
      to_bank_ledger_id: "",
    };
  }
  return {
    to_bank_account_id: "",
    to_bank_account_name: "",
    to_bank_ledger_id: "",
    to_cash_ledger_id: "",
    to_cash_ledger_name: "",
    to_cash_ledger_code: "",
  };
}
