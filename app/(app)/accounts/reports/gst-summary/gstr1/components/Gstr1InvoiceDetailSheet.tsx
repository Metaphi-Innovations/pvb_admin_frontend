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
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { resolveGstr1SourceHref } from "../gstr1-report-data";
import type { Gstr1Document } from "../gstr1-report-types";

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

export function Gstr1InvoiceDetailSheet({
  document,
  open,
  onClose,
}: {
  document: Gstr1Document | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!document) return null;

  const sourceHref = resolveGstr1SourceHref(document);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[min(44vw,520px)] w-full">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-mono text-brand-700 truncate">
                {document.documentNo}
              </SheetTitle>
              <SheetDescription>{document.customer}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div>
            <SectionHeading label="Invoice Details" />
            <InfoRow label="Invoice Date" value={document.documentDate} />
            <InfoRow label="Customer" value={document.customer} />
            <InfoRow label="GSTIN" value={document.gstin || "—"} />
            <InfoRow label="Place of Supply" value={document.placeOfSupply} />
            <InfoRow label="Invoice Type" value={document.invoiceType} />
            <InfoRow label="Branch" value={document.branch} />
            <InfoRow
              label="Status"
              value={document.status === "needs-review" ? "Needs Review" : "Posted"}
            />
          </div>

          <div>
            <SectionHeading label="Line Items" />
            <div className="border border-border rounded-xl overflow-x-auto">
              <AccountsTable minWidth={900}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell className="text-[10px]">Product</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-[10px]">HSN</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">Qty</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-[10px]">UQC</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">Rate</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">Gross</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">Discount</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">Taxable</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-[10px]">GST %</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">IGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">CGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">SGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">Tax</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-[10px]">Total</AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {document.lines.map((line) => (
                    <AccountsTableRow key={line.id}>
                      <AccountsTableCell className="text-[11px]">{line.product}</AccountsTableCell>
                      <AccountsTableCell className="text-[11px] font-mono">{line.hsn}</AccountsTableCell>
                      <AccountsTableCell align="right" className="text-[11px] tabular-nums">
                        {line.quantity}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-[11px]">{line.uqc}</AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.rate)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.grossAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.discount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.taxableAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-[11px]">{line.gstRate}%</AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.igst)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.cgst)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.sgst)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.taxAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-[11px]", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(line.totalAmount)}
                      </AccountsTableCell>
                    </AccountsTableRow>
                  ))}
                </AccountsTableBody>
              </AccountsTable>
            </div>
          </div>

          <div className="bg-muted/20 rounded-xl border border-border/50 px-3 py-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Taxable Amount</span>
              <span className={cn("font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(document.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">IGST</span>
              <span className={cn("font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(document.igst)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">CGST</span>
              <span className={cn("font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(document.cgst)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">SGST</span>
              <span className={cn("font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(document.sgst)}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-border/60 pt-1">
              <span className="font-semibold text-foreground">Invoice Amount</span>
              <span className={cn("font-bold", MONEY_AMOUNT_CLASS)}>{formatMoney(document.invoiceAmount)}</span>
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" asChild>
            <Link href={sourceHref} onClick={onClose}>
              <ExternalLink className="w-3.5 h-3.5" /> Open Source Document
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
