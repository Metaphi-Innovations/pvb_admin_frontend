"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  getSalesInvoiceAccountingState,
  ledgerBalanceLabel,
  type SalesInvoiceLedgerPosting,
} from "@/lib/accounts/sales-invoice-accounting";

function PostingRow({ row }: { row: SalesInvoiceLedgerPosting }) {
  return (
    <tr className="border-b border-border/30 last:border-0">
      <td className="px-3 py-2">
        <span className="font-medium capitalize">
          {row.role === "gst" ? row.ledgerName : row.role}
        </span>
        <span className="block text-[10px] text-muted-foreground mt-0.5 truncate max-w-[220px]" title={row.coaPath}>
          {row.coaPath}
        </span>
      </td>
      <td className="px-3 py-2">
        <Link href={row.ledgerHref} className="text-brand-700 hover:underline text-xs font-medium">
          {row.ledgerName}
        </Link>
      </td>
      <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-800">
        {row.debit > 0 ? formatMoney(row.debit) : "—"}
      </td>
      <td className="px-3 py-2 text-right font-mono tabular-nums text-red-700">
        {row.credit > 0 ? formatMoney(row.credit) : "—"}
      </td>
      <td className="px-3 py-2 text-right text-[10px] text-muted-foreground whitespace-nowrap">
        {ledgerBalanceLabel(row.ledgerId)}
      </td>
    </tr>
  );
}

export function SalesInvoiceAccountingPanel({
  invoice,
  className,
}: {
  invoice: Parameters<typeof getSalesInvoiceAccountingState>[0];
  className?: string;
}) {
  const state = getSalesInvoiceAccountingState(invoice);

  return (
    <div className={className}>
      <div className="bg-white rounded-lg border border-border/60 p-4 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Accounting Visibility
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
              Sales invoice postings flow to customer ledger, sales revenue, and output GST — then into Trial
              Balance, P&amp;L (revenue only), and Balance Sheet.
            </p>
          </div>
          {state.isPosted ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Posted · {state.voucherNumber}
            </span>
          ) : state.isDraft ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <FileText className="w-3.5 h-3.5" />
              Draft — not posted
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Invoice No</p>
            <p className="font-medium mt-0.5">{state.invoiceNo || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Customer</p>
            <p className="font-medium mt-0.5">{state.customerName}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Taxable Amount</p>
            <p className="font-medium mt-0.5 tabular-nums">{formatMoney(state.taxableAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">GST / Total</p>
            <p className="font-medium mt-0.5 tabular-nums">
              {formatMoney(state.gstAmount)} / {formatMoney(state.grandTotal)}
            </p>
          </div>
        </div>

        {!state.isPosted ? (
          <>
            <LedgerImpactPreview title="Ledger Impact Preview" lines={state.previewLines} className="border-0 p-0 shadow-none" />
            <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-4">
              <li>This will update Customer Outstanding</li>
              <li>This will update COA → Income → Sales (taxable amount only)</li>
              <li>This will update COA → Current Liabilities → Duties &amp; Taxes Payable (CGST / SGST / IGST Payable)</li>
              <li>This will update Trial Balance and Profit &amp; Loss (sales revenue only — GST excluded)</li>
            </ul>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Posted Ledger Entries
            </p>
            <div className="overflow-x-auto rounded-md border border-border/50">
              <table className="accounts-table w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Account</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Ledger</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Debit</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Credit</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {state.postings.map((row) => (
                    <PostingRow key={`${row.role}-${row.ledgerId}`} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Ledger statements show voucher <strong>{state.voucherNumber}</strong> (invoice reference). GST
              does not appear in Profit &amp; Loss — only sales revenue is income.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
          <Button asChild variant="outline" size="sm" className="h-7 text-[11px] gap-1">
            <Link href={state.reportLinks.chartOfAccounts}>
              <Link2 className="w-3 h-3" /> Chart of Accounts
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
            <Link href={state.reportLinks.trialBalance}>Trial Balance</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
            <Link href={state.reportLinks.profitAndLoss}>Profit &amp; Loss</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
            <Link href={state.reportLinks.balanceSheet}>Balance Sheet</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
