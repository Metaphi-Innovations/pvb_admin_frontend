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
  StackedQtyDisplay,
  type QtyStackMeta,
} from "@/app/(app)/sales/shared/StackedQtyDisplay";
import {
  SHORT_CLOSE_REASONS,
  getRemainingPackingQty,
  hydrateOrderLineItems,
  shortCloseReasonLabel,
  type SalesOrder,
  type SalesOrderLineItem,
  type ShortCloseReason,
} from "../orders-data";
import { useShortCloseSalesOrder } from "@/hooks/sales/use-sales-orders";

interface ShortCloseSOModalProps {
  order: SalesOrder | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (order: SalesOrder) => void;
}

function lineQtyMeta(line: SalesOrderLineItem): QtyStackMeta {
  return {
    unitsPerPacking: Number(line.packSize) > 0 ? Number(line.packSize) : 1,
    quantityType: line.quantityType || "Piece",
    uom: line.uom ?? null,
    unitPackSize: line.unitPackSize ?? null,
    netWeight: line.netWeight ?? null,
  };
}

export default function ShortCloseSOModal({
  order,
  open,
  onClose,
  onSuccess,
}: ShortCloseSOModalProps) {
  const [reason, setReason] = useState<ShortCloseReason>("customer_cancelled_balance");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const shortCloseMutation = useShortCloseSalesOrder();

  const hydrated = order ? hydrateOrderLineItems(order) : null;

  const lines = useMemo(() => {
    if (!hydrated) return [];
    return (hydrated.lineItems ?? [])
      .map((line) => ({
        id: line.id,
        productCode: line.productCode,
        productName: line.productName,
        orderedQty: line.quantity || 0,
        packedQty: Number(line.generatedBaseQty || 0),
        remainingQty: getRemainingPackingQty(line),
        meta: lineQtyMeta(line),
      }))
      .filter((row) => row.remainingQty > 1e-9);
  }, [hydrated]);

  const totalRemaining = lines.reduce((sum, row) => sum + row.remainingQty, 0);

  useEffect(() => {
    if (open) {
      setReason("customer_cancelled_balance");
      setRemarks("");
      setError("");
    }
  }, [open, order?.id]);

  const handleClose = () => {
    setReason("customer_cancelled_balance");
    setRemarks("");
    setError("");
    onClose();
  };

  const handleConfirm = () => {
    if (!order) return;
    if (!remarks.trim()) {
      setError("Remarks are required.");
      return;
    }
    if (lines.length === 0 || totalRemaining <= 0) {
      setError("No remaining quantity available to short close.");
      return;
    }

    shortCloseMutation.mutate(
      {
        id: order.id,
        shortCloseReason: shortCloseReasonLabel(reason),
        shortCloseRemarks: remarks.trim(),
      },
      {
        onSuccess: (updated) => {
          onSuccess(updated);
          handleClose();
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Failed to short close sales order.";
          setError(message);
        },
      },
    );
  };

  if (!order || !hydrated) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl z-[400]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Scissors className="w-4 h-4 text-amber-600" />
            Short Close Sales Order
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 leading-relaxed flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Short closing will permanently write off the full remaining quantity on every product
            line. Packed/dispatched quantity is kept; remaining quantity cannot be packed later.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 py-1 md:grid-cols-2">
          <div className="space-y-3 min-w-0">
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">SO No.</span>
                <span className="font-mono font-semibold">{order.soNumber}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium text-right">{order.customerName}</span>
              </div>
              <div className="flex justify-between gap-2 items-start border-t border-border/60 pt-1.5">
                <span className="text-muted-foreground font-medium pt-0.5">Total Remaining Qty</span>
                <StackedQtyDisplay
                  baseQty={totalRemaining}
                  meta={{ quantityType: "Piece", unitsPerPacking: 1 }}
                  layout="compact"
                  emphasize
                  className="text-right [&_p:first-child]:text-brand-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason *</Label>
              <AutocompleteSelect
                options={SHORT_CLOSE_REASONS.map((r) => ({ value: r.value, label: r.label }))}
                value={reason}
                onChange={(v) => setReason(v as ShortCloseReason)}
                placeholder="Select reason…"
                className="h-[38px] text-[13px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Remarks *</Label>
              <Textarea
                className="text-xs min-h-[72px]"
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  setError("");
                }}
                placeholder="Explain why the remaining quantity is being short closed…"
              />
            </div>

            {error && (
              <p className="text-[11px] text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="space-y-1.5 min-w-0 flex flex-col">
            <Label className="text-xs">Remaining Qty by Product (all will be short closed)</Label>
            <div className="max-h-[320px] flex-1 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-border bg-slate-100">
                    <th className="bg-slate-100 px-2.5 py-1.5 text-left font-semibold text-muted-foreground">
                      Product
                    </th>
                    <th className="bg-slate-100 px-2.5 py-1.5 text-right font-semibold text-muted-foreground">
                      Ordered
                    </th>
                    <th className="bg-slate-100 px-2.5 py-1.5 text-right font-semibold text-muted-foreground">
                      Packed
                    </th>
                    <th className="bg-slate-100 px-2.5 py-1.5 text-right font-semibold text-muted-foreground">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2.5 py-3 text-center text-muted-foreground">
                        No product lines with remaining quantity.
                      </td>
                    </tr>
                  ) : (
                    lines.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-0">
                        <td className="px-2.5 py-1.5 align-top">
                          <p className="font-medium text-foreground">{row.productName || "—"}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {row.productCode}
                          </p>
                        </td>
                        <td className="px-2.5 py-1.5 align-top">
                          <StackedQtyDisplay baseQty={row.orderedQty} meta={row.meta} />
                        </td>
                        <td className="px-2.5 py-1.5 align-top">
                          <StackedQtyDisplay baseQty={row.packedQty} meta={row.meta} />
                        </td>
                        <td className="px-2.5 py-1.5 align-top">
                          <StackedQtyDisplay
                            baseQty={row.remainingQty}
                            meta={row.meta}
                            className="[&_p:first-child]:text-brand-700"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {lines.length > 0 && (
                  <tfoot>
                    <tr className="sticky bottom-0 z-10 border-t border-border bg-slate-100">
                      <td className="bg-slate-100 px-2.5 py-1.5 font-medium" colSpan={3}>
                        Total Short Close Qty
                      </td>
                      <td className="bg-slate-100 px-2.5 py-1.5">
                        <StackedQtyDisplay
                          baseQty={totalRemaining}
                          meta={{ quantityType: "Piece", unitsPerPacking: 1 }}
                          className="[&_p:first-child]:text-brand-700 [&_p:first-child]:font-bold"
                        />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Quantity is fixed to the remaining balance on each line — no manual entry.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleConfirm}
            disabled={shortCloseMutation.isPending || lines.length === 0}
          >
            {shortCloseMutation.isPending ? "Saving…" : "Confirm Short Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
