/**
 * Manual bank transaction CRUD — Step 3.
 */

import type { BankReconActivityEvent } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import { getBankReconAccountById } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import { enrichRecordWithManualDefaults } from "@/lib/accounts/bank-recon-manual-demo-seed";
import { checkManualDuplicate } from "@/lib/accounts/bank-recon-manual-duplicate";
import type {
  DuplicateCheckResult,
  ManualAttachmentMeta,
  ManualTransactionFormState,
} from "@/lib/accounts/bank-recon-manual-types";
import {
  hasBankReference,
  primaryReferenceDisplay,
} from "@/lib/accounts/bank-recon-manual-types";
import {
  createTransactionId,
  getBankReconTransactionById,
  loadBankReconTransactions,
  nextManualTransactionNumber,
  notifyRegisterUpdated,
  upsertBankReconTransaction,
  type BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";

const CURRENT_USER = "Finance User";

function nowIso(): string {
  return new Date().toISOString();
}

function nowDisplay(): string {
  return new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function activity(
  label: string,
  detail: string,
  actor = CURRENT_USER,
  tone: BankReconActivityEvent["tone"] = "blue",
): BankReconActivityEvent {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    detail,
    actor,
    timestamp: nowDisplay(),
    tone,
  };
}

function parseAmount(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function formToDuplicateInput(
  form: ManualTransactionFormState,
  excludeTransactionId?: string,
): Parameters<typeof checkManualDuplicate>[0] {
  return {
    bankAccountId: form.bankAccountId,
    direction: form.direction,
    amount: parseAmount(form.amount),
    referenceNumber: form.referenceNumber,
    utrNumber: form.utrNumber,
    transactionIdRef: form.transactionIdRef,
    chequeNumber: form.chequeNumber,
    bookDate: form.bookDate,
    transactionDate: form.transactionDate,
    narration: form.narration || form.bankNarration,
    excludeTransactionId,
    existing: loadBankReconTransactions(),
  };
}

export function runDuplicateCheck(
  form: ManualTransactionFormState,
  excludeTransactionId?: string,
): DuplicateCheckResult {
  const amount = parseAmount(form.amount);
  if (!form.bankAccountId || amount <= 0) return { type: "none" };
  return checkManualDuplicate(formToDuplicateInput(form, excludeTransactionId));
}

export interface ManualSaveOptions {
  asDraft?: boolean;
  duplicateOverrideReason?: string;
  user?: string;
}

export interface ManualSaveResult {
  ok: boolean;
  error?: string;
  duplicate?: DuplicateCheckResult;
  record?: BankReconTransactionRecord;
}

function buildReferenceFields(form: ManualTransactionFormState): Pick<
  BankReconTransactionRecord,
  "reference" | "utrNumber" | "chequeNo" | "transactionIdRef" | "referenceStatus"
> {
  const ref = primaryReferenceDisplay(form);
  const hasRef = hasBankReference(form);
  return {
    reference: form.referenceNumber.trim() || form.utrNumber.trim() || form.transactionIdRef.trim() || form.chequeNumber.trim() || "",
    utrNumber: form.utrNumber.trim() || null,
    chequeNo: form.chequeNumber.trim() || null,
    transactionIdRef: form.transactionIdRef.trim() || null,
    referenceStatus: hasRef ? "Available" : "Pending",
  };
}

function formToRecordFields(
  form: ManualTransactionFormState,
  opts: ManualSaveOptions,
): Omit<BankReconTransactionRecord, "id" | "activity" | "manualTransactionNumber"> {
  const amount = parseAmount(form.amount);
  const deposit = form.direction === "Deposit" ? amount : 0;
  const withdrawal = form.direction === "Withdrawal" ? amount : 0;
  const refs = buildReferenceFields(form);
  const isDraft = Boolean(opts.asDraft);
  const hasRef = refs.referenceStatus === "Available";

  let verificationStatus: BankReconTransactionRecord["verificationStatus"] = "Awaiting Statement";
  if (!hasRef && !isDraft) verificationStatus = "Reference Pending";
  if (opts.duplicateOverrideReason) verificationStatus = "Review Required";

  let matchStatus: BankReconTransactionRecord["matchStatus"] = "Pending";
  if (opts.duplicateOverrideReason) matchStatus = "Possible Duplicate";

  const narration = form.narration.trim() || form.bankNarration.trim() || "Manual bank entry";

  return {
    bankAccountId: form.bankAccountId,
    statementDate: "",
    valueDate: "",
    bookDate: form.bookDate || null,
    transactionDate: form.transactionDate || form.bookDate || null,
    expectedClearingDate: form.expectedClearingDate || null,
    ...refs,
    narration,
    partyLedger: form.partyLedger.trim() || "—",
    deposit,
    withdrawal,
    runningBalance: null,
    source: "Manual",
    matchStatus,
    verificationStatus,
    reconciliationDate: null,
    relatedRecord: null,
    importedFileName: null,
    importBatchId: null,
    importedBy: null,
    importedOn: null,
    originalRowNumber: null,
    originalRawData: null,
    savedFormatId: null,
    statementPeriodFrom: null,
    statementPeriodTo: null,
    internalStatementId: null,
    linkedManualTransactionId: null,
    manualEntryStatus: isDraft ? "Draft" : "Recorded",
    transactionMode: form.transactionMode,
    chequeDate: form.chequeDate || null,
    depositedDate: form.depositedDate || null,
    drawerBank: form.drawerBank.trim() || null,
    drawerBranch: form.drawerBranch.trim() || null,
    instrumentNumber: form.instrumentNumber.trim() || null,
    bankSlipNumber: form.bankSlipNumber.trim() || null,
    externalReference: form.externalReference.trim() || null,
    partyType: form.partyType,
    expectedVoucherType: form.expectedVoucherType,
    existingVoucherRef: form.existingVoucherRef.trim() || null,
    customerVendorRef: form.customerVendorRef.trim() || null,
    invoiceReference: form.invoiceReference.trim() || null,
    purposeCategory: form.purposeCategory.trim() || null,
    costCentre: form.costCentre.trim() || null,
    internalRemarks: form.internalRemarks.trim() || null,
    bankNarration: form.bankNarration.trim() || null,
    importedNarration: null,
    followUpNote: form.followUpNote.trim() || null,
    currency: form.currency || "INR",
    attachments: form.attachments,
    createdBy: opts.user ?? CURRENT_USER,
    createdOn: nowIso(),
    updatedBy: opts.user ?? CURRENT_USER,
    updatedOn: nowIso(),
    cancelReason: null,
    possibleDuplicateOverrideReason: opts.duplicateOverrideReason ?? null,
  };
}

export function validateManualForm(
  form: ManualTransactionFormState,
  asDraft: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.bankAccountId) errors.bankAccountId = "Bank account is required";
  if (!asDraft) {
    if (!form.bookDate) errors.bookDate = "Book date is required";
    const amt = parseAmount(form.amount);
    if (amt <= 0) errors.amount = "Amount must be greater than zero";
  }
  return errors;
}

export function saveManualTransaction(
  form: ManualTransactionFormState,
  opts: ManualSaveOptions = {},
): ManualSaveResult {
  const errors = validateManualForm(form, Boolean(opts.asDraft));
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: Object.values(errors)[0] };
  }

  if (!opts.asDraft) {
    const dup = runDuplicateCheck(form);
    if (dup.type === "exact") {
      return { ok: false, error: "Exact duplicate detected", duplicate: dup };
    }
    if (dup.type === "possible" && !opts.duplicateOverrideReason) {
      return { ok: false, error: "Possible duplicate — review required", duplicate: dup };
    }
  }

  const user = opts.user ?? CURRENT_USER;
  const fields = formToRecordFields(form, { ...opts, user });
  const mbtNumber = nextManualTransactionNumber(form.bankAccountId);

  const events: BankReconActivityEvent[] = [];
  if (opts.asDraft) {
    events.push(activity("Draft saved", `Manual transaction draft ${mbtNumber}`, user, "slate"));
  } else {
    events.push(activity("Manual transaction created", `${mbtNumber} · ${fields.narration}`, user));
    if (opts.duplicateOverrideReason) {
      events.push(
        activity("Possible duplicate overridden", opts.duplicateOverrideReason, user, "amber"),
      );
      events.push(activity("Duplicate warning shown", "User continued as separate transaction", "System", "amber"));
    }
  }

  const record = enrichRecordWithManualDefaults({
    ...fields,
    id: createTransactionId(),
    manualTransactionNumber: mbtNumber,
    activity: events,
  });

  upsertBankReconTransaction(record);
  notifyRegisterUpdated();
  return { ok: true, record };
}

export function recordToForm(record: BankReconTransactionRecord): ManualTransactionFormState {
  const direction = record.deposit > 0 ? "Deposit" : "Withdrawal";
  const amount = record.deposit || record.withdrawal;
  return {
    bankAccountId: record.bankAccountId,
    direction,
    transactionMode: record.transactionMode ?? "NEFT",
    amount: amount ? String(amount) : "",
    currency: record.currency ?? "INR",
    referenceNumber: record.reference && !record.reference.startsWith("UTR") && record.reference !== record.utrNumber
      ? record.reference
      : "",
    utrNumber: record.utrNumber ?? "",
    transactionIdRef: record.transactionIdRef ?? "",
    chequeNumber: record.chequeNo ?? "",
    instrumentNumber: record.instrumentNumber ?? "",
    bankSlipNumber: record.bankSlipNumber ?? "",
    externalReference: record.externalReference ?? "",
    narration: record.narration,
    partyType: (record.partyType as ManualTransactionFormState["partyType"]) ?? "Unknown",
    partyLedger: record.partyLedger === "—" ? "" : record.partyLedger,
    expectedVoucherType: record.expectedVoucherType ?? "Unknown",
    existingVoucherRef: record.existingVoucherRef ?? "",
    customerVendorRef: record.customerVendorRef ?? "",
    invoiceReference: record.invoiceReference ?? "",
    purposeCategory: record.purposeCategory ?? "",
    costCentre: record.costCentre ?? "",
    bookDate: record.bookDate ?? "",
    transactionDate: record.transactionDate ?? "",
    expectedClearingDate: record.expectedClearingDate ?? "",
    chequeDate: record.chequeDate ?? "",
    depositedDate: record.depositedDate ?? "",
    drawerBank: record.drawerBank ?? "",
    drawerBranch: record.drawerBranch ?? "",
    internalRemarks: record.internalRemarks ?? "",
    bankNarration: record.bankNarration ?? "",
    followUpNote: record.followUpNote ?? "",
    attachments: record.attachments ?? [],
  };
}

export function canEditManualTransaction(record: BankReconTransactionRecord): boolean {
  if (record.source !== "Manual" && record.source !== "Manual + Statement") return false;
  if (record.manualEntryStatus === "Cancelled") return false;
  if (record.matchStatus === "Matched") return false;
  if (record.reconciliationDate) return false;
  if (record.manualEntryStatus === "Draft") return true;
  if (record.source === "Manual + Statement") return true; // metadata only
  if (record.verificationStatus === "Verified") return false;
  return record.manualEntryStatus === "Recorded";
}

export function canCancelManualTransaction(record: BankReconTransactionRecord): boolean {
  if (record.source !== "Manual") return false;
  if (record.manualEntryStatus === "Cancelled") return false;
  if (record.matchStatus === "Matched") return false;
  if (record.reconciliationDate) return false;
  if (record.relatedRecord) return false;
  return true;
}

export function isStatementLinked(record: BankReconTransactionRecord): boolean {
  return record.source === "Manual + Statement";
}

export function updateManualTransaction(
  id: string,
  form: ManualTransactionFormState,
  opts: { duplicateOverrideReason?: string; user?: string } = {},
): ManualSaveResult {
  const existing = getBankReconTransactionById(id);
  if (!existing) return { ok: false, error: "Transaction not found" };
  if (!canEditManualTransaction(existing)) return { ok: false, error: "This transaction cannot be edited" };

  const errors = validateManualForm(form, existing.manualEntryStatus === "Draft");
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: Object.values(errors)[0] };
  }

  const linked = isStatementLinked(existing);
  if (!linked) {
    const dup = runDuplicateCheck(form, id);
    if (dup.type === "exact") return { ok: false, error: "Exact duplicate detected", duplicate: dup };
    if (dup.type === "possible" && !opts.duplicateOverrideReason) {
      return { ok: false, error: "Possible duplicate — review required", duplicate: dup };
    }
  }

  const user = opts.user ?? CURRENT_USER;
  const changes: string[] = [];
  const newFields = formToRecordFields(form, {
    asDraft: existing.manualEntryStatus === "Draft",
    duplicateOverrideReason: opts.duplicateOverrideReason ?? existing.possibleDuplicateOverrideReason ?? undefined,
    user,
  });

  const track = (label: string, oldVal: string | number | null | undefined, newVal: string | number | null | undefined) => {
    const o = oldVal ?? "—";
    const n = newVal ?? "—";
    if (String(o) !== String(n)) changes.push(`${label}: ${o} → ${n}`);
  };

  if (linked) {
    track("Party / Ledger", existing.partyLedger, newFields.partyLedger);
    track("Expected Voucher Type", existing.expectedVoucherType, newFields.expectedVoucherType);
    track("Internal Remarks", existing.internalRemarks, newFields.internalRemarks);
    track("Follow-up Note", existing.followUpNote, newFields.followUpNote);
  } else {
    track("Book Date", existing.bookDate, newFields.bookDate);
    track("Amount", existing.deposit || existing.withdrawal, newFields.deposit || newFields.withdrawal);
    track("Reference", existing.reference, newFields.reference);
  }

  const activityEvents = [...existing.activity];
  if (changes.length > 0) {
    activityEvents.push(activity("Transaction edited", changes.join("; "), user, "purple"));
  }
  if (opts.duplicateOverrideReason && !existing.possibleDuplicateOverrideReason) {
    activityEvents.push(activity("Possible duplicate overridden", opts.duplicateOverrideReason, user, "amber"));
  }

  const updated = enrichRecordWithManualDefaults({
    ...existing,
    ...(linked
      ? {
          partyLedger: newFields.partyLedger,
          partyType: newFields.partyType,
          expectedVoucherType: newFields.expectedVoucherType,
          internalRemarks: newFields.internalRemarks,
          followUpNote: newFields.followUpNote,
          purposeCategory: newFields.purposeCategory,
          costCentre: newFields.costCentre,
          invoiceReference: newFields.invoiceReference,
          customerVendorRef: newFields.customerVendorRef,
          existingVoucherRef: newFields.existingVoucherRef,
        }
      : newFields),
    id: existing.id,
    manualTransactionNumber: existing.manualTransactionNumber,
    manualEntryStatus: existing.manualEntryStatus,
    source: existing.source,
    statementDate: existing.statementDate,
    valueDate: existing.valueDate,
    importedNarration: existing.importedNarration,
    importBatchId: existing.importBatchId,
    importedFileName: existing.importedFileName,
    importedBy: existing.importedBy,
    importedOn: existing.importedOn,
    runningBalance: existing.runningBalance,
    createdBy: existing.createdBy,
    createdOn: existing.createdOn,
    updatedBy: user,
    updatedOn: nowIso(),
    activity: activityEvents,
  });

  upsertBankReconTransaction(updated);
  notifyRegisterUpdated();
  return { ok: true, record: updated };
}

export function updateManualReference(
  id: string,
  fields: { utrNumber?: string; referenceNumber?: string; transactionIdRef?: string; chequeNumber?: string },
  user = CURRENT_USER,
): ManualSaveResult {
  const existing = getBankReconTransactionById(id);
  if (!existing) return { ok: false, error: "Transaction not found" };
  if (existing.source !== "Manual" && existing.source !== "Manual + Statement") {
    return { ok: false, error: "Not a manual transaction" };
  }
  if (existing.manualEntryStatus === "Cancelled") return { ok: false, error: "Transaction is cancelled" };
  if (isStatementLinked(existing)) return { ok: false, error: "Cannot update reference after statement verification" };

  const form = recordToForm(existing);
  if (fields.utrNumber !== undefined) form.utrNumber = fields.utrNumber;
  if (fields.referenceNumber !== undefined) form.referenceNumber = fields.referenceNumber;
  if (fields.transactionIdRef !== undefined) form.transactionIdRef = fields.transactionIdRef;
  if (fields.chequeNumber !== undefined) form.chequeNumber = fields.chequeNumber;

  const dup = runDuplicateCheck(form, id);
  if (dup.type === "exact") return { ok: false, error: "Exact duplicate detected", duplicate: dup };

  const refs = buildReferenceFields(form);
  const oldRef = existing.reference || existing.utrNumber || existing.chequeNo || "—";

  const updated = enrichRecordWithManualDefaults({
    ...existing,
    reference: refs.reference,
    utrNumber: refs.utrNumber,
    chequeNo: refs.chequeNo,
    transactionIdRef: refs.transactionIdRef,
    referenceStatus: refs.referenceStatus,
    verificationStatus:
      refs.referenceStatus === "Available" && existing.verificationStatus === "Reference Pending"
        ? "Awaiting Statement"
        : existing.verificationStatus,
    updatedBy: user,
    updatedOn: nowIso(),
    activity: [
      ...existing.activity,
      activity(
        "Reference updated",
        `${oldRef} → ${refs.reference || refs.utrNumber || refs.chequeNo || "—"}`,
        user,
        "emerald",
      ),
    ],
  });

  upsertBankReconTransaction(updated);
  notifyRegisterUpdated();
  return { ok: true, record: updated };
}

export function cancelManualTransaction(
  id: string,
  reason: string,
  user = CURRENT_USER,
): ManualSaveResult {
  const existing = getBankReconTransactionById(id);
  if (!existing) return { ok: false, error: "Transaction not found" };
  if (!canCancelManualTransaction(existing)) {
    return { ok: false, error: "This transaction cannot be cancelled" };
  }
  if (!reason.trim()) return { ok: false, error: "Cancellation reason is required" };

  const updated = enrichRecordWithManualDefaults({
    ...existing,
    manualEntryStatus: "Cancelled",
    cancelReason: reason.trim(),
    updatedBy: user,
    updatedOn: nowIso(),
    activity: [
      ...existing.activity,
      activity("Transaction cancelled", reason.trim(), user, "slate"),
    ],
  });

  upsertBankReconTransaction(updated);
  notifyRegisterUpdated();
  return { ok: true, record: updated };
}

export function addManualAttachment(
  id: string,
  attachment: Omit<ManualAttachmentMeta, "id" | "uploadedOn">,
  user = CURRENT_USER,
): ManualSaveResult {
  const existing = getBankReconTransactionById(id);
  if (!existing) return { ok: false, error: "Transaction not found" };

  const meta: ManualAttachmentMeta = {
    ...attachment,
    id: `att-${Date.now()}`,
    uploadedOn: nowIso(),
    uploadedBy: user,
  };

  const updated = enrichRecordWithManualDefaults({
    ...existing,
    attachments: [...(existing.attachments ?? []), meta],
    updatedBy: user,
    updatedOn: nowIso(),
    activity: [
      ...existing.activity,
      activity("Attachment added", meta.fileName, user, "purple"),
    ],
  });

  upsertBankReconTransaction(updated);
  notifyRegisterUpdated();
  return { ok: true, record: updated };
}

export function getManualAccountDisplay(bankAccountId: string): {
  bankName: string;
  maskedNumber: string;
  accountType: string;
} {
  const acc = getBankReconAccountById(bankAccountId);
  if (!acc) return { bankName: "—", maskedNumber: "—", accountType: "—" };
  return {
    bankName: acc.bankName,
    maskedNumber: acc.accountNumber.replace(/\d(?=\d{4})/g, "•"),
    accountType: acc.accountType,
  };
}
