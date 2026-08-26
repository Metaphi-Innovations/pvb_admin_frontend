import type { GrnBatch, GrnItem } from "../types";
import { resolveGrnQtyStack } from "@/lib/warehouse/grn-quantity";
import { StackedQtyCell } from "./StackedQtyCell";
import { ProductSkuCell } from "./ProductSkuCell";
import { round2 } from "@/lib/procurement/utils";

export interface BatchDetailsInvoiceMeta {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  fileUrl?: string;
  fileName?: string;
}

function fmtNum(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function findItemForBatch(
  batch: GrnBatch,
  items: GrnItem[] | undefined,
): GrnItem | undefined {
  if (!items?.length) return undefined;
  return (
    items.find((it) => it.productId && it.productId === batch.productId) ||
    items.find(
      (it) =>
        Boolean(it.productCode) &&
        Boolean(batch.productCode) &&
        it.productCode === batch.productCode,
    ) ||
    items.find(
      (it) =>
        it.productName &&
        batch.productName &&
        it.productName === batch.productName,
    )
  );
}

export function BatchDetailsReadOnlyTable({
  batches,
  items,
  invoiceMeta,
}: {
  batches: GrnBatch[];
  /** GRN line items — used for quantity_type + packing size (batches store base qty only). */
  items?: GrnItem[];
  invoiceMeta?: BatchDetailsInvoiceMeta;
}) {
  if (batches.length === 0) return null;

  return (
    <div className="space-y-3">
      {invoiceMeta && (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice No.</p>
              <p className="text-xs font-mono font-semibold text-brand-700 mt-0.5">{invoiceMeta.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</p>
              <p className="text-xs font-medium text-foreground mt-0.5 truncate">{invoiceMeta.supplierName}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice Date</p>
              <p className="text-xs text-foreground mt-0.5">{invoiceMeta.invoiceDate}</p>
            </div>
          </div>
          {invoiceMeta.fileUrl && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground truncate" title={invoiceMeta.fileName}>
                {invoiceMeta.fileName || "Invoice file"}
              </p>
              <a
                href={invoiceMeta.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[11px] font-medium text-brand-700 hover:underline"
              >
                View File
              </a>
            </div>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground min-w-[160px]">Product</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground w-28">Batch No.</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground w-28">MFG Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground w-28">Expiry Date</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground w-32">Qty</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground w-24">Unit Price</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground w-20">GST %</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground w-28">GST Amount</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground w-28">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, idx) => {
                const item = findItemForBatch(b, items);
                const packingSize = item?.unitPerPacking ?? b.unitPerPacking ?? 1;
                const baseQty = b.quantity ?? b.invoiceQty ?? 0;
                const qtyStack = resolveGrnQtyStack(baseQty, {
                  packingSize,
                  netWeightPerPack: item?.netWeightPerPack,
                  weightUom: item?.weightUom,
                });
                const taxable = round2(baseQty * (b.unitPrice ?? 0));
                const lineTotal = round2(taxable + (b.gstAmount ?? 0));

                return (
                  <tr
                    key={`${b.productId}-${b.batchNumber}-${idx}`}
                    className="border-b border-border/60 bg-muted/5"
                  >
                    <td className="px-3 py-2.5 align-middle min-w-[160px]">
                      <ProductSkuCell name={b.productName} sku={b.productCode} />
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono font-semibold text-brand-700">{b.batchNumber}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{b.mfgDate || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{b.expDate || "—"}</td>
                    <td className="px-3 py-2.5 align-middle">
                      <StackedQtyCell stack={qtyStack} empty={!(baseQty > 0)} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center tabular-nums">{fmtNum(b.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-xs text-center tabular-nums">
                      {b.gstPct != null ? `${b.gstPct}%` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center tabular-nums font-medium">{fmtNum(b.gstAmount)}</td>
                    <td className="px-3 py-2.5 text-xs text-center tabular-nums font-semibold">{fmtNum(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
