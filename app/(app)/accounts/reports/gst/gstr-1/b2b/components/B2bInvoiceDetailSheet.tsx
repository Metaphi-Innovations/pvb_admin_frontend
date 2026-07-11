"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, FileText } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  resolveExceptionFixAction,
  type B2bInvoiceRow,
} from "@/lib/accounts/gstr1-b2b-compute";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs text-foreground text-right font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: "valid" | "exception" }) {
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
      <AlertTriangle className="w-3 h-3" />
      Exception
    </span>
  );
}

export function B2bInvoiceDetailSheet({
  row,
  open,
  onClose,
}: {
  row: B2bInvoiceRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  const sourceInv = loadInvoices().find((i) => i.id === row.invoiceId);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[min(44vw,480px)] w-full">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-mono text-brand-700 truncate">{row.invoiceNo}</SheetTitle>
              <SheetDescription>
                {row.invoiceDate} · {row.customerName}
              </SheetDescription>
            </div>
            <StatusBadge status={row.status} />
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {row.exceptions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">Exception Issues</p>
              {row.exceptions.map((ex, i) => {
                const fix =
                  sourceInv && resolveExceptionFixAction(ex.code, sourceInv);
                return (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      {ex.message}
                    </span>
                    {fix && (
                      <Link
                        href={fix.href}
                        className="text-[11px] text-brand-600 hover:underline whitespace-nowrap"
                        onClick={onClose}
                      >
                        {fix.label}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <SectionHeading label="Invoice Details" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Invoice Number" value={row.invoiceNo} />
              <InfoRow label="Invoice Date" value={row.invoiceDate} />
              <InfoRow label="Voucher Number" value={row.voucherNo} />
              <InfoRow label="Customer Name" value={row.customerName} />
              <InfoRow label="Customer GSTIN" value={<span className="font-mono">{row.gstin}</span>} />
              <InfoRow label="Customer State" value={row.customerState} />
              <InfoRow label="Place of Supply" value={row.placeOfSupply} />
              <InfoRow label="Branch" value={row.branch} />
              <InfoRow label="Warehouse" value={row.warehouse} />
              <InfoRow
                label="Supply Type"
                value={row.interstate ? "Interstate (IGST)" : "Intrastate (CGST/SGST)"}
              />
            </div>
          </div>

          {row.rateBreakups.length > 0 && (
            <div>
              <SectionHeading label="Tax Rate Breakup" />
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-3 py-2 text-left font-semibold">Rate</th>
                      <th className="px-3 py-2 text-right font-semibold">Taxable</th>
                      <th className="px-3 py-2 text-right font-semibold">CGST</th>
                      <th className="px-3 py-2 text-right font-semibold">SGST</th>
                      <th className="px-3 py-2 text-right font-semibold">IGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.rateBreakups.map((b) => (
                      <tr key={b.ratePct} className="border-b border-border/60">
                        <td className="px-3 py-2">{b.ratePct}%</td>
                        <td className={cn("px-3 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                          {formatMoney(b.taxableValue)}
                        </td>
                        <td className={cn("px-3 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                          {formatMoney(b.cgst)}
                        </td>
                        <td className={cn("px-3 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                          {formatMoney(b.sgst)}
                        </td>
                        <td className={cn("px-3 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                          {formatMoney(b.igst)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <SectionHeading label="Item Details" />
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                    <th className="px-3 py-2 text-left font-semibold">HSN</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Taxable</th>
                    <th className="px-3 py-2 text-right font-semibold">Rate</th>
                    <th className="px-3 py-2 text-right font-semibold">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {row.lineDetails.map((line) => (
                    <tr key={line.id} className="border-b border-border/60">
                      <td className="px-3 py-2">{line.productName}</td>
                      <td className="px-3 py-2 font-mono">{line.hsn}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {line.qty} {line.unit}
                      </td>
                      <td className={cn("px-3 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.taxableValue)}
                      </td>
                      <td className="px-3 py-2 text-right">{line.taxPct}%</td>
                      <td className={cn("px-3 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.cgst + line.sgst + line.igst)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <SectionHeading label="Totals" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Taxable Value" value={formatMoney(row.taxableValue)} />
              <InfoRow label="CGST" value={formatMoney(row.cgst)} />
              <InfoRow label="SGST" value={formatMoney(row.sgst)} />
              <InfoRow label="IGST" value={formatMoney(row.igst)} />
              <InfoRow label="Cess" value={formatMoney(row.cess)} />
              <InfoRow label="Total Tax" value={formatMoney(row.totalTax)} />
              <InfoRow
                label="Invoice Total"
                value={<span className="font-bold">{formatMoney(row.invoiceValue)}</span>}
              />
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="gap-2">
          {row.voucherId != null && (
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href={`/accounts/vouchers/view/${row.voucherId}`}>
                <ExternalLink className="w-3.5 h-3.5" /> Voucher
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href={`/accounts/transactions/invoices/${row.invoiceId}`}>
              <ExternalLink className="w-3.5 h-3.5" /> Sales Invoice
            </Link>
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
