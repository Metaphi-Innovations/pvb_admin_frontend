/**
 * Bill-wise Outstanding — read-only facade over existing receivables / payables data.
 * Does not duplicate invoice/bill balances; GL and this screen share the same sources.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import {
  getCustomerOutstandingDetail,
  getCustomerReceiptAllocationSummary,
  getInvoiceOutstandingDetail,
  computeCustomerOutstanding,
  type CustomerInvoiceOutstandingRow,
  type InvoiceReceiptHistoryRow,
} from "@/lib/accounts/receivables-data";
import {
  getVendorOutstandingDetail,
  getVendorPaymentHistory,
  computeVendorOutstanding,
  type VendorBillOutstandingRow,
  type VendorPaymentHistoryRow,
} from "@/lib/accounts/payables-data";
import {
  isCustomerPartyLedger,
  isVendorPartyLedger,
} from "@/lib/accounts/voucher-ledger-groups";
import { resolveCoaLedgerBehavior } from "@/lib/accounts/coa-ledger-behavior";
import {
  getAbcDistributorBillWiseDemoReferences,
  isBillWiseDemoLedgerName,
} from "@/lib/accounts/bill-wise-demo-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import {
  getGenericBillWiseReferencesForLedger,
  isGenericBillWiseLedger,
} from "@/lib/accounts/generic-bill-wise-store";
import { isBillWiseEnabledLedger } from "@/lib/accounts/voucher-reference-types";

export type BillWisePartyKind = "customer" | "supplier";

export interface BillWiseReferenceRow {
  documentId: number;
  documentNo: string;
  documentDate: string;
  dueDate: string;
  documentAmount: number;
  adjustedAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  ageingBucket: string;
  status: string;
}

export interface BillWiseAdjustmentHistoryRow {
  entryNo: string;
  entryDate: string;
  amount: number;
  modeOrAccount: string;
  referenceNo: string;
  kind: "receipt" | "payment" | "other";
}

export interface BillWiseOnAccountAdvanceRow {
  entryNo: string;
  entryDate: string;
  unallocatedAmount: number;
  label: "On Account" | "Advance";
}

export interface BillWiseOutstandingView {
  ledgerId: number;
  ledgerName: string;
  ledgerCode: string;
  partyKind: BillWisePartyKind;
  partyId: number;
  partyName: string;
  partyCode: string;
  currentOutstanding: number;
  references: BillWiseReferenceRow[];
  /** Flattened adjustment history across open + settled refs (from existing allocation history). */
  adjustmentHistory: BillWiseAdjustmentHistoryRow[];
  onAccountAdvances: BillWiseOnAccountAdvanceRow[];
}

export function billWiseOutstandingHref(ledgerId: number, from?: "coa" | "gl"): string {
  const base = `${CHART_OF_ACCOUNTS_HREF}/ledgers/${ledgerId}/bill-wise`;
  return from ? `${base}?from=${from}` : base;
}

/**
 * Visible for:
 * - Customer ledgers under Sundry Debtors / Supplier ledgers under Sundry Creditors
 * - Generic ledgers with Bill-wise Accounting = ON
 * Hidden for bank, cash, GST, inventory, TDS, and other non-party groups without the toggle.
 */
export function canShowBillWiseOutstanding(
  ledger: ChartOfAccount | null | undefined,
  records?: ChartOfAccount[],
): boolean {
  if (!ledger || ledger.nodeLevel !== "ledger") return false;
  const list = records ?? loadChartOfAccounts();

  if (isGenericBillWiseLedger(ledger.id)) return true;

  if (ledger.parentAccountId != null) {
    const parent = list.find((r) => r.id === ledger.parentAccountId);
    if (parent) {
      const kind = resolveCoaLedgerBehavior(parent, list).kind;
      if (kind === "customer" || kind === "vendor") return true;
      if (kind !== "generic") return false;
    }
  }

  if (isCustomerPartyLedger(ledger, list) || isVendorPartyLedger(ledger, list)) {
    return true;
  }

  return isBillWiseEnabledLedger(ledger);
}

function resolvePartyKindForLedger(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): BillWisePartyKind | null {
  if (ledger.parentAccountId != null) {
    const parent = records.find((r) => r.id === ledger.parentAccountId);
    if (parent) {
      const kind = resolveCoaLedgerBehavior(parent, records).kind;
      if (kind === "customer") return "customer";
      if (kind === "vendor") return "supplier";
    }
  }
  if (isCustomerPartyLedger(ledger, records)) return "customer";
  if (isVendorPartyLedger(ledger, records)) return "supplier";
  return null;
}

function buildDemoBillWiseView(ledger: ChartOfAccount): BillWiseOutstandingView {
  const references = getAbcDistributorBillWiseDemoReferences();
  const currentOutstanding = references.reduce((sum, r) => sum + r.outstandingAmount, 0);
  const nameKey = ledger.accountName.trim().toLowerCase();
  const matchedCustomer = loadCustomers().find(
    (c) => c.customerName.trim().toLowerCase() === nameKey,
  );
  return {
    ledgerId: ledger.id,
    ledgerName: ledger.accountName,
    ledgerCode: ledger.accountCode,
    partyKind: "customer",
    partyId: ledger.erpSourceId ?? matchedCustomer?.id ?? -1,
    partyName: ledger.accountName,
    partyCode: ledger.accountCode,
    currentOutstanding,
    references,
    adjustmentHistory: [],
    onAccountAdvances: [],
  };
}

function resolvePartyFromLedger(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): { partyKind: BillWisePartyKind; partyId: number } | null {
  if (ledger.erpSourceModule === "customer_master" && ledger.erpSourceId != null) {
    return { partyKind: "customer", partyId: ledger.erpSourceId };
  }
  if (ledger.erpSourceModule === "vendor_master" && ledger.erpSourceId != null) {
    return { partyKind: "supplier", partyId: ledger.erpSourceId };
  }

  if (isCustomerPartyLedger(ledger, records)) {
    const row = computeCustomerOutstanding().find((r) => r.ledgerId === ledger.id);
    if (row) return { partyKind: "customer", partyId: row.customerId };
  }
  if (isVendorPartyLedger(ledger, records)) {
    const row = computeVendorOutstanding().find((r) => r.ledgerId === ledger.id);
    if (row) return { partyKind: "supplier", partyId: row.vendorId };
  }
  return null;
}

function mapCustomerRef(inv: CustomerInvoiceOutstandingRow): BillWiseReferenceRow {
  return {
    documentId: inv.invoiceId,
    documentNo: inv.invoiceNo,
    documentDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    documentAmount: inv.invoiceAmount,
    adjustedAmount: inv.paidAmount + inv.creditNote,
    outstandingAmount: inv.outstanding,
    daysOverdue: inv.daysOverdue,
    ageingBucket: inv.ageingBucket,
    status: inv.status,
  };
}

function mapVendorRef(bill: VendorBillOutstandingRow): BillWiseReferenceRow {
  return {
    documentId: bill.billId,
    documentNo: bill.billNo,
    documentDate: bill.billDate,
    dueDate: bill.dueDate,
    documentAmount: bill.billAmount,
    adjustedAmount: bill.paidAmount + bill.debitNoteAdjusted,
    outstandingAmount: bill.outstanding,
    daysOverdue: bill.daysOverdue,
    ageingBucket: bill.ageingBucket,
    status: bill.status,
  };
}

function mapReceiptHistory(rows: InvoiceReceiptHistoryRow[]): BillWiseAdjustmentHistoryRow[] {
  return rows.map((r) => ({
    entryNo: r.receiptNo,
    entryDate: r.receiptDate,
    amount: r.amount,
    modeOrAccount: r.paymentMode,
    referenceNo: r.referenceNo,
    kind: "receipt" as const,
  }));
}

function mapPaymentHistory(rows: VendorPaymentHistoryRow[]): BillWiseAdjustmentHistoryRow[] {
  return rows.map((r) => ({
    entryNo: r.paymentNo,
    entryDate: r.paymentDate,
    amount: r.amount,
    modeOrAccount: r.bankAccount,
    referenceNo: r.referenceNo,
    kind: "payment" as const,
  }));
}

/**
 * Build Bill-wise Outstanding for a COA/GL ledger id.
 * Returns null when ledger is missing or not a customer/supplier party ledger.
 * ABC Distributor always uses frontend mock rows (no invoices required).
 */
export function getBillWiseOutstandingForLedger(
  ledgerId: number,
): BillWiseOutstandingView | null {
  const records = loadChartOfAccounts();
  const ledger = records.find((r) => r.id === ledgerId && r.nodeLevel === "ledger");
  if (!ledger || !canShowBillWiseOutstanding(ledger, records)) return null;

  if (isBillWiseDemoLedgerName(ledger.accountName)) {
    return buildDemoBillWiseView(ledger);
  }

  if (isGenericBillWiseLedger(ledger.id)) {
    const refs = getGenericBillWiseReferencesForLedger(ledger.id);
    const references: BillWiseReferenceRow[] = refs.map((r) => ({
      documentId: r.id,
      documentNo: r.referenceNo,
      documentDate: r.documentDate,
      dueDate: r.dueDate || r.documentDate,
      documentAmount: r.originalAmount,
      adjustedAmount: r.adjustedAmount,
      outstandingAmount: r.outstandingAmount,
      daysOverdue: (() => {
        if (!r.dueDate) return 0;
        const due = new Date(r.dueDate.slice(0, 10));
        const today = new Date();
        if (Number.isNaN(due.getTime())) return 0;
        return Math.max(
          0,
          Math.floor((today.getTime() - due.getTime()) / 86_400_000),
        );
      })(),
      ageingBucket: "",
      status: r.status,
    }));
    const currentOutstanding = references.reduce((s, r) => s + r.outstandingAmount, 0);
    return {
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      ledgerCode: ledger.accountCode,
      partyKind: "customer",
      partyId: -1,
      partyName: ledger.accountName,
      partyCode: ledger.accountCode,
      currentOutstanding,
      references,
      adjustmentHistory: [],
      onAccountAdvances: refs
        .filter((r) => r.referenceType === "advance" && r.outstandingAmount > 0.009)
        .map((r) => ({
          entryNo: r.referenceNo,
          entryDate: r.documentDate,
          unallocatedAmount: r.outstandingAmount,
          label: "Advance" as const,
        })),
    };
  }

  const party = resolvePartyFromLedger(ledger, records);
  if (!party) {
    const partyKind = resolvePartyKindForLedger(ledger, records);
    if (!partyKind) return null;
    return {
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      ledgerCode: ledger.accountCode,
      partyKind,
      partyId: ledger.erpSourceId ?? -1,
      partyName: ledger.accountName,
      partyCode: ledger.accountCode,
      currentOutstanding: 0,
      references: [],
      adjustmentHistory: [],
      onAccountAdvances: [],
    };
  }

  if (party.partyKind === "customer") {
    const detail = getCustomerOutstandingDetail(party.partyId);
    if (!detail) {
      return {
        ledgerId: ledger.id,
        ledgerName: ledger.accountName,
        ledgerCode: ledger.accountCode,
        partyKind: "customer",
        partyId: party.partyId,
        partyName: ledger.accountName,
        partyCode: ledger.accountCode,
        currentOutstanding: 0,
        references: [],
        adjustmentHistory: [],
        onAccountAdvances: [],
      };
    }

    const openRefs = detail.invoices
      .filter((i) => i.outstanding > 0.009)
      .map(mapCustomerRef);

    const adjustmentHistory: BillWiseAdjustmentHistoryRow[] = [];
    for (const inv of detail.invoices) {
      const invDetail = getInvoiceOutstandingDetail(inv.invoiceId);
      if (invDetail?.receiptHistory?.length) {
        adjustmentHistory.push(...mapReceiptHistory(invDetail.receiptHistory));
      }
    }
    adjustmentHistory.sort((a, b) => b.entryDate.localeCompare(a.entryDate));

    const allocSummary = getCustomerReceiptAllocationSummary(party.partyId);
    const onAccountAdvances: BillWiseOnAccountAdvanceRow[] = (
      allocSummary?.unallocatedReceipts ?? []
    ).map((r) => ({
      entryNo: r.receiptNo,
      entryDate: r.receiptDate,
      unallocatedAmount: r.unallocatedAmount,
      label: "On Account" as const,
    }));

    return {
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      ledgerCode: ledger.accountCode,
      partyKind: "customer",
      partyId: detail.customer.id,
      partyName: detail.customer.customerName,
      partyCode: detail.customer.customerCode,
      currentOutstanding: detail.currentOutstanding,
      references: openRefs,
      adjustmentHistory,
      onAccountAdvances,
    };
  }

  const detail = getVendorOutstandingDetail(party.partyId);
  if (!detail) {
    return {
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      ledgerCode: ledger.accountCode,
      partyKind: "supplier",
      partyId: party.partyId,
      partyName: ledger.accountName,
      partyCode: ledger.accountCode,
      currentOutstanding: 0,
      references: [],
      adjustmentHistory: [],
      onAccountAdvances: [],
    };
  }

  const openRefs = detail.bills.filter((b) => b.outstanding > 0.009).map(mapVendorRef);
  const paymentHistory = getVendorPaymentHistory(detail.vendor.id);
  const adjustmentHistory = mapPaymentHistory(paymentHistory).sort((a, b) =>
    b.entryDate.localeCompare(a.entryDate),
  );

  const onAccountAdvances: BillWiseOnAccountAdvanceRow[] = paymentHistory
    .filter((p) => p.status === "unallocated" || p.amount - p.allocatedAmount > 0.009)
    .map((p) => ({
      entryNo: p.paymentNo,
      entryDate: p.paymentDate,
      unallocatedAmount: Math.max(0, p.amount - p.allocatedAmount),
      label: "On Account" as const,
    }))
    .filter((r) => r.unallocatedAmount > 0.009);

  return {
    ledgerId: ledger.id,
    ledgerName: ledger.accountName,
    ledgerCode: ledger.accountCode,
    partyKind: "supplier",
    partyId: detail.vendor.id,
    partyName: detail.vendor.vendorName,
    partyCode: detail.vendor.vendorCode,
    currentOutstanding: detail.currentOutstanding,
    references: openRefs,
    adjustmentHistory,
    onAccountAdvances,
  };
}

/** Existing voucher create URLs — no voucher form changes; query hints are informational. */
export function billWiseAdjustHref(opts: {
  partyKind: BillWisePartyKind;
  voucher: "receipt" | "payment" | "journal" | "credit_note" | "debit_note";
  ledgerId: number;
  documentId?: number;
  documentNo?: string;
  partyId?: number;
}): string {
  const q = new URLSearchParams();
  q.set("billWiseLedgerId", String(opts.ledgerId));
  if (opts.documentId != null) q.set("billWiseDocId", String(opts.documentId));
  if (opts.documentNo) q.set("billWiseDocNo", opts.documentNo);
  if (opts.partyId != null) q.set("billWisePartyId", String(opts.partyId));

  switch (opts.voucher) {
    case "receipt":
      return `/accounts/vouchers?tab=receipt&mode=new&${q.toString()}`;
    case "payment":
      return `/accounts/vouchers?tab=payment&mode=new&${q.toString()}`;
    case "journal":
      return `/accounts/vouchers?tab=journal&mode=new&${q.toString()}`;
    case "credit_note":
      return `/accounts/transactions/credit-notes/new?${q.toString()}`;
    case "debit_note":
      return `/accounts/transactions/debit-notes/new?${q.toString()}`;
    default:
      return `/accounts/vouchers?tab=journal&mode=new&${q.toString()}`;
  }
}

export function billWiseDocumentViewHref(
  partyKind: BillWisePartyKind,
  documentId: number,
): string {
  if (partyKind === "customer") {
    return `/accounts/transactions/invoices/${documentId}`;
  }
  return `/accounts/purchase-invoices/${documentId}`;
}
