import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { getActivePostingLedgers } from "@/lib/accounts/coa-hierarchy";
import {
  isSchemeSettlementPending,
  loadInvoices,
  normalizeInvoice,
  saveInvoices,
  type InvoiceNearExpirySchemeSettlement,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import {
  filterActiveNearExpirySchemeEntries,
  NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  NEAR_EXPIRY_SCHEME_TYPE_LABEL,
  NEAR_EXPIRY_SETTLEMENT_STATUS_SETTLED,
} from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";
import type { VoucherLine } from "@/app/(app)/accounts/vouchers/voucher-data";
import { EMPTY_LINE } from "@/app/(app)/accounts/vouchers/voucher-data";

export const SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG =
  "This scheme settlement is already settled.";

export type SchemeSettlementDocumentType = "credit_note" | "journal_voucher";

export const SCHEME_SETTLEMENT_DOCUMENT_LABELS: Record<SchemeSettlementDocumentType, string> = {
  credit_note: "Credit Note",
  journal_voucher: "Journal Voucher",
};

export interface PendingSchemeSettlementOption {
  key: string;
  invoiceId: number;
  schemeId: number;
  schemeCode: string;
  schemeName: string;
  schemeType: string;
  schemeStatus: string;
  customerId: number | null;
  customerName: string;
  invoiceNo: string;
  salesOrderNo: string;
  product: string;
  productId: string;
  batchNumber: string;
  batchExpiryDate: string;
  remainingExpiryDays: number;
  benefitType: string;
  benefitValue: number;
  estimatedBenefitAmount: number;
}

export function buildSchemeSettlementKey(
  invoiceId: number,
  schemeCode: string,
  batchNumber: string,
): string {
  return `${invoiceId}:${schemeCode}:${batchNumber}`;
}

function invoiceToSettlementOption(
  invoice: InvoiceRecord,
  entry: InvoiceNearExpirySchemeSettlement,
): PendingSchemeSettlementOption {
  return {
    key: buildSchemeSettlementKey(invoice.id, entry.schemeCode, entry.batchNumber),
    invoiceId: invoice.id,
    schemeId: entry.schemeId,
    schemeCode: entry.schemeCode,
    schemeName: entry.schemeName,
    schemeType: entry.schemeType,
    schemeStatus: entry.schemeStatus,
    customerId: invoice.customerId,
    customerName: entry.customerName ?? invoice.customerName,
    invoiceNo: entry.invoiceNo ?? invoice.invoiceNo,
    salesOrderNo: entry.salesOrderNo ?? invoice.salesOrderNo ?? "",
    product: entry.product,
    productId: entry.productId,
    batchNumber: entry.batchNumber,
    batchExpiryDate: entry.batchExpiryDate,
    remainingExpiryDays: entry.remainingExpiryDays,
    benefitType: entry.benefitType,
    benefitValue: entry.benefitValue,
    estimatedBenefitAmount: entry.estimatedBenefitAmount,
  };
}

function isGeneratedInvoice(invoice: InvoiceRecord): boolean {
  return invoice.invoiceStatus === "sent" && Boolean(invoice.invoiceNo?.trim());
}

/** Pending Near Expiry scheme settlements on posted sales invoices — for CN/JV dropdown. */
export function listPendingSchemeSettlementOptions(): PendingSchemeSettlementOption[] {
  const options: PendingSchemeSettlementOption[] = [];

  for (const invoice of loadInvoices()) {
    if (!isGeneratedInvoice(invoice)) continue;
    if (!invoice.nearExpirySchemeSettlements?.length) continue;

    const activeEntries = filterActiveNearExpirySchemeEntries(invoice.nearExpirySchemeSettlements);
    for (const entry of activeEntries) {
      if (entry.schemeType !== NEAR_EXPIRY_SCHEME_TYPE_LABEL) continue;
      if (entry.schemeStatus && entry.schemeStatus !== NEAR_EXPIRY_SCHEME_STATUS_ACTIVE) continue;
      if (!isSchemeSettlementPending(entry.settlementStatus)) continue;
      options.push(invoiceToSettlementOption(invoice, entry));
    }
  }

  return options.sort((a, b) => a.schemeCode.localeCompare(b.schemeCode));
}

export function findPendingSchemeSettlement(
  key: string,
): PendingSchemeSettlementOption | undefined {
  return listPendingSchemeSettlementOptions().find((opt) => opt.key === key);
}

export function isSchemeSettlementAlreadySettled(key: string): boolean {
  const [invoiceIdStr, schemeCode, batchNumber] = key.split(":");
  const invoiceId = Number(invoiceIdStr);
  if (!Number.isFinite(invoiceId) || !schemeCode || !batchNumber) return false;

  const invoice = loadInvoices().find((inv) => inv.id === invoiceId);
  const entry = invoice?.nearExpirySchemeSettlements?.find(
    (e) => e.schemeCode === schemeCode && e.batchNumber === batchNumber,
  );
  if (!entry) return false;
  return !isSchemeSettlementPending(entry.settlementStatus);
}

export function validateSchemeSettlementAmount(
  amount: number,
  estimatedBenefitAmount: number,
): string | null {
  if (amount <= 0) return "Settlement amount must be greater than zero.";
  if (amount > estimatedBenefitAmount + 0.001) {
    return `Settlement amount cannot exceed estimated benefit (${estimatedBenefitAmount.toFixed(2)}).`;
  }
  return null;
}

export interface MarkSchemeSettlementSettledInput {
  settlementKey: string;
  documentType: SchemeSettlementDocumentType;
  documentNo: string;
  settlementAmount: number;
  settlementDate: string;
  settledBy?: string;
}

export function markSchemeSettlementSettled(input: MarkSchemeSettlementSettledInput): void {
  const [invoiceIdStr, schemeCode, batchNumber] = input.settlementKey.split(":");
  const invoiceId = Number(invoiceIdStr);
  if (!Number.isFinite(invoiceId) || !schemeCode || !batchNumber) {
    throw new Error("Invalid scheme settlement reference.");
  }

  const all = loadInvoices();
  const idx = all.findIndex((inv) => inv.id === invoiceId);
  if (idx < 0) throw new Error("Invoice not found for scheme settlement.");

  const invoice = all[idx];
  const entries = invoice.nearExpirySchemeSettlements ?? [];
  const entryIdx = entries.findIndex(
    (e) => e.schemeCode === schemeCode && e.batchNumber === batchNumber,
  );
  if (entryIdx < 0) throw new Error("Scheme settlement entry not found on invoice.");

  const entry = entries[entryIdx];
  if (!isSchemeSettlementPending(entry.settlementStatus)) {
    throw new Error(SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG);
  }

  const amountErr = validateSchemeSettlementAmount(
    input.settlementAmount,
    entry.estimatedBenefitAmount,
  );
  if (amountErr) throw new Error(amountErr);

  entries[entryIdx] = {
    ...entry,
    settlementStatus: NEAR_EXPIRY_SETTLEMENT_STATUS_SETTLED,
    settlementDocumentType: input.documentType,
    settlementDocumentNo: input.documentNo,
    settlementDate: input.settlementDate,
    settlementAmount: Math.round(input.settlementAmount * 100) / 100,
    settledBy: input.settledBy ?? ACCOUNTS_CURRENT_USER,
  };

  all[idx] = normalizeInvoice({
    ...invoice,
    nearExpirySchemeSettlements: entries,
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  saveInvoices(all);
}

function findLedgerByNameHint(name: string) {
  const ledgers = getActivePostingLedgers();
  const lower = name.trim().toLowerCase();
  return (
    ledgers.find((l) => l.accountName.toLowerCase() === lower) ??
    ledgers.find((l) => l.accountName.toLowerCase().includes(lower)) ??
    null
  );
}

/** Default JV lines for Near Expiry scheme settlement: Dr Sales Promotion · Cr customer receivable. */
export function buildSchemeSettlementJournalLines(
  amount: number,
  customerName: string,
  schemeCode: string,
): VoucherLine[] {
  const rounded = Math.round(amount * 100) / 100;
  const expenseLedger =
    findLedgerByNameHint("Sales Promotion") ??
    findLedgerByNameHint("Advertisement & Marketing") ??
    getActivePostingLedgers().find((l) => l.accountType === "Expense") ??
    null;
  const receivableLedger =
    findLedgerByNameHint(customerName) ??
    findLedgerByNameHint("Trade Receivables") ??
    null;

  return [
    {
      ...EMPTY_LINE(),
      id: Date.now(),
      ledgerId: expenseLedger?.id ?? null,
      ledgerName: expenseLedger?.accountName ?? "Sales Promotion",
      debit: rounded,
      credit: 0,
      remarks: `Near Expiry scheme ${schemeCode}`,
    },
    {
      ...EMPTY_LINE(),
      id: Date.now() + 1,
      ledgerId: receivableLedger?.id ?? null,
      ledgerName: receivableLedger?.accountName ?? customerName,
      debit: 0,
      credit: rounded,
      remarks: `Scheme settlement ${schemeCode}`,
    },
  ];
}

export function formatSchemeSettlementDocumentType(
  type: SchemeSettlementDocumentType | undefined,
): string {
  if (!type) return "—";
  return SCHEME_SETTLEMENT_DOCUMENT_LABELS[type] ?? type;
}
