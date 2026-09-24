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
import { formatMoneyString } from "@/lib/accounts/money-format";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { cn } from "@/lib/utils";
import type {
  PurchaseRegisterApiRow,
  PurchaseRegisterGstr2bSimpleStatus,
} from "@/types/purchase-register.types";

const GSTR2B_STATUS_LABELS: Record<PurchaseRegisterGstr2bSimpleStatus, string> =
  {
    matched: "Matched",
    partially_matched: "Partially Matched",
    missing_in_2b: "Missing in 2B",
    mismatch: "Mismatch",
    not_applicable: "Not Applicable",
  };

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
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

function formatMoneyOrDash(amount: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  return formatMoneyString(amount);
}

function buildPurchaseVoucherHref(row: PurchaseRegisterApiRow): string {
  if (row.source_kind === "debit_note") {
    return `/accounts/transactions/debit-notes/${row.source_id}`;
  }
  return `/accounts/purchase-invoices/${row.source_id}`;
}

function buildGstr2bHref(
  row: PurchaseRegisterApiRow,
  financialYearId?: string,
): string {
  const params = new URLSearchParams();
  if (financialYearId) params.set("fy", financialYearId);
  if (row.purchase_date) {
    params.set("from", row.purchase_date);
    params.set("to", row.purchase_date);
  }
  if (row.recipient_gstin) params.set("gstin", row.recipient_gstin);
  const qs = params.toString();
  return qs
    ? `/accounts/reports/gst-summary/gstr2b?${qs}`
    : "/accounts/reports/gst-summary/gstr2b";
}

export function PurchaseRegister2bSheet({
  open,
  onClose,
  row,
  financialYearId,
}: {
  open: boolean;
  onClose: () => void;
  row: PurchaseRegisterApiRow | null;
  financialYearId?: string;
}) {
  if (!row) return null;

  const isDebitNote = row.source_kind === "debit_note";
  const booksGst = formatMoneyOrDash(row.gst_total);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[480px]">
        <SheetHeader>
          <SheetTitle>GSTR-2B Reconciliation</SheetTitle>
          <SheetDescription>
            {row.supplier.name} · {row.supplier_invoice_number || "—"}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div>
            <SectionHeading label="Register Status" />
            <InfoRow
              label="GSTR-2B Status"
              value={GSTR2B_STATUS_LABELS[row.gstr2b_simple_status]}
              highlight
            />
            <InfoRow label="Supplier GSTIN" value={row.supplier.gstin || "—"} />
            <InfoRow
              label="Supplier Invoice No."
              value={row.supplier_invoice_number || "—"}
            />
            <InfoRow
              label="Invoice Date"
              value={
                row.supplier_invoice_date
                  ? formatDisplayDate(row.supplier_invoice_date)
                  : "—"
              }
            />
            <InfoRow
              label="Books Taxable"
              value={formatMoneyOrDash(row.taxable_value)}
            />
            <InfoRow label="Books GST" value={booksGst} />
            <InfoRow
              label="Invoice Value"
              value={formatMoneyOrDash(row.total_invoice_value)}
            />
          </div>

          {isDebitNote ? (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                GSTR-2B reconciliation is not available for Debit Notes in the
                current version.
              </p>
            </div>
          ) : (
            <div>
              <SectionHeading label="Production Reconciliation" />
              <InfoRow label="Match Status" value={row.match_status || "—"} />
              <InfoRow label="Match Method" value={row.match_method || "—"} />
              <InfoRow label="Review Status" value={row.review_status || "—"} />
              <InfoRow
                label="Portal ITC Availability"
                value={row.portal_itc_availability || "—"}
              />
              <InfoRow
                label="PVB ITC Treatment"
                value={row.pvb_itc_treatment || "—"}
              />
              <InfoRow
                label="PVB ITC Claim Period"
                value={row.pvb_itc_claim_period || "—"}
              />
              {(row.pvb_itc_claim_total ||
                row.pvb_itc_claim_cgst ||
                row.pvb_itc_claim_sgst ||
                row.pvb_itc_claim_igst) && (
                <>
                  <InfoRow
                    label="Claim CGST"
                    value={formatMoneyOrDash(row.pvb_itc_claim_cgst)}
                  />
                  <InfoRow
                    label="Claim SGST"
                    value={formatMoneyOrDash(row.pvb_itc_claim_sgst)}
                  />
                  <InfoRow
                    label="Claim IGST"
                    value={formatMoneyOrDash(row.pvb_itc_claim_igst)}
                  />
                  <InfoRow
                    label="Claim Total"
                    value={formatMoneyOrDash(row.pvb_itc_claim_total)}
                  />
                </>
              )}
              {!row.gstr2b_recon_id &&
              row.gstr2b_simple_status === "missing_in_2b" ? (
                <div className="mt-2 rounded-lg border border-border bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    No GSTR-2B reconciliation pair found for this document.
                    Open GSTR-2B to upload portal data or review matches.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </SheetBody>
        <SheetFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href={buildPurchaseVoucherHref(row)}>Open Voucher</Link>
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            asChild
          >
            <Link href={buildGstr2bHref(row, financialYearId)}>
              Open GSTR-2B
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
