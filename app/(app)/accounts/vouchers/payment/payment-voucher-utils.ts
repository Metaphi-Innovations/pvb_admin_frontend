import { roundMoney } from "@/lib/accounts/money-format";
import type {
  CreatePaymentVoucherPayload,
  PaymentAccountingEntryType,
  PaymentAdjustmentInput,
  PaymentAdjustmentType,
  PaymentAllocationInput,
  PaymentAttachmentMeta,
  PaymentBankTransactionMode,
  PaymentOpenItemRow,
  PaymentPartyKind,
  PaymentPendingFile,
  PaymentTdsSectionSnapshot,
  PaymentTreatmentUi,
  PaymentVoucherDetail,
  PaymentVoucherStatus,
  UpdatePaymentVoucherPayload,
} from "@/types/payment-voucher.types";
import { validatePaymentAttachmentFiles } from "./payment-attachment-formdata";

export const PAYMENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPaymentUuid(value: unknown): value is string {
  return typeof value === "string" && PAYMENT_UUID_RE.test(value);
}

export function toMoneyNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? roundMoney(n) : 0;
}

/**
 * Manual ledger lines that sit inside the UI Gross Amount envelope
 * (matches computePaymentPreview ledgerEntriesTotal = otherDebit + otherCredit).
 * Backend `gross_party_amount` is party-only; display gross = party + these lines.
 */
export function sumPaymentLedgerEntriesAmount(
  adjustments: Array<{
    adjustment_type: string;
    amount: unknown;
  }>,
): number {
  let total = 0;
  for (const adj of adjustments) {
    const amt = toMoneyNumber(adj.amount);
    if (amt <= 0) continue;
    if (
      adj.adjustment_type === "SUPPLIER_TDS" ||
      adj.adjustment_type === "DISCOUNT_RECEIVED" ||
      adj.adjustment_type === "ROUND_OFF"
    ) {
      continue;
    }
    total += amt;
  }
  return roundMoney(total);
}

/** UI Gross Amount = persisted party gross + ledger entries. */
export function displayGrossFromPartyAndLedger(
  partyGross: unknown,
  adjustments: Array<{ adjustment_type: string; amount: unknown }>,
): number {
  return roundMoney(
    toMoneyNumber(partyGross) + sumPaymentLedgerEntriesAmount(adjustments),
  );
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

export function partyDisplayName(detail: {
  party_kind?: PaymentPartyKind;
  customer?: { customer_name?: string | null; customer_code?: string | null } | null;
  supplier?: { supplier_name?: string | null; supplier_code?: string | null } | null;
  other_ledger?: { ledger_name?: string | null; ledger_code?: string | null } | null;
  customer_snapshot?: Record<string, unknown> | null;
  supplier_snapshot?: Record<string, unknown> | null;
  other_ledger_snapshot?: Record<string, unknown> | null;
}): string {
  if (detail.party_kind === "SUPPLIER") {
    return (
      detail.supplier?.supplier_name ||
      String(detail.supplier_snapshot?.supplier_name ?? "") ||
      "—"
    );
  }
  if (detail.party_kind === "CUSTOMER_REFUND") {
    return (
      detail.customer?.customer_name ||
      String(detail.customer_snapshot?.customer_name ?? "") ||
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

export type PaymentUiAllocation = {
  open_item_id: string;
  selected: boolean;
  allocated_amount: string;
  tds_amount: string;
  /** Active TDS master id when tds_amount > 0; cleared when TDS is zero. */
  tds_section_id: string;
  /** Historical snapshot for read-only / legacy display (not submitted). */
  tds_section_snapshot?: PaymentTdsSectionSnapshot | null;
  discount_amount: string;
  document_number: string;
  open_item_type: string;
  document_date: string;
  original_amount: number;
  settled_amount: number;
  outstanding_amount: number;
};

export type PaymentUiAdjustment = {
  id: string;
  adjustment_type: PaymentAdjustmentType;
  ledger_id: string;
  ledger_name: string;
  entry_type: PaymentAccountingEntryType;
  amount: string;
  narration: string;
};

export type PaymentFormState = {
  voucher_date: string;
  warehouse_id: string;
  transaction_mode: PaymentBankTransactionMode;
  bank_account_id: string;
  cash_bank_ledger_id: string;
  cash_bank_ledger_name: string;
  cheque_number: string;
  cheque_date: string;
  utr_number: string;
  transaction_reference: string;
  transaction_date: string;
  party_kind: PaymentPartyKind;
  customer_id: string;
  supplier_id: string;
  other_ledger_id: string;
  other_ledger_name: string;
  payment_treatment: PaymentTreatmentUi;
  gross_party_amount: string;
  advance_amount: string;
  narration: string;
  remarks: string;
  allocations: PaymentUiAllocation[];
  adjustments: PaymentUiAdjustment[];
  persistedAttachments: PaymentAttachmentMeta[];
  pendingFiles: PaymentPendingFile[];
};

export function emptyPaymentForm(): PaymentFormState {
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
    party_kind: "SUPPLIER",
    customer_id: "",
    supplier_id: "",
    other_ledger_id: "",
    other_ledger_name: "",
    payment_treatment: "against_outstanding",
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
  items: PaymentOpenItemRow[],
  existing?: PaymentUiAllocation[],
): PaymentUiAllocation[] {
  const prev = new Map((existing ?? []).map((a) => [a.open_item_id, a]));
  return items.map((item) => {
    const prior = prev.get(item.open_item_id);
    const outstanding = toMoneyNumber(item.outstanding_amount);
    return {
      open_item_id: item.open_item_id,
      selected: prior?.selected ?? false,
      allocated_amount: prior?.allocated_amount ?? "",
      tds_amount: prior?.tds_amount ?? "0",
      tds_section_id: prior?.tds_section_id ?? "",
      tds_section_snapshot: prior?.tds_section_snapshot ?? null,
      discount_amount: prior?.discount_amount ?? "0",
      document_number: item.document_number || "—",
      open_item_type: item.open_item_type || "—",
      document_date: formatDateInput(item.document_date),
      original_amount: toMoneyNumber(item.original_amount),
      settled_amount: toMoneyNumber(item.settled_amount),
      outstanding_amount: outstanding,
    };
  });
}

/** Derive UI treatment from persisted allocations + advance (no backend MIXED enum). */
export function derivePaymentTreatmentFromAmounts(
  partyKind: PaymentPartyKind,
  allocated: number,
  advance: number,
): PaymentTreatmentUi {
  if (partyKind !== "SUPPLIER") return "against_outstanding";
  if (allocated <= 0 && advance > 0) return "advance_on_account";
  if (allocated > 0 && advance > 0) return "mixed_allocation";
  return "against_outstanding";
}

export function mapDetailToForm(detail: PaymentVoucherDetail): PaymentFormState {
  const base = emptyPaymentForm();
  const allocated = toMoneyNumber(detail.allocated_amount);
  const advance = toMoneyNumber(detail.advance_amount);
  const treatment = derivePaymentTreatmentFromAmounts(
    detail.party_kind,
    allocated,
    advance,
  );

  const allocationsFromDetail: PaymentUiAllocation[] = (detail.allocations ?? []).map(
    (a) => {
      const snap = (a.open_item_snapshot ?? {}) as Record<string, unknown>;
      return {
        open_item_id: a.open_item_id,
        selected: true,
        allocated_amount: String(toMoneyNumber(a.allocated_amount)),
        tds_amount: String(toMoneyNumber(a.tds_amount)),
        tds_section_id: a.tds_section_id ? String(a.tds_section_id) : "",
        tds_section_snapshot: a.tds_section_snapshot ?? null,
        discount_amount: String(toMoneyNumber(a.discount_amount)),
        document_number: String(snap.document_number ?? snap.documentNumber ?? "—"),
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
    party_kind: detail.party_kind || "SUPPLIER",
    customer_id: detail.customer_id || "",
    supplier_id: detail.supplier_id || "",
    other_ledger_id: detail.other_ledger_id || "",
    other_ledger_name:
      detail.other_ledger?.ledger_name ||
      snapshotLabel(detail.other_ledger_snapshot, "ledger_name", "ledgerName") ||
      "",
    payment_treatment: treatment,
    // Form Gross = party (API gross_party_amount) + ledger entries.
    gross_party_amount: String(
      displayGrossFromPartyAndLedger(
        detail.gross_party_amount,
        detail.adjustments ?? [],
      ),
    ),
    advance_amount: String(advance),
    narration: detail.narration || "",
    remarks: detail.remarks || "",
    allocations: allocationsFromDetail,
    adjustments: (detail.adjustments ?? []).map((adj, idx) => ({
      id: adj.payment_voucher_adjustment_id || `adj-${idx}`,
      adjustment_type: adj.adjustment_type,
      ledger_id: adj.ledger_id || adj.ledger?.ledger_id || "",
      ledger_name:
        adj.ledger?.ledger_name ||
        snapshotLabel(adj.ledger_snapshot, "ledger_name", "ledgerName") ||
        "",
      entry_type: (adj.entry_type as PaymentAccountingEntryType) || "CREDIT",
      amount: String(toMoneyNumber(adj.amount)),
      narration: adj.narration || "",
    })),
    persistedAttachments: normalizePersistedAttachments(detail.attachments),
    pendingFiles: [],
  };
}

function basenameFromAttachmentPath(pathOrUrl: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return "";
  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      const parts = parsed.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || "";
    }
  } catch {
    /* fall through */
  }
  const normalized = raw.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

/** Open attachment via same-origin /uploads proxy (environment-safe). */
export function resolvePaymentAttachmentUrl(path: string): string {
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

/** Prefer generated/stored filename from the path over original upload name. */
export function paymentAttachmentDisplayName(att: {
  file_name: string;
  file_url: string;
}): string {
  const fromPath = basenameFromAttachmentPath(att.file_url);
  if (fromPath) return decodeURIComponent(fromPath);
  return att.file_name;
}

function normalizePersistedAttachments(value: unknown): PaymentAttachmentMeta[] {
  if (!Array.isArray(value)) return [];
  const result: PaymentAttachmentMeta[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const file_url = typeof row.file_url === "string" ? row.file_url.trim() : "";
    let file_name = typeof row.file_name === "string" ? row.file_name.trim() : "";
    if (!file_url) continue;
    const generatedName = basenameFromAttachmentPath(file_url);
    if (generatedName) file_name = decodeURIComponent(generatedName);
    if (!file_name) continue;
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

export function createEmptyAdjustment(
  type: PaymentAdjustmentType = "OTHER",
): PaymentUiAdjustment {
  // OTHER ledger-entry lines are additive to bank outflow (DEBIT).
  // TDS / Discount Received remain CREDIT (reduce net bank).
  const entryType: PaymentAccountingEntryType =
    type === "SUPPLIER_TDS" || type === "DISCOUNT_RECEIVED" ? "CREDIT" : "DEBIT";
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

export function selectedAllocations(form: PaymentFormState): PaymentUiAllocation[] {
  return form.allocations.filter(
    (a) => a.selected && toMoneyNumber(a.allocated_amount) > 0,
  );
}

export function computeAllocationTotals(form: PaymentFormState) {
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
  const netBankImpact = roundMoney(totalAllocated - totalTds - totalDiscount);
  return { totalAllocated, totalTds, totalDiscount, netBankImpact, selected };
}

export function computeAdjustmentTotals(form: PaymentFormState) {
  let debit = 0;
  let credit = 0;
  let tds = 0;
  let discount = 0;
  let otherDebit = 0;
  let otherCredit = 0;
  let roundOffDebit = 0;
  let roundOffCredit = 0;

  for (const adj of form.adjustments) {
    const amt = toMoneyNumber(adj.amount);
    if (amt <= 0) continue;
    if (adj.adjustment_type === "SUPPLIER_TDS") {
      tds += amt;
      credit += amt;
    } else if (adj.adjustment_type === "DISCOUNT_RECEIVED") {
      discount += amt;
      credit += amt;
    } else if (adj.adjustment_type === "ROUND_OFF") {
      if (adj.entry_type === "DEBIT") {
        roundOffDebit += amt;
        debit += amt;
      } else {
        roundOffCredit += amt;
        credit += amt;
      }
    } else if (adj.entry_type === "CREDIT") {
      otherCredit += amt;
      credit += amt;
    } else {
      otherDebit += amt;
      debit += amt;
    }
  }
  return {
    debit: roundMoney(debit),
    credit: roundMoney(credit),
    tds: roundMoney(tds),
    discount: roundMoney(discount),
    otherDebit: roundMoney(otherDebit),
    otherCredit: roundMoney(otherCredit),
    roundOff: roundMoney(roundOffCredit - roundOffDebit),
  };
}

export function computePaymentPreview(form: PaymentFormState) {
  const { totalAllocated, totalTds, totalDiscount } = computeAllocationTotals(form);
  const adj = computeAdjustmentTotals(form);
  const grossInput = toMoneyNumber(form.gross_party_amount);
  /** Ledger Entries (OTHER) — part of UI gross; party payload excludes them. */
  const ledgerEntriesTotal = sumPaymentLedgerEntriesAmount(form.adjustments);

  let displayGross = grossInput;
  let advance = 0;
  /** Party portion posted/saved (= allocated + advance). */
  let payloadGross = 0;

  if (form.party_kind === "SUPPLIER") {
    if (form.payment_treatment === "advance_on_account") {
      displayGross = grossInput;
      // Ledger entries consume part of gross; remainder is supplier advance.
      advance = roundMoney(Math.max(0, displayGross - ledgerEntriesTotal));
      payloadGross = advance;
    } else if (form.payment_treatment === "mixed_allocation") {
      // Remaining allocatable supplier amount after invoice settlement → Supplier Advance.
      displayGross = grossInput;
      advance = roundMoney(
        Math.max(0, displayGross - totalAllocated - ledgerEntriesTotal),
      );
      payloadGross = roundMoney(totalAllocated + advance);
    } else if (grossInput > 0) {
      // Against Outstanding: no silent residual advance — allocations must cover gross.
      displayGross = grossInput;
      advance = 0;
      payloadGross = roundMoney(totalAllocated);
    } else {
      displayGross = totalAllocated;
      advance = 0;
      payloadGross = totalAllocated;
    }
  } else if (form.party_kind === "CUSTOMER_REFUND") {
    if (totalAllocated > 0) {
      displayGross = roundMoney(totalAllocated + ledgerEntriesTotal);
      advance = 0;
      payloadGross = totalAllocated;
    } else {
      displayGross = grossInput;
      advance = 0;
      payloadGross = roundMoney(Math.max(0, grossInput - ledgerEntriesTotal));
    }
  } else {
    displayGross = grossInput;
    advance = 0;
    payloadGross = roundMoney(Math.max(0, grossInput - ledgerEntriesTotal));
  }

  // OTHER DEBIT adds bank back so net bank equals display gross when ledger is within gross.
  // TDS / Discount CREDIT still reduce net bank.
  const netBank = roundMoney(payloadGross - adj.credit + adj.debit);
  const unallocated = roundMoney(
    Math.max(
      0,
      displayGross - totalAllocated - advance - ledgerEntriesTotal,
    ),
  );

  return {
    gross: roundMoney(displayGross),
    payloadGross: roundMoney(payloadGross),
    advance: roundMoney(advance),
    totalAllocated,
    totalTds,
    totalDiscount,
    adjDebit: adj.debit,
    adjCredit: adj.credit,
    adjTds: adj.tds,
    adjDiscount: adj.discount,
    otherDebit: adj.otherDebit,
    otherCredit: adj.otherCredit,
    ledgerEntriesTotal,
    roundOff: adj.roundOff,
    netBank,
    unallocated,
  };
}

export function electronicModes(): PaymentBankTransactionMode[] {
  return ["NEFT", "RTGS", "IMPS", "UPI", "BANK_TRANSFER"];
}

export function validatePaymentForm(form: PaymentFormState): string | null {
  if (!form.voucher_date) return "Voucher date is required.";
  if (!form.warehouse_id) return "Branch / Warehouse is required.";
  if (!form.transaction_mode) return "Mode of payment is required.";
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

  if (form.party_kind === "SUPPLIER") {
    if (!form.supplier_id) return "Supplier is required.";
  } else if (form.party_kind === "CUSTOMER_REFUND") {
    if (!form.customer_id) return "Customer is required.";
  } else if (!form.other_ledger_id) {
    return "Other ledger is required.";
  }

  const preview = computePaymentPreview(form);

  if (
    preview.ledgerEntriesTotal > 0.004 &&
    toMoneyNumber(form.gross_party_amount) <= 0 &&
    form.party_kind === "SUPPLIER" &&
    (form.payment_treatment === "against_outstanding" ||
      form.payment_treatment === "mixed_allocation") &&
    preview.totalAllocated <= 0
  ) {
    return "Enter Gross Supplier Amount when using Ledger Entries without invoice settlement.";
  }
  if (
    preview.gross > 0 &&
    preview.totalAllocated + preview.ledgerEntriesTotal > preview.gross + 0.01
  ) {
    return "Invoice Settlement + Ledger Entries cannot exceed Gross Amount.";
  }
  if (
    preview.gross > 0 &&
    Math.abs(
      preview.totalAllocated +
        preview.advance +
        preview.ledgerEntriesTotal -
        preview.gross,
    ) > 0.01
  ) {
    return "Settlement + Advance + Ledger Entries must equal Gross Amount.";
  }

  if (form.party_kind === "OTHER_LEDGER") {
    if (preview.gross <= 0) return "Gross amount must be greater than zero.";
    if (form.allocations.some((a) => a.selected)) {
      return "Other Ledger payments cannot include allocations.";
    }
  }

  if (form.party_kind === "SUPPLIER") {
    if (form.payment_treatment === "against_outstanding") {
      if (preview.totalAllocated <= 0) {
        return "Select and allocate at least one outstanding invoice.";
      }
      const grossInput = toMoneyNumber(form.gross_party_amount);
      if (grossInput > 0 && preview.unallocated > 0.01) {
        return "Against Outstanding requires invoice settlement to equal Gross Supplier Amount (no residual Advance). Use Mixed Allocation to leave a remainder as Supplier Advance.";
      }
      for (const row of selectedAllocations(form)) {
        const alloc = toMoneyNumber(row.allocated_amount);
        if (alloc <= 0) return "Settlement amount must be greater than zero.";
        if (alloc > row.outstanding_amount + 0.0001) {
          return `Settlement for ${row.document_number} exceeds outstanding.`;
        }
        if (toMoneyNumber(row.tds_amount) < 0 || toMoneyNumber(row.discount_amount) < 0) {
          return "TDS and Discount cannot be negative.";
        }
        if (toMoneyNumber(row.tds_amount) > 0 && !row.tds_section_id.trim()) {
          return `Select TDS Section for this TDS amount (${row.document_number}).`;
        }
      }
    } else if (form.payment_treatment === "mixed_allocation") {
      if (preview.gross <= 0) {
        return "Gross Supplier Amount is required for Mixed Allocation.";
      }
      if (preview.totalAllocated <= 0) {
        return "Mixed Allocation requires at least one invoice settlement (or switch to Advance / On Account).";
      }
      if (preview.totalAllocated >= preview.gross - preview.ledgerEntriesTotal - 0.01) {
        return "Mixed Allocation needs a remaining Supplier Advance amount. Reduce invoice settlement or switch to Against Outstanding.";
      }
      for (const row of selectedAllocations(form)) {
        const alloc = toMoneyNumber(row.allocated_amount);
        if (alloc <= 0) return "Settlement amount must be greater than zero.";
        if (alloc > row.outstanding_amount + 0.0001) {
          return `Settlement for ${row.document_number} exceeds outstanding.`;
        }
        if (toMoneyNumber(row.tds_amount) < 0 || toMoneyNumber(row.discount_amount) < 0) {
          return "TDS and Discount cannot be negative.";
        }
        if (toMoneyNumber(row.tds_amount) > 0 && !row.tds_section_id.trim()) {
          return `Select TDS Section for this TDS amount (${row.document_number}).`;
        }
      }
    } else if (preview.gross <= 0) {
      return "Gross supplier amount must be greater than zero for Supplier Advance.";
    }
  }

  if (form.party_kind === "CUSTOMER_REFUND") {
    const selected = selectedAllocations(form);
    if (selected.length === 0) {
      if (preview.gross <= 0) return "Gross refund amount must be greater than zero.";
      if (!form.other_ledger_id) {
        return "Refund / Adjustment Ledger is required for a direct customer refund without open-item allocation.";
      }
    } else {
      for (const row of selected) {
        const alloc = toMoneyNumber(row.allocated_amount);
        if (alloc <= 0) return "Refund allocation must be greater than zero.";
        if (alloc > row.outstanding_amount + 0.0001) {
          return `Allocation for ${row.document_number} exceeds refundable balance.`;
        }
      }
      if (form.other_ledger_id) {
        return "Refund / Adjustment Ledger cannot be used together with open-item allocations.";
      }
    }
  }

  const adjTds = form.adjustments
    .filter((a) => a.adjustment_type === "SUPPLIER_TDS")
    .reduce((s, a) => s + toMoneyNumber(a.amount), 0);
  if (Math.abs(roundMoney(adjTds) - preview.totalTds) > 0.01 && (preview.totalTds > 0 || adjTds > 0)) {
    return "Total allocation TDS must equal Supplier TDS adjustment total.";
  }

  const adjDiscount = form.adjustments
    .filter((a) => a.adjustment_type === "DISCOUNT_RECEIVED")
    .reduce((s, a) => s + toMoneyNumber(a.amount), 0);
  if (
    Math.abs(roundMoney(adjDiscount) - preview.totalDiscount) > 0.01 &&
    (preview.totalDiscount > 0 || adjDiscount > 0)
  ) {
    return "Total allocation discount must equal Discount Received adjustment total.";
  }

  for (const adj of form.adjustments) {
    const amt = toMoneyNumber(adj.amount);
    if (amt <= 0) return "Adjustment amount must be greater than zero.";
    if (adj.adjustment_type === "DISCOUNT_RECEIVED" && !adj.ledger_id) {
      return "Ledger is required for Discount Received.";
    }
    if (adj.adjustment_type === "OTHER" && !adj.ledger_id) {
      return "Ledger is required for Other Adjustment.";
    }
    if (adj.adjustment_type === "OTHER" && !adj.entry_type) {
      return "Dr/Cr is required for Other Adjustment.";
    }
    if (adj.adjustment_type === "SUPPLIER_TDS" && form.party_kind !== "SUPPLIER") {
      return "Supplier TDS is only allowed on Supplier payments.";
    }
  }

  if (preview.netBank < -0.0001) {
    return "Net cash/bank payment cannot be negative.";
  }

  const pendingFileObjs = form.pendingFiles.map((p) => p.file);
  const attachErr = validatePaymentAttachmentFiles(
    pendingFileObjs,
    form.persistedAttachments.length,
  );
  if (attachErr) return attachErr;

  return null;
}

export function buildCreatePayload(form: PaymentFormState): CreatePaymentVoucherPayload {
  const preview = computePaymentPreview(form);
  const isCash = form.transaction_mode === "CASH";
  const isAdvanceOnly =
    form.party_kind === "SUPPLIER" && form.payment_treatment === "advance_on_account";
  const isDirectCustomerRefund =
    form.party_kind === "CUSTOMER_REFUND" && selectedAllocations(form).length === 0;

  const allocations: PaymentAllocationInput[] =
    form.party_kind === "OTHER_LEDGER" || isAdvanceOnly || isDirectCustomerRefund
      ? []
      : selectedAllocations(form).map((a) => {
          const tdsAmt =
            form.party_kind === "SUPPLIER" ? toMoneyNumber(a.tds_amount) : 0;
          return {
            open_item_id: a.open_item_id,
            allocated_amount: toMoneyNumber(a.allocated_amount),
            tds_amount: tdsAmt,
            tds_section_id: tdsAmt > 0 ? a.tds_section_id.trim() || null : null,
            discount_amount:
              form.party_kind === "SUPPLIER" ? toMoneyNumber(a.discount_amount) : 0,
          };
        });

  const adjustments: PaymentAdjustmentInput[] = form.adjustments.map((adj) => {
    const base: PaymentAdjustmentInput = {
      adjustment_type: adj.adjustment_type,
      amount: toMoneyNumber(adj.amount),
      narration: adj.narration.trim() || null,
    };
    if (adj.adjustment_type === "DISCOUNT_RECEIVED" || adj.adjustment_type === "OTHER") {
      base.ledger_id = adj.ledger_id || null;
    }
    if (adj.adjustment_type === "OTHER" || adj.adjustment_type === "ROUND_OFF") {
      base.entry_type = adj.entry_type;
    }
    return base;
  });

  let otherLedgerId: string | null = null;
  if (form.party_kind === "OTHER_LEDGER") {
    otherLedgerId = form.other_ledger_id || null;
  } else if (isDirectCustomerRefund) {
    otherLedgerId = form.other_ledger_id || null;
  }

  return {
    voucher_date: todayDateInput(),
    warehouse_id: form.warehouse_id,
    party_kind: form.party_kind,
    customer_id: form.party_kind === "CUSTOMER_REFUND" ? form.customer_id : null,
    supplier_id: form.party_kind === "SUPPLIER" ? form.supplier_id : null,
    other_ledger_id: otherLedgerId,
    bank_account_id: isCash ? null : form.bank_account_id || null,
    cash_bank_ledger_id: form.cash_bank_ledger_id,
    transaction_mode: form.transaction_mode,
    cheque_number:
      form.transaction_mode === "CHEQUE" ? form.cheque_number.trim() || null : null,
    cheque_date: form.transaction_mode === "CHEQUE" ? form.cheque_date || null : null,
    utr_number: form.utr_number.trim() || null,
    transaction_reference: form.transaction_reference.trim() || null,
    instrument_date:
      form.transaction_mode === "CHEQUE" ? form.cheque_date || null : form.transaction_date || null,
    transaction_date: form.transaction_date || null,
    // API gross_party_amount is party-only (allocated + advance). Form Gross =
    // party + ledger; ledger lines are sent separately in adjustments.
    // Mixed = allocations.length > 0 AND advance_amount > 0 — no MIXED enum sent.
    gross_party_amount: preview.payloadGross,
    advance_amount: form.party_kind === "SUPPLIER" ? preview.advance : 0,
    narration: form.narration.trim() || null,
    remarks: form.remarks.trim() || null,
    allocations,
    adjustments,
  };
}

export function buildUpdatePayload(form: PaymentFormState): UpdatePaymentVoucherPayload {
  return {
    ...buildCreatePayload(form),
    voucher_date: form.voucher_date || todayDateInput(),
    existing_attachments: form.persistedAttachments,
  };
}

export function isDraftEditable(status?: PaymentVoucherStatus | null): boolean {
  return !status || status === "DRAFT" || status === "REJECTED";
}

export function canCancelStatus(status?: PaymentVoucherStatus | null): boolean {
  return (
    status === "DRAFT" ||
    status === "PENDING_APPROVAL" ||
    status === "APPROVED" ||
    status === "REJECTED"
  );
}

export function canPostStatus(
  status: PaymentVoucherStatus | null | undefined,
  approvalRequired: boolean,
): boolean {
  if (!status) return false;
  if (status === "PENDING_APPROVAL") return false;
  if (status === "APPROVED") return true;
  if (!approvalRequired && status === "DRAFT") return true;
  return false;
}

export const PAYMENT_LIST_PATH = "/accounts/vouchers?tab=payment";
export function paymentViewPath(id: string) {
  return `/accounts/vouchers/payment/${id}`;
}
export function paymentEditPath(id: string) {
  return `/accounts/vouchers/payment/${id}/edit`;
}
