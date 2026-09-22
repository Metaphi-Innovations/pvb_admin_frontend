import { roundMoney } from "@/lib/accounts/money-format";
import type {
  CreateJournalVoucherPayload,
  JournalAttachmentMeta,
  JournalEligibleTdsOpenItem,
  JournalPendingFile,
  JournalTdsAllocationDetail,
  JournalTdsAllocationPayload,
  JournalTdsApplicationMode,
  JournalTdsNature,
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

export function isTdsSystemLedger(
  systemLedgerType: string | null | undefined,
): systemLedgerType is JournalTdsNature {
  return (
    systemLedgerType === "TDS_RECEIVABLE" || systemLedgerType === "TDS_PAYABLE"
  );
}

export function resolveJournalTdsNature(form: {
  debit_system_ledger_type: string;
  credit_system_ledger_type: string;
}): JournalTdsNature | null {
  const debit = isTdsSystemLedger(form.debit_system_ledger_type);
  const credit = isTdsSystemLedger(form.credit_system_ledger_type);
  if (debit && credit) return null;
  if (debit) return form.debit_system_ledger_type as JournalTdsNature;
  if (credit) return form.credit_system_ledger_type as JournalTdsNature;
  return null;
}

export function resolveJournalPartyLedgerId(form: {
  debit_ledger_id: string;
  credit_ledger_id: string;
  debit_system_ledger_type: string;
  credit_system_ledger_type: string;
}): string {
  if (isTdsSystemLedger(form.debit_system_ledger_type)) {
    return form.credit_ledger_id;
  }
  if (isTdsSystemLedger(form.credit_system_ledger_type)) {
    return form.debit_ledger_id;
  }
  return "";
}

export function calcTdsTaxAmount(taxable: number, rate: number): number {
  return roundMoney((taxable * rate) / 100);
}

export type JournalTdsAllocationFormRow = {
  open_item_id: string;
  invoice_number: string;
  invoice_date: string;
  original_amount: string;
  outstanding_amount: string;
  tds_section_id: string;
  tds_section_label: string;
  tax_rate: string;
  taxable_amount: string;
  tax_amount: string;
};

export type JournalFormState = {
  voucher_date: string;
  warehouse_id: string;
  reference_number: string;
  debit_ledger_id: string;
  debit_ledger_name: string;
  debit_ledger_code: string;
  debit_source_entity_type: string;
  debit_system_ledger_type: string;
  credit_ledger_id: string;
  credit_ledger_name: string;
  credit_ledger_code: string;
  credit_source_entity_type: string;
  credit_system_ledger_type: string;
  amount: string;
  narration: string;
  persistedAttachments: JournalAttachmentMeta[];
  pendingFiles: JournalPendingFile[];
  party_ledger_id: string;
  tds_application_mode: JournalTdsApplicationMode;
  tds_section_id: string;
  tds_section_label: string;
  tds_rate: string;
  tds_on_account_taxable: string;
  tds_allocations: JournalTdsAllocationFormRow[];
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
    debit_system_ledger_type: "",
    credit_ledger_id: "",
    credit_ledger_name: "",
    credit_ledger_code: "",
    credit_source_entity_type: "",
    credit_system_ledger_type: "",
    amount: "",
    narration: "",
    persistedAttachments: [],
    pendingFiles: [],
    party_ledger_id: "",
    tds_application_mode: "AGAINST_INVOICE",
    tds_section_id: "",
    tds_section_label: "",
    tds_rate: "",
    tds_on_account_taxable: "",
    tds_allocations: [],
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

function mapAllocationsFromDetail(
  rows: JournalTdsAllocationDetail[] | null | undefined,
): JournalTdsAllocationFormRow[] {
  if (!rows?.length) return [];
  return rows
    .filter((r) => r.open_item_id)
    .map((r) => {
      const snap = (r.open_item_snapshot ?? {}) as Record<string, unknown>;
      const sectionSnap = (r.tds_section_snapshot ?? {}) as Record<string, unknown>;
      return {
        open_item_id: String(r.open_item_id),
        invoice_number:
          r.open_item?.document_number ||
          String(snap.document_number ?? "") ||
          "—",
        invoice_date: formatDateInput(
          r.open_item?.document_date ?? snap.document_date,
        ),
        original_amount: String(
          r.open_item?.original_amount ?? snap.original_amount ?? "",
        ),
        outstanding_amount: String(
          r.open_item?.outstanding_amount ?? snap.outstanding_amount ?? "",
        ),
        tds_section_id: r.tds_section_id,
        tds_section_label:
          r.tds_section?.tds_section_name ||
          String(sectionSnap.tds_section_name ?? sectionSnap.tds_code ?? ""),
        tax_rate: String(r.tax_rate ?? ""),
        taxable_amount: String(r.taxable_amount ?? ""),
        tax_amount: String(r.tax_amount ?? ""),
      };
    });
}

export function mapDetailToForm(detail: JournalVoucherDetail): JournalFormState {
  const base = emptyJournalForm();
  const mode = detail.tds_application_mode ?? "AGAINST_INVOICE";
  const firstAlloc = detail.tds_allocations?.[0];
  const sectionSnap = (firstAlloc?.tds_section_snapshot ??
    {}) as Record<string, unknown>;
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
    debit_system_ledger_type: detail.debit_ledger?.system_ledger_type || "",
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
    credit_system_ledger_type: detail.credit_ledger?.system_ledger_type || "",
    amount: String(toMoneyNumber(detail.amount) || ""),
    narration: detail.narration || "",
    persistedAttachments: normalizePersistedAttachments(detail.attachments),
    pendingFiles: [],
    party_ledger_id: detail.party_ledger_id || "",
    tds_application_mode: mode,
    tds_section_id: firstAlloc?.tds_section_id || "",
    tds_section_label:
      firstAlloc?.tds_section?.tds_section_name ||
      String(sectionSnap.tds_section_name ?? "") ||
      "",
    tds_rate: String(firstAlloc?.tax_rate ?? sectionSnap.tds_rate ?? ""),
    tds_on_account_taxable:
      mode === "ON_ACCOUNT" && firstAlloc
        ? String(firstAlloc.taxable_amount ?? "")
        : "",
    tds_allocations: mapAllocationsFromDetail(detail.tds_allocations),
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

  const tdsNature = resolveJournalTdsNature(form);
  if (!tdsNature) {
    if (
      isTdsSystemLedger(form.debit_system_ledger_type) &&
      isTdsSystemLedger(form.credit_system_ledger_type)
    ) {
      return "TDS ledgers cannot be used on both debit and credit sides.";
    }
    return null;
  }

  const partyId = resolveJournalPartyLedgerId(form) || form.party_ledger_id;
  if (!partyId) return "Party ledger is required for TDS Journal Voucher.";

  const expectedEntity =
    tdsNature === "TDS_RECEIVABLE" ? "Customer" : "Supplier";
  const partyEntity = isTdsSystemLedger(form.debit_system_ledger_type)
    ? form.credit_source_entity_type
    : form.debit_source_entity_type;
  if (partyEntity !== expectedEntity) {
    return `For ${tdsNature}, the non-TDS side must be a ${expectedEntity} ledger.`;
  }

  if (!form.tds_section_id) return "TDS Section is required.";
  const rate = toMoneyNumber(form.tds_rate);
  if (rate <= 0) return "TDS Rate must be greater than zero.";

  if (form.tds_application_mode === "ON_ACCOUNT") {
    const taxable = toMoneyNumber(form.tds_on_account_taxable);
    if (taxable <= 0) return "Taxable amount is required for On Account TDS.";
    const tax = calcTdsTaxAmount(taxable, rate);
    if (Math.abs(tax - amount) > 0.0001) {
      return `On Account TDS amount (${tax}) must equal Journal amount (${amount}).`;
    }
    return null;
  }

  if (!form.tds_allocations.length) {
    return "Select at least one invoice for Against Invoice TDS.";
  }
  let sum = 0;
  for (const row of form.tds_allocations) {
    if (!row.open_item_id) return "Each allocation must reference an open item.";
    const rowTax = toMoneyNumber(row.tax_amount);
    const rowBase = toMoneyNumber(row.taxable_amount);
    if (rowBase <= 0) return "TDS base amount must be greater than zero.";
    if (rowTax <= 0) return "TDS amount must be greater than zero.";
    const outstanding = toMoneyNumber(row.outstanding_amount);
    if (rowTax > outstanding + 0.0001) {
      return `TDS for ${row.invoice_number} exceeds outstanding.`;
    }
    sum = roundMoney(sum + rowTax);
  }
  if (Math.abs(sum - amount) > 0.0001) {
    return `Allocated TDS (${sum}) must equal Journal amount (${amount}).`;
  }
  return null;
}

export function buildTdsPayloadFromForm(
  form: JournalFormState,
): {
  party_ledger_id: string | null;
  tds_application_mode: JournalTdsApplicationMode | null;
  tds_allocations: JournalTdsAllocationPayload[] | null;
} {
  const nature = resolveJournalTdsNature(form);
  if (!nature) {
    return {
      party_ledger_id: null,
      tds_application_mode: null,
      tds_allocations: null,
    };
  }

  const party_ledger_id =
    resolveJournalPartyLedgerId(form) || form.party_ledger_id || null;
  const rate = toMoneyNumber(form.tds_rate);

  if (form.tds_application_mode === "ON_ACCOUNT") {
    const taxable = toMoneyNumber(form.tds_on_account_taxable);
    return {
      party_ledger_id,
      tds_application_mode: "ON_ACCOUNT",
      tds_allocations: [
        {
          open_item_id: null,
          tds_section_id: form.tds_section_id,
          taxable_amount: taxable,
          tax_amount: calcTdsTaxAmount(taxable, rate),
        },
      ],
    };
  }

  return {
    party_ledger_id,
    tds_application_mode: "AGAINST_INVOICE",
    tds_allocations: form.tds_allocations.map((row) => ({
      open_item_id: row.open_item_id,
      tds_section_id: row.tds_section_id || form.tds_section_id,
      taxable_amount: toMoneyNumber(row.taxable_amount),
      tax_amount: toMoneyNumber(row.tax_amount),
    })),
  };
}

export function buildCreatePayload(form: JournalFormState): CreateJournalVoucherPayload {
  const tds = buildTdsPayloadFromForm(form);
  return {
    voucher_date: form.voucher_date,
    warehouse_id: form.warehouse_id,
    debit_ledger_id: form.debit_ledger_id,
    credit_ledger_id: form.credit_ledger_id,
    amount: toMoneyNumber(form.amount),
    reference_number: form.reference_number.trim() || null,
    narration: form.narration.trim(),
    ...tds,
  };
}

export function buildUpdatePayload(form: JournalFormState): UpdateJournalVoucherPayload {
  return {
    ...buildCreatePayload(form),
    existing_attachments: form.persistedAttachments,
  };
}

export function allocationFromOpenItem(
  item: JournalEligibleTdsOpenItem,
  section: { id: string; label: string; rate: string },
): JournalTdsAllocationFormRow {
  const rate = toMoneyNumber(section.rate);
  const outstanding = toMoneyNumber(item.outstanding_amount);
  return {
    open_item_id: item.open_item_id,
    invoice_number: item.invoice_number,
    invoice_date: formatDateInput(item.invoice_date),
    original_amount: item.original_amount,
    outstanding_amount: item.outstanding_amount,
    tds_section_id: section.id,
    tds_section_label: section.label,
    tax_rate: String(rate),
    taxable_amount: String(outstanding),
    tax_amount: String(calcTdsTaxAmount(outstanding, rate)),
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
