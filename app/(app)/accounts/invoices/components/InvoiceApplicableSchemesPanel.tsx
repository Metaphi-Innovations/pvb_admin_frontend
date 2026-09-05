"use client";

import Link from "next/link";
import { Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSchemeRupee } from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import type { EligibleInvoiceCnSchemeOffer } from "@/services/sales-invoice.service";
import type { InvoiceLineItem } from "../invoices-data";

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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-xs font-medium", mono && "font-mono text-brand-700")}>
        {value || "—"}
      </p>
    </div>
  );
}

function schemeTypeLabel(type: EligibleInvoiceCnSchemeOffer["scheme_type"]) {
  return type === "NEAR_EXPIRY" ? "Near Expiry" : "Special Discount";
}

export function InvoiceApplicableSchemesPanel({
  lines,
  cnSchemes = [],
  selectedCnSchemeId = null,
  onSelectCnScheme,
  loadingCnSchemes = false,
  /** When true, show the CN schemes block even if none are eligible. */
  forceShowCnSection = false,
}: {
  lines: InvoiceLineItem[];
  /** Eligible Near Expiry + Special (per-invoice) from API. */
  cnSchemes?: EligibleInvoiceCnSchemeOffer[];
  selectedCnSchemeId?: string | null;
  onSelectCnScheme?: (schemeId: string | null) => void;
  loadingCnSchemes?: boolean;
  forceShowCnSection?: boolean;
}) {
  const productDiscountRows = buildProductDiscountRows(lines);
  const hasProductDiscount = productDiscountRows.length > 0;
  const hasCnSchemes = cnSchemes.length > 0;
  const selectable = typeof onSelectCnScheme === "function";
  const showCnSection =
    forceShowCnSection || loadingCnSchemes || hasCnSchemes;

  if (!hasProductDiscount && !showCnSection) return null;

  const autoScheme = cnSchemes.find((s) => s.will_auto_apply);
  const effectiveSelection = selectedCnSchemeId;

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          Applicable Schemes
        </h3>
        {selectable && hasCnSchemes ? (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            onClick={() => onSelectCnScheme?.(null)}
          >
            Clear selection (use automatic if any)
          </button>
        ) : null}
      </div>

      {hasProductDiscount && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
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
                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                    Applied on invoice
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                  <Field
                    label="Product"
                    value={`${row.productCode ? `${row.productCode} — ` : ""}${row.productName}`}
                  />
                  <Field label="Qty" value={String(row.qty)} />
                  <Field label="Discount" value={row.discountLabel} />
                  <Field label="Scheme Type" value="Product Discount Scheme" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCnSection && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Credit Note Schemes (Near Expiry / Special)
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Select at most one scheme. Selecting a scheme skips automatic Special schemes.
            {!effectiveSelection && autoScheme
              ? ` If you leave this empty, “${autoScheme.scheme_code}” will run automatically on save.`
              : null}
          </p>

          {loadingCnSchemes ? (
            <p className="text-xs text-muted-foreground py-2">Loading eligible schemes…</p>
          ) : !hasCnSchemes ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                No eligible Near Expiry or Special (One Invoice) schemes for this dispatch.
                Check Scheme Master: scheme must be Active, cover this customer/state/product,
                and Special must use <span className="font-medium text-foreground">Evaluate On = One Invoice</span>.
              </p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {cnSchemes.map((scheme) => {
                const selected = effectiveSelection === scheme.scheme_id;
                const isAutoHint =
                  !effectiveSelection && scheme.will_auto_apply;

                return (
                  <button
                    key={scheme.scheme_id}
                    type="button"
                    disabled={!selectable}
                    onClick={() => {
                      if (!selectable) return;
                      onSelectCnScheme?.(
                        selected ? null : scheme.scheme_id,
                      );
                    }}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-colors",
                      selected
                        ? "border-brand-400 bg-brand-50/70 ring-1 ring-brand-300"
                        : isAutoHint
                          ? "border-amber-300 bg-amber-50/40"
                          : "border-border bg-muted/10 hover:border-brand-200",
                      !selectable && "cursor-default",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-brand-700">
                          {scheme.scheme_code}
                        </p>
                        <p className="text-xs font-medium text-foreground truncate">
                          {scheme.scheme_name}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          {schemeTypeLabel(scheme.scheme_type)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium",
                            scheme.run_mode === "AUTOMATIC"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-50 text-slate-700 border-slate-200",
                          )}
                        >
                          {scheme.run_mode === "AUTOMATIC"
                            ? "Automatic on save"
                            : "Manual select"}
                        </span>
                        {selected ? (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-brand-600 text-white font-medium">
                            Selected
                          </span>
                        ) : isAutoHint ? (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-amber-600 text-white font-medium">
                            Will run if none selected
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      <Field label="Est. Benefit" value={formatSchemeRupee(scheme.estimated_benefit_amount)} />
                      <Field
                        label="Discount"
                        value={
                          scheme.discount_type === "Percentage"
                            ? `${scheme.discount_value ?? 0}%`
                            : scheme.discount_value != null
                              ? `₹${scheme.discount_value}`
                              : "—"
                        }
                      />
                      <Field label="Lines" value={String(scheme.qualifying_lines.length)} />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{scheme.summary}</p>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Settlement is via Pending{" "}
            <Link
              href="/accounts/transactions/credit-notes/new"
              className="text-brand-700 hover:underline font-medium"
            >
              Credit Note
            </Link>
            . Only one Near Expiry / Special scheme can apply per invoice.
          </p>
        </div>
      )}
    </div>
  );
}
