/**
 * Sales invoice → voucher → ledger visibility (localStorage demo).
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { resolveHierarchyPath } from "@/lib/accounts/coa-hierarchy";
import { getLedgerById, resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";
import { salesInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import type { LedgerImpactLine } from "@/components/accounts/LedgerImpactPreview";
import {
  aggregateLineGst,
  inferInterstateFromPlaceOfSupply,
} from "@/lib/accounts/gst-accounting";

export type SalesInvoicePostingRole = "customer" | "sales" | "gst";

export interface SalesInvoiceLedgerPosting {
  role: SalesInvoicePostingRole;
  ledgerId: number;
  ledgerName: string;
  coaPath: string;
  debit: number;
  credit: number;
  ledgerHref: string;
}

export interface SalesInvoiceAccountingState {
  invoiceNo: string;
  customerName: string;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  isPosted: boolean;
  isDraft: boolean;
  voucherNumber: string | null;
  voucherId: number | null;
  previewLines: LedgerImpactLine[];
  postings: SalesInvoiceLedgerPosting[];
  reportLinks: {
    trialBalance: string;
    profitAndLoss: string;
    balanceSheet: string;
    chartOfAccounts: string;
  };
}

const ERP_VOUCHER_TYPES = new Set(["sales", "purchase", "credit_note", "debit_note"]);

/** Statement / COA display — prefer source document number (INV001) over system voucher (SAL-0001). */
export function statementVoucherNo(v: AccountingVoucher): string {
  if (v.referenceNo && ERP_VOUCHER_TYPES.has(v.voucherType)) {
    return v.referenceNo;
  }
  return v.voucherNumber;
}

export function findPostedSalesInvoiceVoucher(invoiceNo: string): AccountingVoucher | null {
  return (
    loadVouchers().find(
      (v) =>
        (v.status === "posted" || v.status === "approved") &&
        v.voucherType === "sales" &&
        v.referenceNo === invoiceNo,
    ) ?? null
  );
}

function coaPathForLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): string {
  const hierarchy = resolveHierarchyPath(records, ledger.id);
  return [
    hierarchy.primaryHead?.accountName,
    hierarchy.accountGroup?.accountName,
    hierarchy.standardGroup?.accountName,
    ledger.accountName,
  ]
    .filter(Boolean)
    .join(" › ");
}

function classifyPostingRole(ledgerId: number, records: ChartOfAccount[]): SalesInvoicePostingRole | null {
  const ledger = getLedgerById(ledgerId);
  if (!ledger) return null;
  const type = resolveLedgerType(ledger, records);
  if (type === "Customer") return "customer";
  if (type === "Sales") return "sales";
  if (type === "GST") return "gst";
  return null;
}

function postingsFromVoucher(voucher: AccountingVoucher): SalesInvoiceLedgerPosting[] {
  const records = loadChartOfAccounts();
  const rows: SalesInvoiceLedgerPosting[] = [];

  for (const line of voucher.lines) {
    if (!line.ledgerId) continue;
    const role = classifyPostingRole(line.ledgerId, records);
    if (!role) continue;
    const ledger = getLedgerById(line.ledgerId);
    if (!ledger) continue;
    rows.push({
      role,
      ledgerId: line.ledgerId,
      ledgerName: line.ledgerName || ledger.accountName,
      coaPath: coaPathForLedger(ledger, records),
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
      ledgerHref: `/accounts/masters/ledgers/${line.ledgerId}?tab=statement`,
    });
  }

  const order: SalesInvoicePostingRole[] = ["customer", "sales", "gst"];
  return rows.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.ledgerName.localeCompare(b.ledgerName));
}

export function getSalesInvoiceAccountingState(invoice: {
  invoiceNo: string;
  invoiceStatus: InvoiceRecord["invoiceStatus"];
  customerName: string;
  grandTotal: number;
  taxAmount: number;
  subtotal?: number;
  discountTotal?: number;
  lineItems?: InvoiceRecord["lineItems"];
  placeOfSupply?: string;
}): SalesInvoiceAccountingState {
  const taxableAmount = Math.max(0, invoice.grandTotal - invoice.taxAmount);
  const gstAmount = invoice.taxAmount;
  const interstate = inferInterstateFromPlaceOfSupply(invoice.placeOfSupply);
  const gstSplit = aggregateLineGst(
    (invoice.lineItems ?? []).map((l) => ({
      qty: l.qty,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      taxPct: l.taxPct,
    })),
    interstate,
  );
  const previewLines = salesInvoiceImpactResolved({
    customerName: invoice.customerName,
    taxable: taxableAmount,
    taxAmount: gstAmount,
    grandTotal: invoice.grandTotal,
    ...gstSplit,
    interstate,
  });

  const voucher = findPostedSalesInvoiceVoucher(invoice.invoiceNo);
  const isPosted = invoice.invoiceStatus === "sent" && !!voucher;
  const isDraft = invoice.invoiceStatus === "draft";

  return {
    invoiceNo: invoice.invoiceNo,
    customerName: invoice.customerName,
    taxableAmount,
    gstAmount,
    grandTotal: invoice.grandTotal,
    isPosted,
    isDraft,
    voucherNumber: voucher ? statementVoucherNo(voucher) : null,
    voucherId: voucher?.id ?? null,
    previewLines,
    postings: voucher ? postingsFromVoucher(voucher) : [],
    reportLinks: {
      trialBalance: "/accounts/reports/trial-balance",
      profitAndLoss: "/accounts/reports/pl",
      balanceSheet: "/accounts/reports/balance-sheet",
      chartOfAccounts: "/accounts/masters/chart-of-accounts",
    },
  };
}

export function ledgerBalanceLabel(ledgerId: number): string {
  const ledger = getLedgerById(ledgerId);
  if (!ledger) return "—";
  const bal = computeLedgerCurrentBalance(ledger);
  return `${bal.amount.toLocaleString("en-IN")} ${bal.balanceType}`;
}
