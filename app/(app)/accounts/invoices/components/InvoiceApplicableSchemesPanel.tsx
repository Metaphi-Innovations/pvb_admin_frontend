"use client";

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

function schemeTypeLabel(type: EligibleInvoiceCnSchemeOffer["scheme_type"]) {
  return type === "NEAR_EXPIRY" ? "Near Expiry" : "Special Discount";
}

function discountLabel(scheme: EligibleInvoiceCnSchemeOffer) {
  if (scheme.discount_type === "Percentage") {
    return `${scheme.discount_value ?? 0}%`;
  }
  if (scheme.discount_value != null) return `₹${scheme.discount_value}`;
  return "—";
}

export function InvoiceApplicableSchemesPanel({
  lines,
  cnSchemes = [],
  selectedCnSchemeId = null,
  onSelectCnScheme,
  loadingCnSchemes = false,
  forceShowCnSection = false,
}: {
  lines: InvoiceLineItem[];
  cnSchemes?: EligibleInvoiceCnSchemeOffer[];
  selectedCnSchemeId?: string | null;
  onSelectCnScheme?: (schemeId: string | null) => void;
  loadingCnSchemes?: boolean;
  forceShowCnSection?: boolean;
}) {
  const productDiscountRows = buildProductDiscountRows(lines);
  const hasProductDiscount = productDiscountRows.length > 0;
  // Multi-invoice Special is background-only — never show here.
  const schemes = cnSchemes.filter(
    (s) => s.evaluation_scope !== "SCHEME_PERIOD",
  );
  const hasCnSchemes = schemes.length > 0;
  const selectable = typeof onSelectCnScheme === "function";
  const showCnSection =
    forceShowCnSection || loadingCnSchemes || hasCnSchemes;

  if (!hasProductDiscount && !showCnSection) return null;

  const autoScheme = schemes.find((s) => s.will_auto_apply);
  const effectiveSelection = selectedCnSchemeId;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h3 className="text-xs font-semibold text-foreground">Applicable Schemes</h3>
        {selectable && hasCnSchemes ? (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => onSelectCnScheme?.(null)}
          >
            Clear selection
          </button>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-3">
        {hasProductDiscount ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Product Discount
            </p>
            <ul className="space-y-1">
              {productDiscountRows.map((row, i) => (
                <li
                  key={`${row.schemeCode}-${row.productName}-${i}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs"
                >
                  <span className="min-w-0">
                    <span className="font-mono font-medium text-brand-700">
                      {row.schemeCode}
                    </span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-foreground">
                      {row.productCode ? `${row.productCode} — ` : ""}
                      {row.productName}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {row.discountLabel} · Qty {row.qty}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showCnSection ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Credit Note Scheme
                <span className="font-normal"> (pick one)</span>
              </p>
              {!effectiveSelection && autoScheme ? (
                <p className="text-[11px] text-amber-800">
                  Auto on save: {autoScheme.scheme_code}
                </p>
              ) : null}
            </div>

            {loadingCnSchemes ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : !hasCnSchemes ? (
              <p className="text-xs text-muted-foreground">
                No eligible Near Expiry or Special (one invoice) schemes.
              </p>
            ) : (
              <div className="space-y-1.5">
                {schemes.map((scheme) => {
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
                        onSelectCnScheme?.(selected ? null : scheme.scheme_id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                        selected
                          ? "border-brand-500 bg-brand-50"
                          : isAutoHint
                            ? "border-amber-400 bg-amber-50/60"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                        !selectable && "cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2",
                          selected
                            ? "border-brand-600 bg-brand-600"
                            : isAutoHint
                              ? "border-amber-500 bg-amber-500/20"
                              : "border-slate-300 bg-white",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-xs font-semibold text-brand-700">
                            {scheme.scheme_code}
                          </span>
                          <span className="text-xs text-foreground truncate">
                            {scheme.scheme_name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {schemeTypeLabel(scheme.scheme_type)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                          <span className="font-medium tabular-nums text-foreground">
                            {formatSchemeRupee(scheme.estimated_benefit_amount)}
                          </span>
                          <span>{discountLabel(scheme)}</span>
                          {selected ? (
                            <span className="font-medium text-brand-700">Selected</span>
                          ) : isAutoHint ? (
                            <span className="font-medium text-amber-800">
                              Runs if none selected
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
