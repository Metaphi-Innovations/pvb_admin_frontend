"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, AlertCircle, Scissors } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  calcPackingToBaseQty,
  calcPackingToWeightQty,
  formatWeightQty,
} from "@/lib/procurement/procurement-line-utils";
import { cn } from "@/lib/utils";
import type { PurchaseOrder } from "../po-data";
import {
  SHORT_CLOSE_REASONS,
  getLinePendingQty,
  getLineReceivedQty,
  getPOQtySummary,
  type ShortCloseReason,
} from "../po-qty";

export interface ShortCloseSubmitPayload {
  products: { purchaseOrderProductId: string; shortClosedQty: number; conversionQty: number }[];
  reason: ShortCloseReason;
  remarks: string;
}

function formatStackNum(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Number.isInteger(n)
    ? String(n)
    : n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

/** Stacked Case / Unit / Kg-Ltr — same pattern as PO lines & purchase returns. */
function PoStackedQty({
  packingQty,
  conversionQty,
  netWeightPerPack,
  weightUom,
  emphasize = false,
  empty = false,
}: {
  packingQty: number;
  conversionQty: number;
  netWeightPerPack?: number | null;
  weightUom?: "Kg" | "Ltr" | string | null;
  emphasize?: boolean;
  empty?: boolean;
}) {
  if (empty || !(packingQty > 0)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const unitQty = calcPackingToBaseQty(packingQty, conversionQty);
  const weightQty = calcPackingToWeightQty(packingQty, netWeightPerPack);
  const weightLabel = formatWeightQty(weightQty, weightUom);

  return (
    <div className="space-y-0.5 text-right leading-tight min-w-[72px]">
      <p
        className={cn(
          "text-xs tabular-nums",
          emphasize ? "font-semibold text-brand-700" : "font-semibold text-foreground",
        )}
      >
        {formatStackNum(packingQty)} Case
      </p>
      <p className="text-[10px] tabular-nums text-muted-foreground">
        {formatStackNum(unitQty)} Unit
      </p>
      {weightLabel !== "—" ? (
        <p className="text-[10px] tabular-nums text-muted-foreground">{weightLabel}</p>
      ) : null}
    </div>
  );
}

export function ShortClosePOModal({
  open,
  onOpenChange,
  po,
  onConfirm,
  submitting = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  po: PurchaseOrder | null;
  onConfirm: (payload: ShortCloseSubmitPayload) => void;
  submitting?: boolean;
}) {
  const [reason, setReason] = useState<ShortCloseReason>("vendor_unable_to_supply");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  const summary = po ? getPOQtySummary(po) : null;

  const lines = useMemo(() => {
    if (!po) return [];
    return po.lines
      .map((line) => {
        const productId = line.purchaseOrderProductId;
        if (!productId) return null;
        const orderedQty = line.orderedQtyPack || 0;
        const receivedQty = getLineReceivedQty(po, line);
        const pendingQty = getLinePendingQty(po, line);
        return {
          purchaseOrderProductId: productId,
          productName: line.productName,
          productCode: line.productCode,
          orderedQty,
          receivedQty,
          pendingQty,
          conversionQty: line.conversionQty ?? 1,
          netWeightPerPack: line.netWeightPerPack,
          weightUom: line.weightUom,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null && row.pendingQty > 0);
  }, [po]);

  const totalPendingQty = lines.reduce((sum, row) => sum + row.pendingQty, 0);
  const totalPendingUnitQty = lines.reduce(
    (sum, row) => sum + calcPackingToBaseQty(row.pendingQty, row.conversionQty),
    0,
  );
  const canConfirm = totalPendingQty > 0 && !submitting;

  useEffect(() => {
    if (open && po) {
      setReason("vendor_unable_to_supply");
      setRemarks("");
      setError("");
    }
  }, [open, po]);

  if (!po || !summary) return null;

  const submit = () => {
    if (!remarks.trim()) {
      setError("Remarks are required.");
      return;
    }
    if (totalPendingQty <= 0) {
      setError("No product lines available to short close.");
      return;
    }
    const products = lines.map((row) => ({
      purchaseOrderProductId: row.purchaseOrderProductId,
      shortClosedQty: row.pendingQty,
      conversionQty: row.conversionQty,
    }));
    onConfirm({
      products,
      reason,
      remarks: remarks.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl z-[400] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Scissors className="w-4 h-4 text-amber-600" />
            Short Close PO
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 leading-relaxed flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Short closing will permanently close the remaining pending quantity on every product line.
            Received quantity is kept; pending quantity cannot be received later.
          </span>
        </div>

        <div className="space-y-2 rounded-md border border-border bg-muted/10 px-2.5 py-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-end">
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-muted-foreground font-medium leading-none">PO No.</Label>
              <div className="h-8 flex items-center rounded border border-border bg-background px-2 text-[11px] font-mono font-semibold truncate">
                {po.poNumber || "—"}
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-muted-foreground font-medium leading-none">Supplier</Label>
              <div className="h-8 flex items-center rounded border border-border bg-background px-2 text-[11px] font-medium truncate">
                {po.supplierName || "—"}
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-muted-foreground font-medium leading-none">
                Reason <span className="text-red-500">*</span>
              </Label>
              <AutocompleteSelect
                options={SHORT_CLOSE_REASONS.map((r) => ({ value: r.value, label: r.label }))}
                value={reason}
                onChange={(v) => setReason(v as ShortCloseReason)}
                placeholder="Select reason…"
                className="h-8 text-[11px]"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground font-medium leading-none">
              Remarks <span className="text-red-500">*</span>
            </Label>
            <Textarea
              className="text-[11px] min-h-[40px] h-10 py-1.5 px-2 resize-y leading-snug"
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setError("");
              }}
              placeholder="Explain why the pending quantity is being short closed…"
            />
          </div>
        </div>

        {error && (
          <p className="text-[11px] text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Products — Pending Qty will be short closed</Label>
          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-border bg-slate-100">
                  <th className="bg-slate-100 px-3 py-2 text-left font-semibold text-muted-foreground">
                    Product Name
                  </th>
                  <th className="bg-slate-100 px-3 py-2 text-right font-semibold text-muted-foreground">
                    Purchase Order Qty
                  </th>
                  <th className="bg-slate-100 px-3 py-2 text-right font-semibold text-muted-foreground">
                    Received Qty
                  </th>
                  <th className="bg-slate-100 px-3 py-2 text-right font-semibold text-muted-foreground">
                    Pending Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                      No product lines with pending quantity.
                    </td>
                  </tr>
                ) : (
                  lines.map((row) => (
                    <tr key={row.purchaseOrderProductId} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-foreground">{row.productName || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {row.productCode}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <PoStackedQty
                          packingQty={row.orderedQty}
                          conversionQty={row.conversionQty}
                          netWeightPerPack={row.netWeightPerPack}
                          weightUom={row.weightUom}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <PoStackedQty
                          packingQty={row.receivedQty}
                          conversionQty={row.conversionQty}
                          netWeightPerPack={row.netWeightPerPack}
                          weightUom={row.weightUom}
                          empty={!(row.receivedQty > 0)}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <PoStackedQty
                          packingQty={row.pendingQty}
                          conversionQty={row.conversionQty}
                          netWeightPerPack={row.netWeightPerPack}
                          weightUom={row.weightUom}
                          emphasize
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {lines.length > 0 && (
                <tfoot>
                  <tr className="sticky bottom-0 z-10 border-t border-border bg-slate-100">
                    <td className="bg-slate-100 px-3 py-2 font-medium" colSpan={3}>
                      Total Pending Qty
                    </td>
                    <td className="bg-slate-100 px-3 py-2">
                      <div className="space-y-0.5 text-right leading-tight min-w-[72px]">
                        <p className="text-xs tabular-nums font-bold text-brand-700">
                          {formatStackNum(totalPendingQty)} Case
                        </p>
                        <p className="text-[10px] tabular-nums text-muted-foreground">
                          {formatStackNum(totalPendingUnitQty)} Unit
                        </p>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Short close closes the full pending quantity on each listed product line. No partial short-close quantity is entered.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={submit}
            disabled={!canConfirm}
          >
            {submitting ? "Saving…" : "Confirm Short Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

