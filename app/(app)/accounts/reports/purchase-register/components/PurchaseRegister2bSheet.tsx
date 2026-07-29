"use client";

import Link from "next/link";
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
  GSTR2B_STATUS_LABELS as PORTAL_STATUS_LABELS,
  type Gstr2bReconRow,
} from "../../gst-summary/gstr2b/gstr2b-report-types";
import {
  GSTR2B_STATUS_LABELS,
  type PurchaseRegisterRow,
} from "../purchase-register-types";
import {
  buildGstr2bHref,
  buildPurchaseVoucherHref,
  formatPurchaseRegisterDate,
} from "../purchase-register-data";

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

export function PurchaseRegister2bSheet({
  open,
  onClose,
  row,
  recon,
}: {
  open: boolean;
  onClose: () => void;
  row: PurchaseRegisterRow | null;
  recon: Gstr2bReconRow | null;
}) {
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[480px]">
        <SheetHeader>
          <SheetTitle>GSTR-2B Reconciliation</SheetTitle>
          <SheetDescription>
            {row.supplierName} · {row.supplierInvoiceNo}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div>
            <SectionHeading label="Register Status" />
            <InfoRow label="GSTR-2B Status" value={GSTR2B_STATUS_LABELS[row.gstr2bStatus]} highlight />
            <InfoRow label="Supplier GSTIN" value={row.supplierGstin} />
            <InfoRow label="Invoice No." value={row.supplierInvoiceNo} />
            <InfoRow label="Invoice Date" value={formatPurchaseRegisterDate(row.supplierInvoiceDate)} />
            <InfoRow label="Taxable Value" value={formatMoney(row.taxableValue)} />
            <InfoRow
              label="GST (C+S+I)"
              value={formatMoney(row.cgst + row.sgst + row.igst)}
            />
            <InfoRow label="Cess" value={formatMoney(row.cess)} />
            <InfoRow label="Invoice Value" value={formatMoney(row.totalInvoiceValue)} />
          </div>

          {recon ? (
            <div>
              <SectionHeading label="Books vs Portal" />
              <InfoRow
                label="Portal Status"
                value={PORTAL_STATUS_LABELS[recon.status]}
                highlight
              />
              <InfoRow label="Books Invoice" value={recon.booksInvoiceNo} />
              <InfoRow label="Portal Invoice" value={recon.portalInvoiceNo} />
              <InfoRow
                label="Taxable Diff."
                value={formatMoney(recon.taxableDifference)}
                highlight={Math.abs(recon.taxableDifference) > 1}
              />
              <InfoRow
                label="GST Diff."
                value={formatMoney(recon.gstDifference)}
                highlight={Math.abs(recon.gstDifference) > 1}
              />
              <InfoRow label="Remarks" value={recon.remarks || "—"} />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                No matching GSTR-2B reconciliation pair found for this document in the
                selected period. Open GSTR-2B to upload portal data or review matches.
              </p>
            </div>
          )}
        </SheetBody>
        <SheetFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href={buildPurchaseVoucherHref(row)}>Open Voucher</Link>
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" asChild>
            <Link href={buildGstr2bHref(row)}>Open GSTR-2B</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
