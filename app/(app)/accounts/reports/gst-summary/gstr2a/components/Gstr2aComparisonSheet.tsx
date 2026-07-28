"use client";

import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  GSTR2A_DOC_TYPE_LABELS,
  GSTR2A_STATUS_LABELS,
  type Gstr2aBooksDocument,
  type Gstr2aPortalDocument,
  type Gstr2aReconRow,
} from "../gstr2a-report-types";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: React.ReactNode;
  highlight?: boolean;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs text-right font-medium",
          highlight ? "text-amber-700 font-semibold" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function amountMismatch(a: number, b: number): boolean {
  return Math.abs(a - b) > 1;
}

export function Gstr2aComparisonSheet({
  open,
  onClose,
  row,
  books,
  portal,
}: {
  open: boolean;
  onClose: () => void;
  row: Gstr2aReconRow | null;
  books: Gstr2aBooksDocument | null;
  portal: Gstr2aPortalDocument | null;
}) {
  if (!row) return null;

  const invoiceHref =
    row.booksSourceId != null ? `/accounts/purchase-invoices/${row.booksSourceId}` : null;

  const dateDiff =
    row.dateMismatch && row.booksInvoiceDate !== "—" && row.portalInvoiceDate !== "—"
      ? `${row.booksInvoiceDate} vs ${row.portalInvoiceDate}`
      : "None";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[min(44vw,520px)] w-full">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">View Comparison</SheetTitle>
              <SheetDescription>
                {row.supplierName} · {GSTR2A_STATUS_LABELS[row.status]}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div>
            <SectionHeading label="Differences" />
            <InfoRow
              label="Invoice Amount Diff"
              value={formatMoney(row.taxableDifference)}
              highlight={Math.abs(row.taxableDifference) > 1}
            />
            <InfoRow
              label="GST Difference"
              value={formatMoney(row.gstDifference)}
              highlight={Math.abs(row.gstDifference) > 1}
            />
            <InfoRow label="Invoice Date Diff" value={dateDiff} highlight={row.dateMismatch} />
            <InfoRow label="Remarks" value={row.remarks || "—"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/10 p-3">
              <SectionHeading label="Books" />
              <InfoRow label="Invoice No." value={row.booksInvoiceNo} />
              <InfoRow
                label="Date"
                value={row.booksInvoiceDate}
                highlight={row.dateMismatch}
              />
              <InfoRow
                label="Taxable Value"
                value={formatMoney(row.booksTaxableAmount)}
                highlight={amountMismatch(row.booksTaxableAmount, row.portalTaxableAmount)}
              />
              <InfoRow
                label="GST"
                value={formatMoney(row.booksGst)}
                highlight={amountMismatch(row.booksGst, row.portalGst)}
              />
              <InfoRow label="Ledger" value={row.ledger || books?.ledger || "—"} />
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-3">
              <SectionHeading label="Portal" />
              <InfoRow label="Invoice No." value={row.portalInvoiceNo} />
              <InfoRow
                label="Date"
                value={row.portalInvoiceDate}
                highlight={row.dateMismatch}
              />
              <InfoRow label="Taxable Value" value={formatMoney(row.portalTaxableAmount)} />
              <InfoRow label="GST" value={formatMoney(row.portalGst)} />
              {!portal && row.portalDocId == null && (
                <p className="text-[11px] text-muted-foreground mt-2">No portal document</p>
              )}
            </div>
          </div>

          <div>
            <SectionHeading label="Document" />
            <InfoRow label="Supplier" value={row.supplierName} />
            <InfoRow label="Supplier GSTIN" value={row.supplierGstin || "—"} />
            <InfoRow label="Document Type" value={GSTR2A_DOC_TYPE_LABELS[row.docType]} />
            <InfoRow label="Status" value={GSTR2A_STATUS_LABELS[row.status]} />
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
          {invoiceHref && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              asChild
            >
              <Link href={invoiceHref}>
                Open Purchase Invoice <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
