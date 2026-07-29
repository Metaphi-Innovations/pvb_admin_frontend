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
import {
  resolveNilRatedExceptionFixAction,
  type NilRatedExemptRow,
} from "@/lib/accounts/gstr1-nil-rated-compute";

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

export function NilRatedExemptDetailSheet({
  row,
  open,
  onClose,
}: {
  row: NilRatedExemptRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

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
                {row.invoiceDate} · {row.supplyTypeLabel}
                {row.mixedInvoice ? " · Mixed invoice (line only)" : ""}
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
                const fix = resolveNilRatedExceptionFixAction(ex.code, row);
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
              <InfoRow
                label="Linked Sales Invoice"
                value={
                  <Link
                    href={`/accounts/transactions/invoices/${row.invoiceId}`}
                    className="text-brand-600 hover:underline font-mono"
                    onClick={onClose}
                  >
                    {row.invoiceNo}
                  </Link>
                }
              />
            </div>
          </div>

          <div>
            <SectionHeading label="Customer Details" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Customer Name" value={row.customerName} />
              <InfoRow label="GSTIN" value={row.gstin} />
              <InfoRow label="Place of Supply" value={row.placeOfSupply} />
            </div>
          </div>

          <div>
            <SectionHeading label="Product / Service Details" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Product / Service" value={row.productName} />
              <InfoRow label="HSN / SAC" value={row.hsn} />
              <InfoRow label="Quantity" value={`${row.qty} ${row.unit}`} />
              <InfoRow
                label="Supply Value"
                value={<span className={MONEY_AMOUNT_CLASS}>{formatMoney(row.supplyValue)}</span>}
              />
            </div>
          </div>

          <div>
            <SectionHeading label="Tax Treatment" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Supply Type" value={row.supplyTypeLabel} />
              <InfoRow label="Tax Treatment" value={row.taxTreatment} />
              <InfoRow label="GST Rate" value={row.gstRateLabel} />
              <InfoRow label="Reason for Classification" value={row.classificationReason} />
              {row.lineGstAmount > 0 && (
                <InfoRow
                  label="GST Charged (line)"
                  value={<span className={MONEY_AMOUNT_CLASS}>{formatMoney(row.lineGstAmount)}</span>}
                />
              )}
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            asChild
          >
            <Link href={`/accounts/transactions/invoices/${row.invoiceId}`} onClick={onClose}>
              <ExternalLink className="w-3.5 h-3.5" /> Open Invoice
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
