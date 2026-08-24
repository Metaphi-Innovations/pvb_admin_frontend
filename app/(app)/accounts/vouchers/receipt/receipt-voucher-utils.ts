import { roundMoney } from "@/lib/accounts/money-format";
import type {
  AccountingEntryType,
  BankTransactionMode,
  CreateReceiptVoucherPayload,
  ReceiptAdjustmentInput,
  ReceiptAdjustmentType,
  ReceiptAllocationInput,
  ReceiptAttachmentMeta,
  ReceiptOpenItemRow,
  ReceiptPartyKind,
  ReceiptPendingFile,
  ReceiptTreatmentUi,
  ReceiptVoucherDetail,
  ReceiptVoucherStatus,
  UpdateReceiptVoucherPayload,
} from "@/types/receipt-voucher.types";
import {
  validateReceiptAttachmentFiles,
} from "./receipt-attachment-formdata";

export const RECEIPT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isReceiptUuid(value: unknown): value is string {
  return typeof value === "string" && RECEIPT_UUID_RE.test(value);
}

export function toMoneyNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? roundMoney(n) : 0;
}

/** Keep editable money fields free of a sticky leading zero (avoids typing 0112). */
export function sanitizeMoneyInput(raw: string): string {
  let v = raw.replace(/[^\d.]/g, "");
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v =
      v.slice(0, firstDot + 1) +
      v.slice(firstDot + 1).replace(/\./g, "");
  }
  if (v.startsWith(".")) v = `0${v}`;
  if (/^0\d/.test(v)) {
    v = v.replace(/^0+(?=\d)/, "");
  }
  return v;
}

/** Empty string when amount is zero — better for typing than a prefilled "0". */
export function moneyInputValue(value: unknown): string {
  const n = toMoneyNumber(value);
  if (n === 0) return "";
  return String(value ?? "").trim() === "" ? "" : String(value);
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

export function partyDisplayName(detail: {
  party_kind?: ReceiptPartyKind;
  customer?: { customer_name?: string | null; customer_code?: string | null } | null;
  supplier?: { supplier_name?: string | null; supplier_code?: string | null } | null;
  other_ledger?: { ledger_name?: string | null; ledger_code?: string | null } | null;
  customer_snapshot?: Record<string, unknown> | null;
  supplier_snapshot?: Record<string, unknown> | null;
  other_ledger_snapshot?: Record<string, unknown> | null;
}): string {
  if (detail.party_kind === "CUSTOMER") {
    return (
      detail.customer?.customer_name ||
      String(detail.customer_snapshot?.customer_name ?? "") ||
      "—"
    );
  }
  if (detail.party_kind === "SUPPLIER_REFUND") {
    return (
      detail.supplier?.supplier_name ||
      String(detail.supplier_snapshot?.supplier_name ?? "") ||
      "—"
    );
  }
  return (
    detail.other_ledger?.ledger_name ||
    String(detail.other_ledger_snapshot?.ledger_name ?? "") ||
    "—"
  );
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

export type ReceiptUiAllocation = {
  open_item_id: string;
  selected: boolean;
  allocated_amount: string;
  tds_amount: string;
  discount_amount: string;
  document_number: string;
  open_item_type: string;
  document_date: string;
  original_amount: number;
  settled_amount: number;
  outstanding_amount: number;
};

export type ReceiptUiAdjustment = {
  id: string;
  adjustment_type: ReceiptAdjustmentType;
  ledger_id: string;
  ledger_name: string;
  entry_type: AccountingEntryType;
  amount: string;
  narration: string;
};

export type ReceiptFormState = {
  voucher_date: string;
  warehouse_id: string;
  transaction_mode: BankTransactionMode;
  bank_account_id: string;
  cash_bank_ledger_id: string;
  cash_bank_ledger_name: string;
  cheque_number: string;
  cheque_date: string;
  utr_number: string;
  transaction_reference: string;
  transaction_date: string;
  party_kind: ReceiptPartyKind;
  customer_id: string;
  supplier_id: string;
  other_ledger_id: string;
  other_ledger_name: string;
  receipt_treatment: ReceiptTreatmentUi;
  gross_party_amount: string;
  advance_amount: string;
  narration: string;
  remarks: string;
  allocations: ReceiptUiAllocation[];
  adjustments: ReceiptUiAdjustment[];
  /** Backend-persisted attachment metadata only (no blob URLs). */
  persistedAttachments: ReceiptAttachmentMeta[];
  /** New unsaved File objects; previewUrl is temporary only. */
  pendingFiles: ReceiptPendingFile[];
};

export function emptyReceiptForm(): ReceiptFormState {
  return {
    voucher_date: todayDateInput(),
    warehouse_id: "",
    transaction_mode: "NEFT",
    bank_account_id: "",
    cash_bank_ledger_id: "",
    cash_bank_ledger_name: "",
    cheque_number: "",
    cheque_date: "",
    utr_number: "",
    transaction_reference: "",
    transaction_date: todayDateInput(),
    party_kind: "CUSTOMER",
    customer_id: "",
    supplier_id: "",
    other_ledger_id: "",
    other_ledger_name: "",
    receipt_treatment: "against_outstanding",
    gross_party_amount: "",
    advance_amount: "0",
    narration: "",
    remarks: "",
    allocations: [],
    adjustments: [],
    persistedAttachments: [],
    pendingFiles: [],
  };
}

export function mapOpenItemsToAllocations(
  items: ReceiptOpenItemRow[],
  existing?: ReceiptUiAllocation[],
): ReceiptUiAllocation[] {
  const prev = new Map((existing ?? []).map((a) => [a.open_item_id, a]));
  return items.map((item) => {
    const prior = prev.get(item.open_item_id);
    const outstanding = toMoneyNumber(item.outstanding_amount);
    return {
      open_item_id: item.open_item_id,
      selected: prior?.selected ?? false,
      allocated_amount: prior?.allocated_amount ?? "",
      tds_amount: prior?.tds_amount ?? "",
      discount_amount: prior?.discount_amount ?? "",
      document_number: item.document_number || "—",
      open_item_type: item.open_item_type || "—",
      document_date: formatDateInput(item.document_date),
      original_amount: toMoneyNumber(item.original_amount),
      settled_amount: toMoneyNumber(item.settled_amount),
      outstanding_amount: outstanding,
    };
  });
}

export function mapDetailToForm(detail: ReceiptVoucherDetail): ReceiptFormState {
  const base = emptyReceiptForm();
  const allocated = toMoneyNumber(detail.allocated_amount);
  const advance = toMoneyNumber(detail.advance_amount);
  const treatment: ReceiptTreatmentUi =
    detail.party_kind === "CUSTOMER" && allocated <= 0 && advance > 0
      ? "advance_on_account"
      : "against_outstanding";

  const allocationsFromDetail: ReceiptUiAllocation[] = (detail.allocations ?? []).map(
    (a) => {
      const snap = (a.open_item_snapshot ?? {}) as Record<string, unknown>;
      return {
        open_item_id: a.open_item_id,
        selected: true,
        allocated_amount: moneyInputValue(a.allocated_amount),
        tds_amount: moneyInputValue(a.tds_amount),
        discount_amount: moneyInputValue(a.discount_amount),
        document_number: String(
          snap.document_number ?? snap.documentNumber ?? "—",
        ),
        open_item_type: String(snap.open_item_type ?? snap.openItemType ?? "—"),
        document_date: formatDateInput(snap.document_date ?? snap.documentDate),
        original_amount: toMoneyNumber(snap.original_amount ?? snap.originalAmount),
        settled_amount: toMoneyNumber(snap.settled_amount ?? snap.settledAmount),
        outstanding_amount: toMoneyNumber(
          snap.outstanding_amount ?? snap.outstandingAmount,
        ),
      };
    },
  );

  return {
    ...base,
    voucher_date: formatDateInput(detail.voucher_date) || todayDateInput(),
    warehouse_id: detail.warehouse_id || "",
    transaction_mode: detail.transaction_mode || "NEFT",
    bank_account_id: detail.bank_account_id || "",
    cash_bank_ledger_id: detail.cash_bank_ledger_id || "",
    cash_bank_ledger_name:
      detail.cash_bank_ledger?.ledger_name ||
      snapshotLabel(detail.cash_bank_ledger_snapshot, "ledger_name", "ledgerName") ||
      "",
    cheque_number: detail.cheque_number || "",
    cheque_date: formatDateInput(detail.cheque_date),
    utr_number: detail.utr_number || "",
    transaction_reference: detail.transaction_reference || "",
    transaction_date:
      formatDateInput(detail.transaction_date) ||
      formatDateInput(detail.instrument_date) ||
      "",
    party_kind: detail.party_kind || "CUSTOMER",
    customer_id: detail.customer_id || "",
    supplier_id: detail.supplier_id || "",
    other_ledger_id: detail.other_ledger_id || "",
    other_ledger_name:
      detail.other_ledger?.ledger_name ||
      snapshotLabel(detail.other_ledger_snapshot, "ledger_name", "ledgerName") ||
      "",
    receipt_treatment: treatment,
    gross_party_amount: String(toMoneyNumber(detail.gross_party_amount)),
    advance_amount: String(advance),
    narration: detail.narration || "",
    remarks: detail.remarks || "",
    allocations: allocationsFromDetail,
    adjustments: (detail.adjustments ?? []).map((adj, idx) => ({
      id: adj.receipt_voucher_adjustment_id || `adj-${idx}`,
      adjustment_type: adj.adjustment_type,
      ledger_id: adj.ledger_id || adj.ledger?.ledger_id || "",
      ledger_name:
        adj.ledger?.ledger_name ||
        snapshotLabel(adj.ledger_snapshot, "ledger_name", "ledgerName") ||
        "",
      entry_type: (adj.entry_type as AccountingEntryType) || "DEBIT",
      amount: String(toMoneyNumber(adj.amount)),
      narration: adj.narration || "",
    })),
    persistedAttachments: normalizePersistedAttachments(
      detail.attachments ??
        (detail as ReceiptVoucherDetail & { receipt_voucher?: { attachments?: unknown } })
          .receipt_voucher?.attachments,
    ),
    pendingFiles: [],
  };
}

export function resolveReceiptAttachmentUrl(path: string): string {
  const raw = path.trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.includes("/uploads/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (normalized.startsWith("/uploads/")) return normalized;
  const idx = normalized.indexOf("/uploads/");
  if (idx >= 0) return normalized.slice(idx);
  return `/uploads/${normalized.replace(/^\//, "")}`;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePersistedAttachments(
  value: unknown,
): ReceiptAttachmentMeta[] {
  let source: unknown = value;
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return [];
    try {
      source = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }
  if (source && typeof source === "object" && !Array.isArray(source)) {
    source = [source];
  }
  if (!Array.isArray(source)) return [];
  const result: ReceiptAttachmentMeta[] = [];
  for (const item of source) {
    if (typeof item === "string") {
      const file_url = item.trim();
      if (!file_url || file_url.startsWith("blob:") || file_url.startsWith("data:")) {
        continue;
      }
      result.push({
        file_name: decodeURIComponent(file_url.split("/").pop() || "attachment"),
        file_url,
      });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const file_url = asTrimmedString(row.file_url ?? row.fileUrl ?? row.url);
    const file_name = asTrimmedString(
      row.file_name ?? row.fileName ?? row.name,
    );
    if (!file_url || !file_name) continue;
    if (file_url.startsWith("blob:") || file_url.startsWith("data:")) continue;
    result.push({
      file_name,
      file_url,
      file_type: asTrimmedString(row.file_type ?? row.fileType) || null,
      uploaded_at: asTrimmedString(row.uploaded_at ?? row.uploadedAt) || null,
      uploaded_by: asTrimmedString(row.uploaded_by ?? row.uploadedBy) || null,
    });
  }
  return result;
}

export function createEmptyAdjustment(
  type: ReceiptAdjustmentType = "OTHER",
): ReceiptUiAdjustment {
  const entryType: AccountingEntryType =
    type === "OTHER" || type === "ROUND_OFF" ? "DEBIT" : "DEBIT";
  return {
    id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    adjustment_type: type,
    ledger_id: "",
    ledger_name: "",
    entry_type: entryType,
    amount: "",
    narration: "",
  };
}

export function selectedAllocations(form: ReceiptFormState): ReceiptUiAllocation[] {
  return form.allocations.filter(
    (a) => a.selected && toMoneyNumber(a.allocated_amount) > 0,
  );
}

export function computeAllocationTotals(form: ReceiptFormState) {
  const selected = selectedAllocations(form);
  const totalAllocated = roundMoney(
    selected.reduce((s, a) => s + toMoneyNumber(a.allocated_amount), 0),
  );
  const totalTds = roundMoney(
    selected.reduce((s, a) => s + toMoneyNumber(a.tds_amount), 0),
  );
  const totalDiscount = roundMoney(
    selected.reduce((s, a) => s + toMoneyNumber(a.discount_amount), 0),
  );
  return { totalAllocated, totalTds, totalDiscount, selected };
}

export function computeAdjustmentTotals(form: ReceiptFormState) {
  let debit = 0;
  let credit = 0;
  for (const adj of form.adjustments) {
    const amt = toMoneyNumber(adj.amount);
    if (amt <= 0) continue;
    if (adj.adjustment_type === "OTHER") {
      if (adj.entry_type === "CREDIT") credit += amt;
      else debit += amt;
    } else if (adj.adjustment_type === "ROUND_OFF") {
      // Backend-controlled; treat amount as DEBIT by default for preview unless CREDIT selected.
      if (adj.entry_type === "CREDIT") credit += amt;
      else debit += amt;
    } else {
      // CUSTOMER_TDS, DISCOUNT_ALLOWED, BANK_CHARGES → DEBIT
      debit += amt;
    }
  }
  return { debit: roundMoney(debit), credit: roundMoney(credit) };
}

export function computeReceiptPreview(form: ReceiptFormState) {
  const { totalAllocated, totalTds, totalDiscount } = computeAllocationTotals(form);
  const adj = computeAdjustmentTotals(form);
  const grossInput = toMoneyNumber(form.gross_party_amount);

  let gross = grossInput;
  let advance = 0;

  if (form.party_kind === "CUSTOMER") {
    if (form.receipt_treatment === "advance_on_account") {
      gross = grossInput;
      advance = gross;
    } else {
      if (grossInput > 0) {
        gross = grossInput;
        advance = roundMoney(Math.max(0, gross - totalAllocated));
      } else {
        gross = totalAllocated;
        advance = 0;
      }
    }
  } else if (form.party_kind === "SUPPLIER_REFUND") {
    gross = grossInput > 0 ? grossInput : totalAllocated;
    advance = 0;
  } else {
    gross = grossInput;
    advance = 0;
  }

  const netBank = roundMoney(gross - adj.debit + adj.credit);

  return {
    gross: roundMoney(gross),
    advance: roundMoney(advance),
    totalAllocated,
    totalTds,
    totalDiscount,
    adjDebit: adj.debit,
    adjCredit: adj.credit,
    netBank,
  };
}

export function electronicModes(): BankTransactionMode[] {
  return ["NEFT", "RTGS", "IMPS", "UPI", "BANK_TRANSFER"];
}

export function validateReceiptForm(form: ReceiptFormState): string | null {
  if (!form.voucher_date) return "Voucher date is required.";
  if (!form.warehouse_id) return "Branch / Warehouse is required.";
  if (!form.transaction_mode) return "Mode of receipt is required.";
  if (!form.cash_bank_ledger_id) return "Cash / Bank account is required.";

  if (form.transaction_mode === "CHEQUE") {
    if (!form.cheque_number.trim()) return "Cheque number is required.";
    if (!form.cheque_date) return "Cheque date is required.";
  }
  if (electronicModes().includes(form.transaction_mode)) {
    if (!form.utr_number.trim() && !form.transaction_reference.trim()) {
      return "UTR or transaction reference is required for electronic transfer modes.";
    }
  }

  if (form.party_kind === "CUSTOMER") {
    if (!form.customer_id) return "Customer is required.";
  } else if (form.party_kind === "SUPPLIER_REFUND") {
    if (!form.supplier_id) return "Supplier is required.";
  } else if (!form.other_ledger_id) {
    return "Other ledger is required.";
  }

  const preview = computeReceiptPreview(form);

  if (form.party_kind === "OTHER_LEDGER") {
    if (preview.gross <= 0) return "Gross receipt amount must be greater than zero.";
    if (form.allocations.some((a) => a.selected)) {
      return "Other Ledger receipts cannot include allocations.";
    }
  }

  if (form.party_kind === "CUSTOMER") {
    if (form.receipt_treatment === "against_outstanding") {
      if (preview.totalAllocated <= 0 && preview.advance <= 0) {
        return "Allocate at least one outstanding item or enter a gross amount that creates advance.";
      }
      const grossInput = toMoneyNumber(form.gross_party_amount);
      if (grossInput > 0 && preview.totalAllocated > grossInput + 0.01) {
        return "Total allocated cannot exceed Gross Settlement Amount. Increase gross or reduce allocations.";
      }
      for (const row of selectedAllocations(form)) {
        const alloc = toMoneyNumber(row.allocated_amount);
        if (alloc <= 0) return "Allocation amount must be greater than zero.";
        if (alloc > row.outstanding_amount + 0.0001) {
          return `Allocation for ${row.document_number} exceeds outstanding.`;
        }
      }
    } else if (preview.gross <= 0) {
      return "Gross settlement amount must be greater than zero for advance receipts.";
    }
  }

  if (form.party_kind === "SUPPLIER_REFUND") {
    if (preview.totalAllocated <= 0) {
      return "Supplier Refund requires at least one eligible recoverable allocation.";
    }
    for (const row of selectedAllocations(form)) {
      const alloc = toMoneyNumber(row.allocated_amount);
      if (alloc <= 0) return "Allocation amount must be greater than zero.";
      if (alloc > row.outstanding_amount + 0.0001) {
        return `Allocation for ${row.document_number} exceeds recoverable balance.`;
      }
    }
    if (preview.gross > 0 && Math.abs(preview.gross - preview.totalAllocated) > 0.01) {
      return "Gross refund amount must equal total allocated for Supplier Refund.";
    }
  }

  const adjTds = form.adjustments
    .filter((a) => a.adjustment_type === "CUSTOMER_TDS")
    .reduce((s, a) => s + toMoneyNumber(a.amount), 0);
  if (Math.abs(roundMoney(adjTds) - preview.totalTds) > 0.01 && preview.totalTds > 0) {
    return "Total allocation TDS must equal Customer TDS adjustment total.";
  }
  if (Math.abs(roundMoney(adjTds) - preview.totalTds) > 0.01 && adjTds > 0 && preview.totalTds === 0) {
    return "Customer TDS adjustment requires matching TDS on allocations (or clear the adjustment).";
  }

  const adjDiscount = form.adjustments
    .filter((a) => a.adjustment_type === "DISCOUNT_ALLOWED")
    .reduce((s, a) => s + toMoneyNumber(a.amount), 0);
  if (Math.abs(roundMoney(adjDiscount) - preview.totalDiscount) > 0.01) {
    if (preview.totalDiscount > 0 || adjDiscount > 0) {
      return "Total allocation discount must equal Discount Allowed adjustment total.";
    }
  }

  for (const adj of form.adjustments) {
    const amt = toMoneyNumber(adj.amount);
    if (amt <= 0) return "Adjustment amount must be greater than zero.";
    if (
      (adj.adjustment_type === "DISCOUNT_ALLOWED" ||
        adj.adjustment_type === "BANK_CHARGES" ||
        adj.adjustment_type === "OTHER") &&
      !adj.ledger_id
    ) {
      return `Ledger is required for ${adj.adjustment_type.replace(/_/g, " ").toLowerCase()}.`;
    }
    if (adj.adjustment_type === "OTHER" && !adj.entry_type) {
      return "Dr/Cr is required for Other Adjustment.";
    }
  }

  if (preview.netBank < -0.0001) {
    return "Net cash/bank amount cannot be negative.";
  }

  const pendingFileObjs = form.pendingFiles.map((p) => p.file);
  const attachErr = validateReceiptAttachmentFiles(
    pendingFileObjs,
    form.persistedAttachments.length,
  );
  if (attachErr) return attachErr;

  return null;
}

export function buildCreatePayload(form: ReceiptFormState): CreateReceiptVoucherPayload {
  const preview = computeReceiptPreview(form);
  const isCash = form.transaction_mode === "CASH";
  const isAdvanceOnly =
    form.party_kind === "CUSTOMER" && form.receipt_treatment === "advance_on_account";

  const allocations: ReceiptAllocationInput[] =
    form.party_kind === "OTHER_LEDGER" || isAdvanceOnly
      ? []
      : selectedAllocations(form).map((a) => ({
          open_item_id: a.open_item_id,
          allocated_amount: toMoneyNumber(a.allocated_amount),
          tds_amount: toMoneyNumber(a.tds_amount),
          discount_amount: toMoneyNumber(a.discount_amount),
        }));

  const adjustments: ReceiptAdjustmentInput[] = form.adjustments.map((adj) => {
    const base: ReceiptAdjustmentInput = {
      adjustment_type: adj.adjustment_type,
      amount: toMoneyNumber(adj.amount),
      narration: adj.narration.trim() || null,
    };
    if (
      adj.adjustment_type === "DISCOUNT_ALLOWED" ||
      adj.adjustment_type === "BANK_CHARGES" ||
      adj.adjustment_type === "OTHER"
    ) {
      base.ledger_id = adj.ledger_id || null;
    }
    if (adj.adjustment_type === "OTHER") {
      base.entry_type = adj.entry_type;
    }
    if (adj.adjustment_type === "ROUND_OFF") {
      base.entry_type = adj.entry_type;
    }
    return base;
  });

  return {
    voucher_date: form.voucher_date,
    warehouse_id: form.warehouse_id,
    party_kind: form.party_kind,
    customer_id: form.party_kind === "CUSTOMER" ? form.customer_id : null,
    supplier_id: form.party_kind === "SUPPLIER_REFUND" ? form.supplier_id : null,
    other_ledger_id: form.party_kind === "OTHER_LEDGER" ? form.other_ledger_id : null,
    bank_account_id: isCash ? null : form.bank_account_id || null,
    cash_bank_ledger_id: form.cash_bank_ledger_id,
    transaction_mode: form.transaction_mode,
    cheque_number:
      form.transaction_mode === "CHEQUE" ? form.cheque_number.trim() || null : null,
    cheque_date: form.transaction_mode === "CHEQUE" ? form.cheque_date || null : null,
    utr_number: electronicModes().includes(form.transaction_mode)
      ? form.utr_number.trim() || null
      : form.utr_number.trim() || null,
    transaction_reference: form.transaction_reference.trim() || null,
    instrument_date:
      form.transaction_mode === "CHEQUE" ? form.cheque_date || null : form.transaction_date || null,
    transaction_date: form.transaction_date || null,
    gross_party_amount: preview.gross,
    advance_amount:
      form.party_kind === "CUSTOMER" ? preview.advance : 0,
    narration: form.narration.trim() || null,
    remarks: form.remarks.trim() || null,
    allocations,
    adjustments,
  };
}

export function buildUpdatePayload(form: ReceiptFormState): UpdateReceiptVoucherPayload {
  return {
    ...buildCreatePayload(form),
    existing_attachments: form.persistedAttachments,
  };
}

export function isDraftEditable(status?: ReceiptVoucherStatus | null): boolean {
  return !status || status === "DRAFT" || status === "REJECTED";
}

export function canCancelStatus(status?: ReceiptVoucherStatus | null): boolean {
  return (
    status === "DRAFT" ||
    status === "PENDING_APPROVAL" ||
    status === "APPROVED" ||
    status === "REJECTED"
  );
}

export function canPostStatus(
  status: ReceiptVoucherStatus | null | undefined,
  approvalRequired: boolean,
): boolean {
  if (!status) return false;
  if (status === "PENDING_APPROVAL") return false;
  if (status === "APPROVED") return true;
  if (!approvalRequired && status === "DRAFT") return true;
  return false;
}

export const RECEIPT_LIST_PATH = "/accounts/vouchers?tab=receipt";
export function receiptViewPath(id: string) {
  return `/accounts/vouchers/receipt/${id}`;
}
export function receiptEditPath(id: string) {
  return `/accounts/vouchers/receipt/${id}/edit`;
}
