"use client";

import Link from "next/link";
import { Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBatchExpiryDate,
  formatNearExpiryBenefitLabel,
  NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
  NEAR_EXPIRY_SETTLEMENT_TOOLTIP,
} from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";
import { formatSchemeRupee } from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import type { DispatchNearExpirySchemeEntry } from "@/app/(app)/warehouse/dispatch/types";
import type { InvoiceLineItem, InvoiceNearExpirySchemeSettlement } from "../invoices-data";
import { isSchemeSettlementPending } from "../invoices-data";

type SchemeEntry = DispatchNearExpirySchemeEntry | InvoiceNearExpirySchemeSettlement;

interface ProductDiscountSchemeRow {
  schemeCode: string;
  schemeName: string;
  productCode?: string;
  productName: string;
  discountLabel: string;
  qty: number;
}

function buildProductDiscountRows(lines: InvoiceLineItem[]): ProductDiscountSchemeRow[] {
  const rows: ProductDiscountSchemeRow[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.schemeApplied !== "Yes" && !line.schemeCode) continue;
    const key = `${line.schemeCode ?? "scheme"}-${line.productId ?? line.productName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let discountLabel = "Applied";
    if (line.schemeDiscountType === "Rupees" && line.schemeDiscountAmount != null) {
      discountLabel = `₹${line.schemeDiscountAmount}/unit`;
    } else if (line.schemeDiscountPercent != null && line.schemeDiscountPercent > 0) {
      discountLabel = `${line.schemeDiscountPercent}%`;
    }

    rows.push({
      schemeCode: line.schemeCode ?? "—",
      schemeName: line.schemeName ?? "Product Discount Scheme",
      productCode: line.productCode,
      productName: line.productName,
      discountLabel,
      qty: line.qty,
    });
  }
  return rows;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-xs font-medium", mono && "font-mono text-brand-700")}>
        {value || "—"}
      </p>
    </div>
  );
}

function SettlementBadge({ pending }: { pending: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
        pending
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200",
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", pending ? "bg-amber-400" : "bg-emerald-500")} />
      {pending ? "Pending · Credit Note" : "Settled"}
    </span>
  );
}

export function InvoiceApplicableSchemesPanel({
  lines,
  nearExpiryEntries = [],
}: {
  lines: InvoiceLineItem[];
  nearExpiryEntries?: SchemeEntry[];
}) {
  const productDiscountRows = buildProductDiscountRows(lines);
  const hasProductDiscount = productDiscountRows.length > 0;
  const hasNearExpiry = nearExpiryEntries.length > 0;

  if (!hasProductDiscount && !hasNearExpiry) return null;

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
        Applicable Schemes
      </h3>

      {hasProductDiscount && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Product Discount Scheme
          </p>
          <div className="space-y-2">
            {productDiscountRows.map((row, i) => (
              <div
                key={`${row.schemeCode}-${row.productName}-${i}`}
                className="rounded-lg border border-brand-100 bg-brand-50/40 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-brand-700">{row.schemeCode}</p>
                    <p className="text-xs font-medium text-foreground">{row.schemeName}</p>
                  </div>
                  <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                    Applied on invoice
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                  <Field label="Product" value={`${row.productCode ? `${row.productCode} — ` : ""}${row.productName}`} />
                  <Field label="Qty" value={String(row.qty)} />
                  <Field label="Discount" value={row.discountLabel} />
                  <Field label="Scheme Type" value="Product Discount Scheme" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasNearExpiry && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Other Schemes (Settlement via Credit Note)
          </p>
          <div className="space-y-2">
            {nearExpiryEntries.map((entry, index) => {
              const settlementStatus =
                "settlementStatus" in entry && entry.settlementStatus
                  ? entry.settlementStatus
                  : NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING;
              const pending = isSchemeSettlementPending(settlementStatus);

              return (
                <div
                  key={`${entry.schemeCode}-${entry.batchNumber}-${index}`}
                  className="rounded-lg border border-amber-100 bg-amber-50/30 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-brand-700">{entry.schemeCode}</p>
                      <p className="text-xs font-medium text-foreground">{entry.schemeName}</p>
                    </div>
                    <SettlementBadge pending={pending} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                    <Field label="Scheme Type" value={entry.schemeType} />
                    <Field label="Product" value={entry.product} />
                    <Field label="Batch No." value={entry.batchNumber} mono />
                    <Field label="Expiry Date" value={formatBatchExpiryDate(entry.batchExpiryDate)} />
                    <Field
                      label="Benefit"
                      value={formatNearExpiryBenefitLabel(
                        entry.benefitType as "Percentage" | "Fixed Amount",
                        entry.benefitValue,
                      )}
                    />
                    <Field
                      label="Est. Benefit"
                      value={formatSchemeRupee(entry.estimatedBenefitAmount)}
                    />
                    <Field label="Settlement" value={pending ? "Credit Note (Pending)" : "Settled"} />
                  </div>
                  {pending && (
                    <p className="text-[10px] text-amber-800 mt-2 flex items-center gap-1">
                      This scheme will appear as pending when creating a{" "}
                      <Link
                        href="/accounts/transactions/credit-notes/new"
                        className="text-brand-700 hover:underline font-medium"
                      >
                        Credit Note
                      </Link>
                      .
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">{NEAR_EXPIRY_SETTLEMENT_TOOLTIP}</p>
    </div>
  );
}
