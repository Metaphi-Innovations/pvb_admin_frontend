"use client";

import { Button } from "@/components/ui/button";
import { ProductSkuCell } from "@/app/(app)/warehouse/grn/shared/components/ProductSkuCell";
import { PackingStackedQty } from "./PackingStackedQty";
import type { PackedProduct } from "../types";

function formatDateOnly(value?: string | null): string {
  if (value === null || value === undefined) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

const TH =
  "px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap";
const TH_RIGHT =
  "px-3 py-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap";
const TD = "px-3 py-2.5 align-middle text-xs";

/**
 * Flat horizontal packing-done lines:
 * Product | Batch | Mfg | Expiry | Available/Order | Packed Total | Action
 */
export function PackingDoneEditLinesTable({
  products,
  qtyLabel,
  onUpdateBatch,
  onRemoveBatch,
  removeDisabledReason,
}: {
  products: PackedProduct[];
  qtyLabel: string;
  onUpdateBatch: (product: PackedProduct) => void;
  onRemoveBatch?: (product: PackedProduct) => void;
  /** When set, Remove stays disabled and shows this as title tooltip. */
  removeDisabledReason?: string | null;
}) {
  if (!products?.length) {
    return <p className="text-xs text-muted-foreground py-4">No packed lines found.</p>;
  }

  const canRemoveAny = Boolean(onRemoveBatch) && products.length > 1 && !removeDisabledReason;

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="bg-muted/10 border-b border-border">
              <th className={`${TH} min-w-[180px]`}>Product</th>
              <th className={TH}>Batch No.</th>
              <th className={TH}>Mfg Date</th>
              <th className={TH}>Expiry Date</th>
              <th className={TH_RIGHT}>{qtyLabel}</th>
              <th className={TH_RIGHT}>Packed Qty</th>
              <th className={`${TH} text-center w-40`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const sku = p.sku || p.productCode || "";
              const key =
                p.draftKey ||
                `${p.packingDoneProductId || p.lineId || sku}-${p.batchNumber || idx}`;
              const canUpdate = Boolean(p.packingDoneProductId || p.draftKey);
              const canRemoveThis =
                Boolean(onRemoveBatch) &&
                canUpdate &&
                (p.isDraft || products.length > 1) &&
                !removeDisabledReason;
              return (
                <tr
                  key={key}
                  className={`border-b border-border/60 hover:bg-muted/5 ${
                    p.isDraft ? "bg-amber-50/40" : ""
                  }`}
                >
                  <td className={`${TD} min-w-[180px]`}>
                    <div className="space-y-1">
                      <ProductSkuCell name={p.product} sku={sku} />
                      {p.isDraft ? (
                        <span className="inline-flex text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                          Unsaved
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={`${TD} font-mono font-semibold text-brand-700`}>
                    {p.batchNumber?.trim() ? p.batchNumber : "—"}
                  </td>
                  <td className={`${TD} text-muted-foreground`}>{formatDateOnly(p.mfgDate)}</td>
                  <td className={`${TD} text-muted-foreground`}>{formatDateOnly(p.expDate)}</td>
                  <td className={TD}>
                    <PackingStackedQty baseQty={Number(p.orderBaseQty || 0)} line={p} />
                  </td>
                  <td className={TD}>
                    <PackingStackedQty
                      baseQty={Number(p.packedBaseQty || 0)}
                      line={p}
                      emphasize
                    />
                  </td>
                  <td className={`${TD} text-center`}>
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px]"
                        disabled={!canUpdate}
                        onClick={() => onUpdateBatch(p)}
                      >
                        Update
                      </Button>
                      {onRemoveBatch ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
                          disabled={!canRemoveThis}
                          title={
                            removeDisabledReason ||
                            (!canRemoveAny && !p.isDraft
                              ? "Cannot remove the last packed line. Revert packing done instead."
                              : "Remove this packed line")
                          }
                          onClick={() => onRemoveBatch(p)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
