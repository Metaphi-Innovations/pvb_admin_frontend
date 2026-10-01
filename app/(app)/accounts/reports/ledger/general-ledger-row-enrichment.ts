/**
 * General Ledger report — enrich voucher rows with party, tax, and reference fields
 * from Customer/Vendor Master and source transaction modules.
 */

import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";
import { resolveTransactionDetail } from "@/lib/accounts/transaction-detail-data";
import { loadTdsPartyWiseRows } from "@/lib/accounts/tds-party-wise-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { getActiveVendors } from "@/app/(app)/masters/vendors/vendor-data";
import type { AccountingVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  getInvoiceAmountBreakup,
  loadInvoices,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";

export const GL_EMPTY = "—";

export interface GeneralLedgerEnrichedFields {
  partyName: string;
  gstin: string;
  pan: string;
  expenseHead: string;
  particularsNarration: string;
  bankCash: string;
  tdsSection: string;
  tdsAmount: number | null;
  gstAmount: number | null;
  referenceNo: string;
}

function glText(value?: string | null): string {
  const s = value?.trim();
  return s ? s : GL_EMPTY;
}

function resolvePartyTaxFromMaster(
  partyName?: string,
  contactId?: number | null,
  partyType?: string,
): { gstin?: string; pan?: string } | null {
  const isVendor = partyType === "Vendor" || partyType === "Supplier";

  if (contactId) {
    if (isVendor) {
      const vendor = getActiveVendors().find((v) => v.id === contactId);
      if (vendor) {
        return {
          gstin: vendor.gstApplicable ? vendor.gstNumber : undefined,
          pan: vendor.panNumber,
        };
      }
    } else {
      const customer = loadCustomers().find((c) => c.id === contactId);
      if (customer) {
        return {
          gstin: customer.gstApplicable ? customer.gstin : undefined,
          pan: customer.pan,
        };
      }
    }
  }

  const name = partyName?.trim();
  if (!name) return null;

  const customer = loadCustomers().find(
    (c) => c.customerName.trim().toLowerCase() === name.toLowerCase(),
  );
  if (customer) {
    return {
      gstin: customer.gstApplicable ? customer.gstin : undefined,
      pan: customer.pan,
    };
  }

  const vendor = getActiveVendors().find(
    (v) => v.vendorName.trim().toLowerCase() === name.toLowerCase(),
  );
  if (vendor) {
    return {
      gstin: vendor.gstApplicable ? vendor.gstNumber : undefined,
      pan: vendor.panNumber,
    };
  }

  return null;
}

function findTdsForVoucher(voucherNo: string) {
  const trimmed = voucherNo.trim();
  if (!trimmed) return undefined;
  return loadTdsPartyWiseRows().find(
    (r) =>
      r.voucherNo === trimmed ||
      trimmed.includes(r.voucherNo) ||
      r.voucherNo.includes(trimmed),
  );
}

function supplementFromSourceDocuments(voucherNo: string): {
  gstin?: string;
  pan?: string;
  gstAmount?: number | null;
  referenceNo?: string;
  partyName?: string;
} {
  const trimmed = voucherNo.trim();
  if (!trimmed) return {};

  const invoice = loadInvoices().find((i) => i.invoiceNo === trimmed);
  if (invoice) {
    const { gstAmount } = getInvoiceAmountBreakup(invoice);
    return {
      partyName: invoice.customerName,
      gstin: invoice.customerGst || undefined,
      pan: invoice.pan || undefined,
      gstAmount,
      referenceNo: invoice.referenceNo || invoice.salesOrderNo,
    };
  }

  const purchase = loadPurchaseInvoices().find((p) => p.invoiceNo === trimmed);
  if (purchase) {
    return {
      partyName: purchase.vendorName,
      gstin: purchase.vendorGst || undefined,
      gstAmount: purchase.taxAmount || null,
      referenceNo: purchase.vendorInvoiceNo || purchase.grnNo || purchase.poNumber,
    };
  }

  const creditNote = loadCreditNotes().find((n) => n.creditNoteNo === trimmed);
  if (creditNote) {
    const customer = creditNote.customerId
      ? loadCustomers().find((c) => c.id === creditNote.customerId)
      : loadCustomers().find(
          (c) => c.customerName.trim().toLowerCase() === creditNote.customerName.trim().toLowerCase(),
        );
    return {
      partyName: creditNote.customerName,
      gstin: customer?.gstApplicable ? customer.gstin : undefined,
      pan: customer?.pan,
      gstAmount: creditNote.taxCreditAmount || null,
      referenceNo: creditNote.sourceInvoiceNo || creditNote.sourceOrderNo,
    };
  }

  const debitNote = loadDebitNotes().find((n) => n.debitNoteNo === trimmed);
  if (debitNote) {
    const vendor = debitNote.vendorId
      ? getActiveVendors().find((v) => v.id === debitNote.vendorId)
      : undefined;
    return {
      partyName: debitNote.vendorName,
      gstin: vendor?.gstNumber,
      pan: vendor?.panNumber,
      gstAmount: debitNote.gstAmount || null,
      referenceNo: debitNote.sourceInvoiceNo || debitNote.sourcePoNo || debitNote.sourceGrnNo,
    };
  }

  return {};
}

export function enrichGeneralLedgerTransactionRow(
  raw: Omit<CoaTransactionRow, "runningBalance" | "runningBalanceType" | "isOpeningRow">,
  contraLedger: string,
  voucher?: AccountingVoucher,
): GeneralLedgerEnrichedFields {
  const coaRow: CoaTransactionRow & { contraLedger?: string } = {
    ...raw,
    contraLedger,
    runningBalance: 0,
    runningBalanceType: "Debit",
  };

  const detail = resolveTransactionDetail({ type: "general_ledger", row: coaRow });
  const sourceDoc = supplementFromSourceDocuments(raw.voucherNo);
  const contactLine = voucher?.lines.find((l) => l.contactId || l.contactName);
  const partyName =
    detail?.partyName ?? sourceDoc.partyName ?? contactLine?.contactName ?? contraLedger;
  const masterTax = resolvePartyTaxFromMaster(
    partyName,
    contactLine?.contactId,
    detail?.partyType,
  );
  const tdsRow = findTdsForVoucher(raw.voucherNo);

  const tdsSection =
    detail?.tdsSection ??
    (tdsRow ? `${tdsRow.tdsSection} — ${tdsRow.tdsSectionName}` : undefined);

  return {
    partyName: glText(partyName !== "—" ? partyName : undefined),
    gstin: glText(detail?.gstin ?? sourceDoc.gstin ?? masterTax?.gstin),
    pan: glText(detail?.pan ?? sourceDoc.pan ?? masterTax?.pan),
    expenseHead: glText(detail?.expenseHead),
    particularsNarration: glText(detail?.narration ?? raw.narration),
    bankCash: glText(detail?.bankCashLedger),
    tdsSection: glText(tdsSection),
    tdsAmount: detail?.tdsAmount ?? tdsRow?.tdsAmount ?? null,
    gstAmount: detail?.gstAmount ?? sourceDoc.gstAmount ?? null,
    referenceNo: glText(
      detail?.referenceNumber ??
        sourceDoc.referenceNo ??
        (raw.referenceNo && raw.referenceNo !== GL_EMPTY ? raw.referenceNo : undefined),
    ),
  };
}

export function emptyGeneralLedgerEnrichedFields(
  overrides: Partial<GeneralLedgerEnrichedFields> = {},
): GeneralLedgerEnrichedFields {
  return {
    partyName: GL_EMPTY,
    gstin: GL_EMPTY,
    pan: GL_EMPTY,
    expenseHead: GL_EMPTY,
    particularsNarration: GL_EMPTY,
    bankCash: GL_EMPTY,
    tdsSection: GL_EMPTY,
    tdsAmount: null,
    gstAmount: null,
    referenceNo: GL_EMPTY,
    ...overrides,
  };
}
