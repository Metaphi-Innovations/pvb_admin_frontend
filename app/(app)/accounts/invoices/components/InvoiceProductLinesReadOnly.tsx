"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { calcGstLineSplit, type InvoiceLineItem } from "../invoices-data";
import { formatINR } from "../invoice-utils";
import {
  INVOICE_FORM_TABLE_TD_CLASS,
  INVOICE_FORM_TABLE_TH_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";

function formatSchemeDiscount(line: InvoiceLineItem): string {
  if (line.schemeApplied !== "Yes" && !line.schemeCode) return "—";
  const parts: string[] = [];
  if (line.schemeCode) parts.push(line.schemeCode);
  if (line.schemeName) parts.push(line.schemeName);
  if (line.schemeDiscountType === "Rupees" && line.schemeDiscountAmount != null) {
    parts.push(`₹${line.schemeDiscountAmount}/unit`);
  } else if (line.schemeDiscountPercent != null && line.schemeDiscountPercent > 0) {
    parts.push(`${line.schemeDiscountPercent}%`);
  }
  return parts.length ? parts.join(" · ") : "Applied";
}

export function InvoiceProductLinesReadOnly({
  lines,
  interstate = false,
}: {
  lines: InvoiceLineItem[];
  interstate?: boolean;
}) {
  const visibleLines = useMemo(
    () => lines.filter((l) => l.productName || l.productId),
    [lines],
  );

  const headers = interstate
    ? [
        "Item Details",
        "HSN/SAC",
        "Qty",
        "Unit",
        "DP (₹)",
        "Rate (₹)",
        "Disc %",
        "Product Discount Scheme",
        "Taxable (₹)",
        "GST %",
        "IGST (₹)",
        "Line Total (₹)",
      ]
    : [
        "Item Details",
        "HSN/SAC",
        "Qty",
        "Unit",
        "DP (₹)",
        "Rate (₹)",
        "Disc %",
        "Product Discount Scheme",
        "Taxable (₹)",
        "GST %",
        "CGST (₹)",
        "SGST (₹)",
        "Line Total (₹)",
      ];

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Line items from dispatch — read-only. Product discount scheme is applied as per sales order.
      </p>
      <div className="overflow-x-auto border border-border rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {headers.map((h) => (
                <th
                  key={h}
                  className={cn(
                    INVOICE_FORM_TABLE_TH_CLASS,
                    "px-3 py-2.5",
                    [
                      "Qty",
                      "DP (₹)",
                      "Rate (₹)",
                      "Disc %",
                      "Taxable (₹)",
                      "GST %",
                      "CGST (₹)",
                      "SGST (₹)",
                      "IGST (₹)",
                      "Line Total (₹)",
                    ].includes(h) && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleLines.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-12 text-center text-sm text-muted-foreground">
                  Select a dispatch to load product lines.
                </td>
              </tr>
            ) : (
              visibleLines.map((line) => {
                const split = calcGstLineSplit(line, interstate);
                return (
                  <tr
                    key={line.id}
                    className="border-b border-border/60 last:border-b-0 hover:bg-muted/10"
                  >
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "min-w-[200px]")}>
                      <p className="font-mono text-xs font-semibold text-brand-700">
                        {line.productCode || "—"}
                      </p>
                      <p className="text-xs font-medium text-foreground mt-0.5">{line.productName}</p>
                      {line.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[220px]">
                          {line.description}
                        </p>
                      )}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "font-mono text-xs")}>
                      {line.hsn || "—"}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums")}>
                      {line.qty}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-center text-xs")}>
                      {line.unit}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums text-muted-foreground")}>
                      {line.dealerPrice != null ? formatINR(line.dealerPrice) : "—"}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums font-medium")}>
                      {formatINR(line.unitPrice)}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums")}>
                      {line.discountPct > 0 ? `${line.discountPct}%` : "—"}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "min-w-[140px]")}>
                      {line.schemeApplied === "Yes" || line.schemeCode ? (
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-brand-50 border border-brand-200 text-brand-700 font-medium">
                          {formatSchemeDiscount(line)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums")}>
                      {formatINR(split.taxable)}
                    </td>
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums")}>
                      {line.taxPct}%
                    </td>
                    {!interstate && (
                      <>
                        <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums text-muted-foreground")}>
                          {split.cgst > 0 ? formatINR(split.cgst) : "—"}
                        </td>
                        <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums text-muted-foreground")}>
                          {split.sgst > 0 ? formatINR(split.sgst) : "—"}
                        </td>
                      </>
                    )}
                    {interstate && (
                      <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums text-muted-foreground")}>
                        {split.igst > 0 ? formatINR(split.igst) : "—"}
                      </td>
                    )}
                    <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums font-semibold")}>
                      {formatINR(split.lineTotal)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
