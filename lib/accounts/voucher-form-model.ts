/**
 * Canonical voucher form model — shared across Receipt, Payment, Contra and Journal.
 * Persistence still uses AccountingVoucher + VoucherLine; adapters bridge the two.
 */

import type { RecordStatus } from "@/app/(app)/accounts/data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  buildContraVoucherLines,
  buildPaymentVoucherLines,
  buildReceiptVoucherLines,
  calcLineTotals,
  compactPostedVoucherLines,
  generateVoucherNumber,
  getVoucherById,
  inferVoucherEntryMode,
  lineCreditAmount,
  lineDebitAmount,
  loadVouchers,
  parseCashVoucherFromLines,
  parseContraVoucherFromLines,
  validateContraVoucherForPost,
  validatePaymentVoucherForPost,
  validateReceiptVoucherForPost,
  validateVoucherForPost,
  type AccountingVoucher,
  type SimpleCashVoucherInput,
  type SimpleContraVoucherInput,
  type VoucherEntryMode,
  type VoucherLine,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { applyAutoPartyToLines } from "@/lib/accounts/voucher-ledger-groups";
import { roundMoney } from "@/lib/accounts/money-format";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import {
  defaultEntryReferenceType,
  referenceTypeRequiresDocument,
  referenceTypeShowsAllocationPicker,
  type VoucherReferenceType,
} from "@/lib/accounts/voucher-reference-types";
import type { VoucherAllocationLine } from "@/lib/accounts/voucher-posting-flow";

export type VoucherEntryType = "DEBIT" | "CREDIT";

export type VoucherAllocationDocumentType =
  | "invoice"
  | "bill"
  | "credit_note"
  | "debit_note"
  | "opening_balance"
  | "advance"
  | "other";

export interface VoucherEntryAllocation {
  documentType: VoucherAllocationDocumentType;
  documentId: number | null;
  documentNumber: string;
  outstandingAmount: number;
  allocatedAmount: number;
}

export interface VoucherFormEntry {
  id: number;
  accountId: number | null;
  accountName: string;
  entryType: VoucherEntryType;
  referenceType: VoucherReferenceType;
  referenceId: number | null;
  amount: number;
  remark: string;
  allocations: VoucherEntryAllocation[];
  /** Cost centre when selected ledger has costCenterApplicable */
  costCenterId?: number | null;
  costCenterName?: string;
  /** Free-text / due date for New Reference */
  billWiseDueDate?: string;
}

export interface VoucherFormModel {
  voucherType: VoucherTypeCode;
  voucherDate: string;
  voucherNumber: string;
  referenceNumber: string;
  transactionMode: string;
  narration: string;
  status: RecordStatus;
  financialYearId?: number | null;
  financialYearName?: string;
  entryMode: VoucherEntryMode;
  entries: VoucherFormEntry[];
}

export interface VoucherFormExtras {
  /** Payment TDS gross-up */
  tdsAmount?: number;
  tdsSectionMasterId?: number | null;
  expenseHeadLedgerId?: number | null;
  expenseHeadLedgerName?: string;
  /** Warehouse / branch context for bank account mapping on receipt & payment vouchers. */
  warehouseRef?: string;
}

let _entryIdSeq = 0;
export function nextFormEntryId(): number {
  _entryIdSeq += 1;
  return Date.now() + _entryIdSeq;
}

export function createEmptyFormEntry(
  entryType: VoucherEntryType,
  voucherType?: VoucherTypeCode,
): VoucherFormEntry {
  return {
    id: nextFormEntryId(),
    accountId: null,
    accountName: "",
    entryType,
    referenceType: voucherType ? defaultEntryReferenceType(voucherType, entryType) : "on_account",
    referenceId: null,
    amount: 0,
    remark: "",
    allocations: [],
    costCenterId: null,
    costCenterName: "",
    billWiseDueDate: "",
  };
}

export function createDefaultJournalEntries(voucherType: VoucherTypeCode = "journal"): VoucherFormEntry[] {
  return [createEmptyFormEntry("DEBIT", voucherType), createEmptyFormEntry("CREDIT", voucherType)];
}

export function createDefaultDualEntries(
  voucherType: "receipt" | "payment" | "contra",
): VoucherFormEntry[] {
  return [createEmptyFormEntry("DEBIT", voucherType), createEmptyFormEntry("CREDIT", voucherType)];
}

export function calcFormEntryTotals(entries: VoucherFormEntry[]): {
  totalDebit: number;
  totalCredit: number;
} {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const e of entries) {
    const amt = roundMoney(Number(e.amount) || 0);
    if (amt <= 0) continue;
    if (e.entryType === "DEBIT") totalDebit += amt;
    else totalCredit += amt;
  }
  return { totalDebit: roundMoney(totalDebit), totalCredit: roundMoney(totalCredit) };
}

export function isFormModelBalanced(entries: VoucherFormEntry[]): boolean {
  const { totalDebit, totalCredit } = calcFormEntryTotals(entries);
  return Math.abs(totalDebit - totalCredit) < 0.009 && totalDebit > 0;
}

export function formEntriesToVoucherLines(entries: VoucherFormEntry[]): VoucherLine[] {
  return entries
    .filter((e) => e.accountId != null && (Number(e.amount) || 0) > 0)
    .map((e, i) => {
      const textRef =
        e.allocations[0]?.documentNumber?.trim() ||
        (e.referenceType === "new_reference" ? e.allocations[0]?.documentNumber : "") ||
        "";
      return {
        id: e.id || nextFormEntryId() + i,
        ledgerId: e.accountId,
        ledgerName: e.accountName,
        debit: e.entryType === "DEBIT" ? roundMoney(e.amount) : 0,
        credit: e.entryType === "CREDIT" ? roundMoney(e.amount) : 0,
        remarks: e.remark ?? "",
        costCenterId: e.costCenterId ?? null,
        costCenterName: e.costCenterName ?? "",
        billWiseReferenceType: e.referenceType,
        billWiseReferenceId: e.referenceId,
        billWiseReferenceNo:
          textRef ||
          e.allocations.find((a) => a.documentNumber)?.documentNumber ||
          "",
        billWiseDueDate: e.billWiseDueDate ?? "",
      };
    });
}

export function voucherLinesToFormEntries(
  lines: VoucherLine[],
  voucherType: VoucherTypeCode = "journal",
): VoucherFormEntry[] {
  return lines
    .filter((l) => l.ledgerId && (lineDebitAmount(l) > 0 || lineCreditAmount(l) > 0))
    .map((l) => {
      const entryType: VoucherEntryType = lineDebitAmount(l) > 0 ? "DEBIT" : "CREDIT";
      const referenceType = (l.billWiseReferenceType as VoucherReferenceType | undefined) ??
        defaultEntryReferenceType(voucherType, entryType);
      const refNo = l.billWiseReferenceNo?.trim() ?? "";
      return {
        id: l.id,
        accountId: l.ledgerId,
        accountName: l.ledgerName,
        entryType,
        referenceType,
        referenceId: l.billWiseReferenceId ?? null,
        amount: roundMoney(lineDebitAmount(l) > 0 ? lineDebitAmount(l) : lineCreditAmount(l)),
        remark: l.remarks ?? "",
        allocations: refNo
          ? [
              {
                documentType: "other" as const,
                documentId: l.billWiseReferenceId ?? null,
                documentNumber: refNo,
                outstandingAmount: 0,
                allocatedAmount: 0,
              },
            ]
          : [],
        costCenterId: l.costCenterId ?? null,
        costCenterName: l.costCenterName ?? "",
        billWiseDueDate: l.billWiseDueDate ?? "",
      };
    });
}

export function getFormEntry(
  entries: VoucherFormEntry[],
  entryType: VoucherEntryType,
): VoucherFormEntry | undefined {
  return entries.find((e) => e.entryType === entryType);
}

export function updateFormEntryById(
  entries: VoucherFormEntry[],
  entryId: number,
  patch: Partial<VoucherFormEntry>,
): VoucherFormEntry[] {
  return entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e));
}

export function updateFormEntry(
  entries: VoucherFormEntry[],
  entryType: VoucherEntryType,
  patch: Partial<VoucherFormEntry>,
): VoucherFormEntry[] {
  return entries.map((e) => (e.entryType === entryType ? { ...e, ...patch } : e));
}

export function syncDualEntryAmount(entries: VoucherFormEntry[], amount: number): VoucherFormEntry[] {
  const amt = roundMoney(amount);
  return entries.map((e) => ({ ...e, amount: amt }));
}

function cashInputFromDualEntries(
  entries: VoucherFormEntry[],
  mode: "receipt" | "payment",
  extras?: VoucherFormExtras,
): SimpleCashVoucherInput {
  const debit = getFormEntry(entries, "DEBIT");
  const credit = getFormEntry(entries, "CREDIT");
  const amount = roundMoney(debit?.amount ?? credit?.amount ?? 0);
  const tds = roundMoney(extras?.tdsAmount ?? 0);

  if (mode === "receipt") {
    return {
      partyLedgerId: credit?.accountId ?? null,
      partyLedgerName: credit?.accountName ?? "",
      bankCashLedgerId: debit?.accountId ?? null,
      bankCashLedgerName: debit?.accountName ?? "",
      amount: roundMoney(amount - tds),
      bankAmount: roundMoney(amount - tds),
      accountAmount: amount,
      bankLineRemarks: debit?.remark ?? "",
      partyLineRemarks: credit?.remark ?? "",
      tdsAmount: tds,
      tdsSectionMasterId: extras?.tdsSectionMasterId ?? null,
    };
  }

  const debitId = extras?.expenseHeadLedgerId ?? debit?.accountId ?? null;
  const debitName = extras?.expenseHeadLedgerName || debit?.accountName || "";

  return {
    partyLedgerId: extras?.expenseHeadLedgerId ? null : debit?.accountId ?? null,
    partyLedgerName: extras?.expenseHeadLedgerId ? "" : debit?.accountName ?? "",
    expenseHeadLedgerId: extras?.expenseHeadLedgerId ?? null,
    expenseHeadLedgerName: extras?.expenseHeadLedgerName ?? "",
    bankCashLedgerId: credit?.accountId ?? null,
    bankCashLedgerName: credit?.accountName ?? "",
    amount: roundMoney(amount - tds),
    bankAmount: roundMoney(amount - tds),
    accountAmount: amount,
    bankLineRemarks: credit?.remark ?? "",
    partyLineRemarks: debit?.remark ?? "",
    tdsAmount: tds,
    tdsSectionMasterId: extras?.tdsSectionMasterId ?? null,
  };
}

function contraInputFromDualEntries(entries: VoucherFormEntry[]): SimpleContraVoucherInput {
  const debit = getFormEntry(entries, "DEBIT");
  const credit = getFormEntry(entries, "CREDIT");
  const amount = roundMoney(debit?.amount ?? credit?.amount ?? 0);
  return {
    toLedgerId: debit?.accountId ?? null,
    toLedgerName: debit?.accountName ?? "",
    fromLedgerId: credit?.accountId ?? null,
    fromLedgerName: credit?.accountName ?? "",
    amount,
    fromLineRemarks: credit?.remark ?? "",
    toLineRemarks: debit?.remark ?? "",
  };
}

export function dualEntriesFromCashInput(
  input: SimpleCashVoucherInput,
  mode: "receipt" | "payment",
): VoucherFormEntry[] {
  const gross =
    input.accountAmount != null && input.accountAmount > 0
      ? roundMoney(input.accountAmount)
      : roundMoney((input.bankAmount ?? input.amount) + (input.tdsAmount ?? 0));

  if (mode === "receipt") {
    return [
      {
        id: nextFormEntryId(),
        accountId: input.bankCashLedgerId,
        accountName: input.bankCashLedgerName,
        entryType: "DEBIT",
        referenceType: "on_account",
        referenceId: null,
        amount: roundMoney(input.bankAmount ?? input.amount),
        remark: input.bankLineRemarks ?? "",
        allocations: [],
      },
      {
        id: nextFormEntryId(),
        accountId: input.partyLedgerId,
        accountName: input.partyLedgerName,
        entryType: "CREDIT",
        referenceType: "on_account",
        referenceId: null,
        amount: gross,
        remark: input.partyLineRemarks ?? "",
        allocations: [],
      },
    ];
  }

  const debitId = input.expenseHeadLedgerId ?? input.partyLedgerId;
  const debitName = input.expenseHeadLedgerName || input.partyLedgerName;

  return [
    {
      id: nextFormEntryId(),
      accountId: debitId,
      accountName: debitName,
      entryType: "DEBIT",
      referenceType: "on_account",
      referenceId: null,
      amount: gross,
      remark: input.partyLineRemarks ?? "",
      allocations: [],
    },
    {
      id: nextFormEntryId(),
      accountId: input.bankCashLedgerId,
      accountName: input.bankCashLedgerName,
      entryType: "CREDIT",
      referenceType: "on_account",
      referenceId: null,
      amount: roundMoney(input.bankAmount ?? input.amount),
      remark: input.bankLineRemarks ?? "",
      allocations: [],
    },
  ];
}

export function dualEntriesFromContraInput(input: SimpleContraVoucherInput): VoucherFormEntry[] {
  const amount = roundMoney(input.amount);
  return [
    {
      id: nextFormEntryId(),
      accountId: input.toLedgerId,
      accountName: input.toLedgerName,
      entryType: "DEBIT",
      referenceType: "transfer",
      referenceId: null,
      amount,
      remark: input.toLineRemarks ?? "",
      allocations: [],
    },
    {
      id: nextFormEntryId(),
      accountId: input.fromLedgerId,
      accountName: input.fromLedgerName,
      entryType: "CREDIT",
      referenceType: "transfer",
      referenceId: null,
      amount,
      remark: input.fromLineRemarks ?? "",
      allocations: [],
    },
  ];
}

export function formModelToVoucherLines(
  model: VoucherFormModel,
  extras?: VoucherFormExtras,
  coaRecords?: ChartOfAccount[],
): VoucherLine[] {
  if (model.voucherType === "receipt") {
    return mergeFormEntryMetadataOntoLines(
      buildReceiptVoucherLines(cashInputFromDualEntries(model.entries, "receipt", extras)),
      model.entries,
    );
  }
  if (model.voucherType === "payment") {
    return mergeFormEntryMetadataOntoLines(
      buildPaymentVoucherLines(cashInputFromDualEntries(model.entries, "payment", extras)),
      model.entries,
    );
  }
  if (model.voucherType === "contra") {
    return mergeFormEntryMetadataOntoLines(
      buildContraVoucherLines(contraInputFromDualEntries(model.entries)),
      model.entries,
    );
  }
  const lines = formEntriesToVoucherLines(model.entries);
  return coaRecords ? applyAutoPartyToLines(compactPostedVoucherLines(lines), coaRecords) : lines;
}

/** Copy cost-centre / bill-wise fields from dual-entry form rows onto built voucher lines. */
function mergeFormEntryMetadataOntoLines(
  lines: VoucherLine[],
  entries: VoucherFormEntry[],
): VoucherLine[] {
  return lines.map((line) => {
    const entry = entries.find((e) => {
      if (e.accountId == null || e.accountId !== line.ledgerId) return false;
      if (e.entryType === "DEBIT" && line.debit > 0) return true;
      if (e.entryType === "CREDIT" && line.credit > 0) return true;
      return false;
    });
    if (!entry) return line;
    const textRef =
      entry.allocations.find((a) => a.documentNumber.trim())?.documentNumber.trim() ?? "";
    return {
      ...line,
      costCenterId: entry.costCenterId ?? null,
      costCenterName: entry.costCenterName ?? "",
      billWiseReferenceType: entry.referenceType,
      billWiseReferenceId: entry.referenceId,
      billWiseReferenceNo: textRef,
      billWiseDueDate: entry.billWiseDueDate ?? "",
    };
  });
}

export function calcEntryAllocationTotal(entry: VoucherFormEntry): number {
  return roundMoney(
    entry.allocations.reduce((s, a) => s + (Number(a.allocatedAmount) || 0), 0),
  );
}

export function formEntriesToPostingAllocations(
  model: VoucherFormModel,
  coaRecords?: ChartOfAccount[],
): VoucherAllocationLine[] | undefined {
  if (model.voucherType !== "receipt" && model.voucherType !== "payment") return undefined;

  const partyEntry =
    model.voucherType === "receipt"
      ? getFormEntry(model.entries, "CREDIT")
      : getFormEntry(model.entries, "DEBIT");

  if (!partyEntry) return undefined;

  if (partyEntry.allocations.length > 0) {
    const lines: VoucherAllocationLine[] = [];
    for (const a of partyEntry.allocations) {
      const amt = roundMoney(a.allocatedAmount);
      if (amt <= 0 || !a.documentId) continue;
      if (a.documentType === "invoice" || model.voucherType === "receipt") {
        lines.push({ invoiceId: a.documentId, amount: amt, documentNo: a.documentNumber });
      } else if (a.documentType === "bill" || model.voucherType === "payment") {
        lines.push({ billId: a.documentId, amount: amt, documentNo: a.documentNumber });
      }
    }
    return lines.length ? lines : undefined;
  }

  if (partyEntry.referenceType === "against_invoice" && partyEntry.referenceId) {
    const docNo = partyEntry.allocations[0]?.documentNumber ?? "";
    if (model.voucherType === "receipt") {
      return [
        {
          invoiceId: partyEntry.referenceId,
          amount: roundMoney(partyEntry.amount),
          documentNo: docNo,
        },
      ];
    }
    return [
      {
        billId: partyEntry.referenceId,
        amount: roundMoney(partyEntry.amount),
        documentNo: docNo,
      },
    ];
  }

  return undefined;
}

function validateEntryReferences(
  entry: VoucherFormEntry,
  voucherType: VoucherTypeCode,
  coaRecords?: ChartOfAccount[],
): string | null {
  if (!(Number(entry.amount) > 0) || !entry.accountId) return null;

  if (referenceTypeRequiresDocument(entry.referenceType)) {
    if (referenceTypeShowsAllocationPicker(entry.referenceType)) {
      if (entry.allocations.length > 0) {
        const total = calcEntryAllocationTotal(entry);
        if (Math.abs(total - roundMoney(entry.amount)) > 0.009) {
          return "Invoice allocation total must equal the entry amount.";
        }
        for (const a of entry.allocations) {
          if (a.allocatedAmount > a.outstandingAmount + 0.009) {
            return `Allocation for ${a.documentNumber || "document"} exceeds outstanding amount.`;
          }
        }
        return null;
      }
      if (!entry.referenceId) {
        return "Against Reference is required when Reference Type is Against Reference.";
      }
    }
  }

  if (
    entry.referenceType === "against_invoice" &&
    entry.allocations.length > 0 &&
    Math.abs(calcEntryAllocationTotal(entry) - roundMoney(entry.amount)) > 0.009
  ) {
    return "Invoice allocation total must equal the entry amount.";
  }

  return null;
}

export function validateFormModelForPost(
  model: VoucherFormModel,
  extras?: VoucherFormExtras,
  coaRecords?: ChartOfAccount[],
): string | null {
  const active = model.entries.filter((e) => e.accountId && (Number(e.amount) || 0) > 0);

  if (!active.some((e) => e.entryType === "DEBIT")) {
    return "At least one Debit entry is required.";
  }
  if (!active.some((e) => e.entryType === "CREDIT")) {
    return "At least one Credit entry is required.";
  }

  for (const e of model.entries) {
    if ((Number(e.amount) || 0) > 0 && !e.accountId) {
      return "Account is mandatory for every entry with amount.";
    }
    if (e.accountId && !(Number(e.amount) > 0)) {
      return "Amount must be greater than zero for every selected account.";
    }
    const refErr = validateEntryReferences(e, model.voucherType, coaRecords);
    if (refErr) return refErr;
  }

  if (model.voucherType === "contra") {
    const debit = getFormEntry(model.entries, "DEBIT");
    const credit = getFormEntry(model.entries, "CREDIT");
    if (debit?.accountId && credit?.accountId && debit.accountId === credit.accountId) {
      return "Account (Dr) and Account (Cr) cannot be the same.";
    }
  }

  if (!isFormModelBalanced(model.entries)) {
    return "Total Debit must equal Total Credit before posting.";
  }

  if (model.voucherType === "receipt") {
    return validateReceiptVoucherForPost(cashInputFromDualEntries(model.entries, "receipt", extras));
  }
  if (model.voucherType === "payment") {
    return validatePaymentVoucherForPost(cashInputFromDualEntries(model.entries, "payment", extras));
  }
  if (model.voucherType === "contra") {
    return validateContraVoucherForPost(contraInputFromDualEntries(model.entries));
  }

  const lines = formEntriesToVoucherLines(model.entries);
  return validateVoucherForPost({
    date: model.voucherDate,
    narration: model.narration,
    lines,
    ...(model.financialYearId != null ? { financialYearId: model.financialYearId } : {}),
  });
}

export function accountingVoucherToFormModel(
  voucher: AccountingVoucher,
  coaRecords?: ChartOfAccount[],
): VoucherFormModel {
  const entryMode = inferVoucherEntryMode(voucher);
  let entries: VoucherFormEntry[];

  if (voucher.voucherType === "receipt" || voucher.voucherType === "payment") {
    entries = dualEntriesFromCashInput(
      parseCashVoucherFromLines(voucher.lines, voucher.voucherType),
      voucher.voucherType,
    );
  } else if (voucher.voucherType === "contra") {
    entries = dualEntriesFromContraInput(parseContraVoucherFromLines(voucher.lines));
  } else {
    entries =
      voucher.lines.length > 0
        ? voucherLinesToFormEntries(voucher.lines, voucher.voucherType)
        : createDefaultJournalEntries(voucher.voucherType);
  }

  if (coaRecords) {
    entries = entries.map((e) => {
      if (!e.accountId) return e;
      const ledger = findLedgerById(e.accountId, coaRecords);
      return ledger ? { ...e, accountName: ledger.accountName } : e;
    });
  }

  return {
    voucherType: voucher.voucherType,
    voucherDate: voucher.date,
    voucherNumber: voucher.voucherNumber,
    referenceNumber: voucher.referenceNo ?? "",
    transactionMode: voucher.paymentMode ?? "",
    narration: voucher.narration ?? "",
    status: voucher.status,
    financialYearId: voucher.financialYearId,
    financialYearName: voucher.financialYearName,
    entryMode,
    entries,
  };
}

export function createNewFormModel(
  voucherType: VoucherTypeCode,
  transactionModeDefault: string,
): VoucherFormModel {
  const isJournal = voucherType === "journal";
  return {
    voucherType,
    voucherDate: new Date().toISOString().slice(0, 10),
    voucherNumber: generateVoucherNumber(voucherType, loadVouchers()),
    referenceNumber: "",
    transactionMode: transactionModeDefault,
    narration: "",
    status: "draft",
    entryMode: isJournal ? "double" : "simple",
    entries: isJournal
      ? createDefaultJournalEntries(voucherType)
      : createDefaultDualEntries(voucherType as "receipt" | "payment" | "contra"),
  };
}

export function formModelToCreatePayload(
  model: VoucherFormModel,
  extras?: VoucherFormExtras,
  coaRecords?: ChartOfAccount[],
) {
  return {
    date: model.voucherDate,
    financialYearId: model.financialYearId ?? null,
    financialYearName: model.financialYearName ?? "",
    referenceNo: model.referenceNumber,
    narration: model.narration,
    paymentMode: model.transactionMode,
    lines: formModelToVoucherLines(model, extras, coaRecords),
    status: "draft" as const,
    entryMode: model.entryMode,
  };
}

export function formModelToManualPostExtras(
  model: VoucherFormModel,
  extras?: VoucherFormExtras,
): {
  simpleCashInput?: SimpleCashVoucherInput;
  simpleContraInput?: SimpleContraVoucherInput;
} {
  if (model.voucherType === "receipt" || model.voucherType === "payment") {
    return {
      simpleCashInput: cashInputFromDualEntries(model.entries, model.voucherType, extras),
    };
  }
  if (model.voucherType === "contra") {
    return { simpleContraInput: contraInputFromDualEntries(model.entries) };
  }
  return {};
}

export function hydrateFormModelFromVoucherId(
  voucherId: number,
  coaRecords?: ChartOfAccount[],
): VoucherFormModel | null {
  const voucher = getVoucherById(voucherId);
  if (!voucher) return null;
  return accountingVoucherToFormModel(voucher, coaRecords);
}

/** Journal grid helpers — map row index to entry */
export function journalEntryTotals(entries: VoucherFormEntry[]) {
  return calcLineTotals(formEntriesToVoucherLines(entries));
}
