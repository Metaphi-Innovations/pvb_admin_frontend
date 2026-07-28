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
import {
  resolveHsnExceptionFixAction,
  type HsnSummaryRow,
} from "@/lib/accounts/gstr1-hsn-summary-compute";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
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

export function HsnSummaryDetailSheet({
  row,
  open,
  onClose,
}: {
  row: HsnSummaryRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[min(52vw,560px)] w-full">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-mono text-brand-700 truncate">{row.hsnCode}</SheetTitle>
              <SheetDescription>
                {row.description} · {row.gstRateLabel} · {row.uqc}
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
                const fix = resolveHsnExceptionFixAction(ex.code, row);
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
            <SectionHeading label="HSN Summary" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3 grid grid-cols-2 gap-x-4 text-xs">
              <div className="py-1.5">
                <span className="text-muted-foreground">Gross Value</span>
                <p className={cn("font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(row.grossValue)}</p>
              </div>
              <div className="py-1.5">
                <span className="text-muted-foreground">Sales Returns</span>
                <p className={cn("font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(row.salesReturnValue)}</p>
              </div>
              <div className="py-1.5">
                <span className="text-muted-foreground">Net Taxable</span>
                <p className={cn("font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(row.netTaxableValue)}</p>
              </div>
              <div className="py-1.5">
                <span className="text-muted-foreground">Total Tax</span>
                <p className={cn("font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(row.totalTax)}</p>
              </div>
            </div>
          </div>

          <div>
            <SectionHeading label="Source Transactions" />
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr className="border-b border-border">
                      <th className="px-2 py-2 text-left font-semibold">Date</th>
                      <th className="px-2 py-2 text-left font-semibold">Document</th>
                      <th className="px-2 py-2 text-left font-semibold">Customer</th>
                      <th className="px-2 py-2 text-left font-semibold">Product</th>
                      <th className="px-2 py-2 text-right font-semibold">Qty</th>
                      <th className="px-2 py-2 text-right font-semibold">Taxable</th>
                      <th className="px-2 py-2 text-right font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.sourceLines.map((d) => {
                      const href =
                        d.invoiceId != null
                          ? `/accounts/transactions/invoices/${d.invoiceId}`
                          : d.creditNoteId != null
                            ? `/accounts/transactions/credit-notes/${d.creditNoteId}`
                            : null;
                      return (
                        <tr key={d.detailKey} className="border-b border-border/60 hover:bg-muted/20">
                          <td className="px-2 py-2 whitespace-nowrap">{d.invoiceDate}</td>
                          <td className="px-2 py-2">
                            {href ? (
                              <Link
                                href={href}
                                className="font-mono text-brand-700 hover:underline"
                                onClick={onClose}
                              >
                                {d.documentNo}
                              </Link>
                            ) : (
                              <span className="font-mono">{d.documentNo}</span>
                            )}
                            {d.creditNoteRef !== "—" && d.docType === "credit_note" && (
                              <p className="text-[10px] text-muted-foreground">CN: {d.creditNoteRef}</p>
                            )}
                          </td>
                          <td className="px-2 py-2 max-w-[90px] truncate" title={d.customerName}>
                            {d.customerName}
                          </td>
                          <td className="px-2 py-2 max-w-[100px] truncate" title={d.productName}>
                            {d.productName}
                          </td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">
                            {d.qty} {d.unit}
                          </td>
                          <td className={cn("px-2 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(d.taxableValue)}
                          </td>
                          <td className={cn("px-2 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(d.netValue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
