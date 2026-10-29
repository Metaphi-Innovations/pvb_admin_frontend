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
  getNotInvoicedRemainQty,
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
        /** Free qty that short close can write off (not packed / not short-closed). */
        freeShortCloseQty: getRemainingPackingQty(line),
        /** Display remain: everything not yet invoiced (includes in-process). */
        remainQty: getNotInvoicedRemainQty(line),
        meta: lineQtyMeta(line),
      }))
      .filter((row) => row.remainQty > 1e-9);
  }, [hydrated]);

  const totalRemainQty = lines.reduce((sum, row) => sum + row.remainQty, 0);
  const totalFreeShortCloseQty = lines.reduce(
    (sum, row) => sum + row.freeShortCloseQty,
    0,
  );
  const inFlightMessage = String(order?.shortCloseInFlightMessage || "").trim();
  const hasInFlightProcess = Boolean(inFlightMessage);
  const canConfirm =
    !hasInFlightProcess &&
    totalFreeShortCloseQty > 1e-9 &&
    !shortCloseMutation.isPending;

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
    if (hasInFlightProcess) {
      setError(
        "Short close cannot continue while packing/dispatch is in process. Revert or deliver/invoice first.",
      );
      return;
    }
    if (!remarks.trim()) {
      setError("Remarks are required.");
      return;
    }
    if (totalFreeShortCloseQty <= 0) {
      setError("No free remaining quantity available to short close.");
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
      <DialogContent className="max-w-6xl z-[400] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Scissors className="w-4 h-4 text-amber-600" />
            Short Close Sales Order
          </DialogTitle>
        </DialogHeader>

        {hasInFlightProcess ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950 leading-relaxed">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1.5">
                <p className="font-semibold">Order is still in process</p>
                <p className="text-[11px] text-amber-800">
                  Short close cannot continue until packing/dispatch is reverted or the order is
                  delivered/invoiced. Remain Qty below shows all quantity not yet invoiced
                  (including in-process). After revert or invoice, only free qty (neither invoiced
                  nor in process) can be short closed.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 leading-relaxed flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Short closing will permanently write off free remaining quantity on every product line.
              Invoiced quantity is kept; remaining quantity cannot be packed later.
            </span>
          </div>
        )}

        <div className="space-y-2 rounded-md border border-border bg-muted/10 px-2.5 py-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-end">
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-muted-foreground font-medium leading-none">SO No.</Label>
              <div className="h-8 flex items-center rounded border border-border bg-background px-2 text-[11px] font-mono font-semibold truncate">
                {order.soNumber || "—"}
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-muted-foreground font-medium leading-none">Customer</Label>
              <div className="h-8 flex items-center rounded border border-border bg-background px-2 text-[11px] font-medium truncate">
                {order.customerName || "—"}
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
                disabled={hasInFlightProcess}
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
              placeholder="Explain why the remaining quantity is being short closed…"
              disabled={hasInFlightProcess}
            />
          </div>
        </div>

        {error && (
          <p className="text-[11px] text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">
            Products — Remain Qty is not-yet-invoiced
            {hasInFlightProcess ? " (includes packing / dispatch in process)" : ""}
          </Label>
          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-border bg-slate-100">
                  <th className="bg-slate-100 px-3 py-2 text-left font-semibold text-muted-foreground">
                    Product Name
                  </th>
                  <th className="bg-slate-100 px-3 py-2 text-right font-semibold text-muted-foreground">
                    Order Qty
                  </th>
                  <th className="bg-slate-100 px-3 py-2 text-right font-semibold text-muted-foreground">
                    Remain Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                      No product lines with not-yet-invoiced quantity.
                    </td>
                  </tr>
                ) : (
                  lines.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-foreground">{row.productName || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {row.productCode}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StackedQtyDisplay baseQty={row.orderedQty} meta={row.meta} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StackedQtyDisplay
                          baseQty={row.remainQty}
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
                    <td className="bg-slate-100 px-3 py-2 font-medium" colSpan={2}>
                      Total Remain Qty
                    </td>
                    <td className="bg-slate-100 px-3 py-2">
                      <StackedQtyDisplay
                        baseQty={totalRemainQty}
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
            {hasInFlightProcess
              ? "Confirm stays disabled while packing/dispatch is in process. After revert or invoice, only free qty can be short closed."
              : "Short close writes off free remaining qty only (not invoiced and not in packing/dispatch)."}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {shortCloseMutation.isPending ? "Saving…" : "Confirm Short Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
