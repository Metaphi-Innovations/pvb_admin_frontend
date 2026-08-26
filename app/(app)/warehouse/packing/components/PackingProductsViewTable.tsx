"use client";

import { ProductSkuCell } from "@/app/(app)/warehouse/grn/shared/components/ProductSkuCell";
import { PackingStackedQty } from "./PackingStackedQty";
import type { PackedProduct, SalesOrderProduct } from "../types";

function formatDateOnly(value?: string | null): string {
  if (value === null || value === undefined) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

type PackingViewLine = SalesOrderProduct | PackedProduct;

const TH =
  "px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap";
const TH_RIGHT = "px-3 py-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap";
const TD = "px-3 py-2.5 align-top text-xs";

export function PackingProductsViewTable({
  products,
  qtyLabel,
  showPending,
}: {
  products: PackingViewLine[];
  qtyLabel: string;
  showPending?: boolean;
}) {
  if (!products?.length) {
    return <p className="text-xs text-muted-foreground py-4">No products found.</p>;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="bg-muted/10 border-b border-border">
              <th className={`${TH} min-w-[160px]`}>Product</th>
              <th className={TH}>Batch</th>
              <th className={TH}>Mfg Date</th>
              <th className={TH}>Expiry Date</th>
              <th className={TH_RIGHT}>{qtyLabel}</th>
              <th className={TH_RIGHT}>Packed Qty</th>
              {showPending ? <th className={TH_RIGHT}>Pending Qty</th> : null}
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const sku = p.sku || ("productCode" in p ? p.productCode : "") || "";
              const orderBase = Number(p.orderBaseQty ?? 0);
              const packedBase = Number(
                "packedBaseQty" in p ? p.packedBaseQty ?? 0 : 0,
              );
              const pendingBase =
                "pendingBaseQty" in p ? Number(p.pendingBaseQty ?? 0) : 0;
              const key = `${sku}-${p.batchNumber || idx}-${("lineId" in p && p.lineId) || idx}`;

              return (
                <tr key={key} className="border-b border-border/60 hover:bg-muted/5">
                  <td className={`${TD} min-w-[160px]`}>
                    <ProductSkuCell name={p.product} sku={sku} />
                  </td>
                  <td className={`${TD} font-mono font-semibold text-brand-700`}>
                    {p.batchNumber?.trim() ? p.batchNumber : "—"}
                  </td>
                  <td className={`${TD} text-muted-foreground`}>{formatDateOnly(p.mfgDate)}</td>
                  <td className={`${TD} text-muted-foreground`}>{formatDateOnly(p.expDate)}</td>
                  <td className={TD}>
                    <PackingStackedQty baseQty={orderBase} line={p} />
                  </td>
                  <td className={TD}>
                    <PackingStackedQty baseQty={packedBase} line={p} emphasize />
                  </td>
                  {showPending ? (
                    <td className={TD}>
                      <PackingStackedQty baseQty={pendingBase} line={p} emphasize />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
