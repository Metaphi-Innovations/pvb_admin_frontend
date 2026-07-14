"use client";

import Link from "next/link";
import { CalendarDays, ExternalLink, FileText, Scale, Truck } from "lucide-react";
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
import { formatMoney } from "@/lib/accounts/money-format";
import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";
import { cn } from "@/lib/utils";
import type { AnnualGstBucket, AnnualGstMonthRow } from "../annual-gst-summary-types";
import {
  buildAnnualGstMonthLinks,
  voucherHrefForParticular,
  type AnnualGstMonthLinks,
} from "../annual-gst-month-links";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function BucketTable({
  title,
  rows,
  links,
}: {
  title: string;
  rows: AnnualGstBucket[];
  links: AnnualGstMonthLinks;
}) {
  return (
    <div>
      <SectionHeading label={title} />
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-3 py-2 text-left text-[11px] font-semibold">Particular</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold">Taxable</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold">GST</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold w-28">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = voucherHrefForParticular(row.particular, links);
              return (
                <tr key={row.particular} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 text-xs font-medium">{row.particular}</td>
                  <td className="px-3 py-2 text-xs text-right tabular-nums">
                    {formatMoney(row.taxableValue)}
                  </td>
                  <td className="px-3 py-2 text-xs text-right tabular-nums">
                    {formatMoney(row.gstAmount)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {href ? (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 text-[11px] text-brand-700 hover:underline font-medium"
                      >
                        Open Voucher <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RelatedNav({ links }: { links: AnnualGstMonthLinks }) {
  const items = [
    { label: "GSTR-1", href: links.gstr1, icon: FileText },
    { label: "GSTR-3B", href: links.gstr3b, icon: Scale },
    { label: "Sales Invoices", href: links.salesInvoices, icon: FileText },
    { label: "Purchase Invoices", href: links.purchaseInvoices, icon: Truck },
  ];

  return (
    <div>
      <SectionHeading label="Related Reports & Vouchers" />
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20 hover:bg-brand-50 hover:border-brand-200 transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AnnualGstMonthDrillSheet({
  open,
  onClose,
  month,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  month: AnnualGstMonthRow | null;
  filters: GstReportFilters;
}) {
  if (!month) return null;

  const links = buildAnnualGstMonthLinks(month.monthKey, filters);
  const outputGst = month.outputCgst + month.outputSgst + month.outputIgst;
  const inputGst = month.inputCgst + month.inputSgst + month.inputIgst;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[min(48vw,560px)] w-full">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{month.monthLabel}</SheetTitle>
              <SheetDescription>
                Month-wise GST drill-down · {links.dateFrom} to {links.dateTo}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-5">
          <RelatedNav links={links} />
          <BucketTable title="Outward Supply" rows={month.outward} links={links} />
          <BucketTable title="Inward Supply" rows={month.inward} links={links} />

          <div>
            <SectionHeading label="GST Summary" />
            <div className="rounded-xl border border-border bg-muted/10 px-3 py-2 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">CGST</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    month.outputCgst - month.inputCgst < 0 && "text-emerald-700",
                  )}
                >
                  {formatMoney(month.outputCgst - month.inputCgst)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">SGST</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(month.outputSgst - month.inputSgst)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">IGST</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(month.outputIgst - month.inputIgst)}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-border">
                <span className="font-semibold text-foreground">Net GST</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    month.netGst < 0 ? "text-emerald-700" : "text-brand-700",
                  )}
                >
                  {formatMoney(month.netGst)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                Output GST {formatMoney(outputGst)} · Input GST {formatMoney(inputGst)}
              </p>
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
            <Link href={links.gstr1}>
              GSTR-1 <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          >
            <Link href={links.gstr3b}>
              GSTR-3B <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
