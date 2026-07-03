"use client";

import React from "react";
import { formatCurrency, type TaxSupplyType } from "@/lib/procurement/utils";
import type { DispatchProductLine } from "../dispatch-product-lines";

function TaxPctAmountCell({ pct, amount }: { pct: number; amount: number }) {
  return (
    <div className="space-y-0.5 text-right">
      <p className="text-xs tabular-nums text-foreground">{pct}%</p>
      <p className="text-[10px] tabular-nums font-medium text-muted-foreground">
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

export function DispatchProductDetailsTable({
  lines,
  taxSupplyType = "intra",
}: {
  lines: DispatchProductLine[];
  taxSupplyType?: TaxSupplyType;
}) {
  if (lines.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Select packed orders above to view dispatch product details.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className="w-full min-w-[1200px]">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="min-w-[180px] px-3 py-2.5 text-left text-xs font-semibold text-foreground">
              Product
            </th>
            <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold text-foreground">HSN</th>
            <th className="w-24 px-3 py-2.5 text-left text-xs font-semibold text-foreground">
              Packaging
            </th>
            <th className="w-20 px-3 py-2.5 text-right text-xs font-semibold text-foreground">Qty</th>
            <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
              SKU Qty
            </th>
            <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
              Rate/SKU
            </th>
            <th className="w-24 px-3 py-2.5 text-left text-xs font-semibold text-foreground">
              Disc. Type
            </th>
            <th className="w-20 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
              Disc. %
            </th>
            <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
              Disc. Amt
            </th>
            <th className="w-16 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
              GST %
            </th>
            {taxSupplyType === "intra" ? (
              <>
                <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
                  CGST
                </th>
                <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
                  SGST
                </th>
              </>
            ) : (
              <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
                IGST
              </th>
            )}
            <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold text-foreground">
              Total
            </th>
            <th className="min-w-[100px] px-3 py-2.5 text-left text-xs font-semibold text-foreground">
              Remarks
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.key}
              className="border-b border-border/60 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{line.productName}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  <span className="font-mono font-semibold text-brand-700">{line.productCode}</span>
                  {line.category ? ` · ${line.category}` : ""}
                </p>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{line.hsnCode || "—"}</td>
              <td className="px-3 py-2 text-xs">{line.packagingUnit}</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">{line.packingQty}</td>
              <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                {line.skuQty}
              </td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">
                {formatCurrency(line.ratePerSku)}
              </td>
              <td className="px-3 py-2 text-xs capitalize">{line.discountType}</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">
                {line.discountType === "percentage" ? `${line.discountPct}%` : "—"}
              </td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">
                {formatCurrency(line.discountAmount)}
              </td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">{line.gstPct}%</td>
              {taxSupplyType === "intra" ? (
                <>
                  <td className="px-3 py-2 align-top">
                    <TaxPctAmountCell pct={line.cgstPct} amount={line.cgstAmount} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <TaxPctAmountCell pct={line.sgstPct} amount={line.sgstAmount} />
                  </td>
                </>
              ) : (
                <td className="px-3 py-2 align-top">
                  <TaxPctAmountCell pct={line.igstPct} amount={line.igstAmount} />
                </td>
              )}
              <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums font-mono text-foreground">
                {formatCurrency(line.netAmount)}
              </td>
              <td className="px-3 py-2">
                <span
                  className="block max-w-[140px] truncate text-xs text-muted-foreground"
                  title={line.remarks !== "—" ? line.remarks : undefined}
                >
                  {line.remarks || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
