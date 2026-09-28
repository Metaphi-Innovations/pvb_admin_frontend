"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSchemeRupee } from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import type { EligibleInvoiceCnSchemeOffer } from "@/services/sales-invoice.service";

function schemeTypeLabel(type: EligibleInvoiceCnSchemeOffer["scheme_type"]) {
  return type === "NEAR_EXPIRY" ? "Near Expiry" : "Special Discount";
}

function discountLabel(scheme: EligibleInvoiceCnSchemeOffer) {
  if (scheme.discount_type === "Percentage") {
    return `${scheme.discount_value ?? 0}%`;
  }
  if (scheme.discount_value != null) return `₹${scheme.discount_value}/unit`;
  return "—";
}

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function productCount(scheme: EligibleInvoiceCnSchemeOffer): number {
  if (scheme.scheme_type === "SPECIAL_SCHEME") {
    return scheme.contributing_products?.length ?? 0;
  }
  return scheme.qualifying_lines.length;
}

function specialAchievementLine(scheme: EligibleInvoiceCnSchemeOffer): string | null {
  if (scheme.scheme_type !== "SPECIAL_SCHEME") return null;
  const achieved = scheme.achievement_value;
  if (achieved == null) return null;
  const isQty = scheme.based_on === "SALES_QUANTITY";
  const base = (scheme.contributing_products ?? []).reduce(
    (s, p) => s + p.taxable_amount,
    0,
  );
  const achievedLabel = isQty ? `${formatQty(achieved)} qty` : formatSchemeRupee(achieved);
  const minLabel =
    scheme.min_required_value != null
      ? ` (min ${isQty ? formatQty(scheme.min_required_value) : formatSchemeRupee(scheme.min_required_value)})`
      : "";
  return `Combined ${achievedLabel}${minLabel} → ${discountLabel(scheme)} on ${formatSchemeRupee(base)}`;
}

function NearExpiryProducts({ scheme }: { scheme: EligibleInvoiceCnSchemeOffer }) {
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
          <th className="py-1 pr-2 font-medium">Product</th>
          <th className="py-1 pr-2 font-medium">Batch</th>
          <th className="py-1 pr-2 font-medium">Expiry</th>
          <th className="py-1 pr-2 font-medium text-right">Days left</th>
          <th className="py-1 pr-2 font-medium text-right">Qty</th>
          <th className="py-1 font-medium text-right">Benefit</th>
        </tr>
      </thead>
      <tbody>
        {scheme.qualifying_lines.map((line, i) => (
          <tr
            key={`${line.product_id}-${line.batch_number ?? ""}-${i}`}
            className="border-t border-slate-100"
          >
            <td className="py-1 pr-2">
              <span className="font-mono text-brand-700">{line.product_code}</span>{" "}
              <span className="text-foreground">{line.product_name}</span>
            </td>
            <td className="py-1 pr-2 font-mono">{line.batch_number || "—"}</td>
            <td className="py-1 pr-2">{formatShortDate(line.batch_expiry_date)}</td>
            <td className="py-1 pr-2 text-right tabular-nums">
              {line.remaining_expiry_days ?? "—"}
            </td>
            <td className="py-1 pr-2 text-right tabular-nums">{formatQty(line.quantity)}</td>
            <td className="py-1 text-right tabular-nums font-medium text-foreground">
              {formatSchemeRupee(line.line_benefit_amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SpecialProducts({ scheme }: { scheme: EligibleInvoiceCnSchemeOffer }) {
  const products = scheme.contributing_products ?? [];
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
          <th className="py-1 pr-2 font-medium">Product</th>
          <th className="py-1 pr-2 font-medium text-right">Qty</th>
          <th className="py-1 font-medium text-right">Taxable value</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.product_id} className="border-t border-slate-100">
            <td className="py-1 pr-2">
              <span className="font-mono text-brand-700">{p.product_code}</span>{" "}
              <span className="text-foreground">{p.product_name}</span>
            </td>
            <td className="py-1 pr-2 text-right tabular-nums">{formatQty(p.quantity)}</td>
            <td className="py-1 text-right tabular-nums">
              {formatSchemeRupee(p.taxable_amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Invoice-level Credit Note schemes (Near Expiry / Special per-invoice).
 * Product Discount is shown per item line in the product table, not here.
 */
export function InvoiceApplicableSchemesPanel({
  cnSchemes = [],
  selectedCnSchemeId = null,
  onSelectCnScheme,
  loadingCnSchemes = false,
  forceShowCnSection = false,
}: {
  cnSchemes?: EligibleInvoiceCnSchemeOffer[];
  selectedCnSchemeId?: string | null;
  onSelectCnScheme?: (schemeId: string | null) => void;
  loadingCnSchemes?: boolean;
  forceShowCnSection?: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Multi-invoice Special is background-only — never show here.
  const schemes = cnSchemes.filter(
    (s) => s.evaluation_scope !== "SCHEME_PERIOD",
  );
  const hasCnSchemes = schemes.length > 0;
  const selectable = typeof onSelectCnScheme === "function";
  const showCnSection =
    forceShowCnSection || loadingCnSchemes || hasCnSchemes;

  if (!showCnSection) return null;

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
                const count = productCount(scheme);
                const isOpen = Boolean(expanded[scheme.scheme_id]);
                const achievementLine = specialAchievementLine(scheme);

                return (
                  <div
                    key={scheme.scheme_id}
                    className={cn(
                      "rounded-md border transition-colors",
                      selected
                        ? "border-brand-500 bg-brand-50"
                        : isAutoHint
                          ? "border-amber-400 bg-amber-50/60"
                          : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <button
                      type="button"
                      disabled={!selectable}
                      onClick={() => {
                        if (!selectable) return;
                        onSelectCnScheme?.(selected ? null : scheme.scheme_id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left",
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
                        {achievementLine ? (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {achievementLine}
                          </span>
                        ) : null}
                      </span>
                    </button>

                    {count > 0 ? (
                      <div className="border-t border-slate-100 px-3 pb-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 pt-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [scheme.scheme_id]: !prev[scheme.scheme_id],
                            }))
                          }
                        >
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          {scheme.scheme_type === "NEAR_EXPIRY"
                            ? `Products (${count})`
                            : `Products counted (${count})`}
                        </button>
                        {isOpen ? (
                          <div className="mt-1 overflow-x-auto">
                            {scheme.scheme_type === "NEAR_EXPIRY" ? (
                              <NearExpiryProducts scheme={scheme} />
                            ) : (
                              <SpecialProducts scheme={scheme} />
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
