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
  resolveGstNoteExceptionFixAction,
  subsectionLabel,
  type GstCreditDebitNoteRow,
} from "@/lib/accounts/gstr1-credit-debit-compute";

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

export function CreditDebitNoteDetailSheet({
  row,
  open,
  onClose,
}: {
  row: GstCreditDebitNoteRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  const viewHref =
    row.docType === "credit_note"
      ? `/accounts/transactions/credit-notes/${row.sourceId}`
      : `/accounts/transactions/debit-notes/${row.sourceId}`;
  const noteTypeLabel = row.docType === "credit_note" ? "Credit Note" : "Debit Note";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[min(44vw,480px)] w-full">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-mono text-brand-700 truncate">{row.noteNumber}</SheetTitle>
              <SheetDescription>
                {row.noteDate} · {row.customerName}
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
                const fix = resolveGstNoteExceptionFixAction(ex.code, row);
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
            <SectionHeading label={`${noteTypeLabel} Details`} />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Note Number" value={row.noteNumber} />
              <InfoRow label="Note Date" value={row.noteDate} />
              <InfoRow label="Section" value={subsectionLabel(row.subsection)} />
              <InfoRow label="Reason" value={row.reason} />
            </div>
          </div>

          <div>
            <SectionHeading label="Original Invoice Reference" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Invoice Number" value={row.originalInvoiceNo} />
              <InfoRow label="Invoice Date" value={row.originalInvoiceDate} />
            </div>
          </div>

          <div>
            <SectionHeading label="Customer Details" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Customer Name" value={row.customerName} />
              <InfoRow label="GSTIN" value={row.gstin} />
              <InfoRow label="Registration Type" value={row.registrationType} />
            </div>
          </div>

          <div>
            <SectionHeading label="GST Details" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Taxable Value" value={formatMoney(row.taxableValue)} />
              <InfoRow label="GST Rate" value={row.gstRateLabel} />
              <InfoRow label="CGST" value={formatMoney(row.cgst)} />
              <InfoRow label="SGST" value={formatMoney(row.sgst)} />
              <InfoRow label="IGST" value={formatMoney(row.igst)} />
              <InfoRow label="Cess" value={formatMoney(row.cess)} />
              <InfoRow
                label="Total Amount"
                value={<span className={MONEY_AMOUNT_CLASS}>{formatMoney(row.totalAmount)}</span>}
              />
            </div>
          </div>

          {row.lineDetails.length > 0 && (
            <div>
              <SectionHeading label="Product Details" />
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-3 py-2 text-left font-semibold">Product</th>
                      <th className="px-3 py-2 text-left font-semibold">HSN</th>
                      <th className="px-3 py-2 text-right font-semibold">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold">Taxable</th>
                      <th className="px-3 py-2 text-right font-semibold">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.lineDetails.map((line) => (
                      <tr key={line.id} className="border-b border-border/60">
                        <td className="px-3 py-2">{line.productName}</td>
                        <td className="px-3 py-2 font-mono text-brand-700">{line.hsn}</td>
                        <td className="px-3 py-2 text-right">{line.qty}</td>
                        <td className={cn("px-3 py-2 text-right", MONEY_AMOUNT_CLASS)}>
                          {formatMoney(line.taxableValue)}
                        </td>
                        <td className="px-3 py-2 text-right">{line.taxPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {row.rateBreakups.length > 1 && (
            <div>
              <SectionHeading label="GST Breakup by Rate" />
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
            <SectionHeading label="Linked Accounting Voucher" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Voucher Number" value={row.voucherNo} />
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" asChild>
            <Link href={viewHref} onClick={onClose}>
              <ExternalLink className="w-3.5 h-3.5" /> Open Note
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
