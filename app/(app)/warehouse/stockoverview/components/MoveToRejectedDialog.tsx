"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  StackedQtyDisplay,
  type QtyStackMeta,
} from "@/app/(app)/sales/shared/StackedQtyDisplay";
import { StockOverviewApi } from "../services/stock-overview-api";

export type MoveToRejectedTarget = {
  productName: string;
  batchNo: string;
  /** Remaining sellable base/unit qty (available only). */
  availableQty: number;
  /** Packed case rows available (CASE lots). */
  availableCases?: number | null;
  /** Stock status / expiry bucket — drives reject type. */
  status: string;
  /** Packing meta for stacked Case / Unit · Kg|Ltr display. */
  qtyMeta?: QtyStackMeta;
  sellableItemId?: string;
  productId?: string;
  warehouseId?: string;
  expiryDate?: string | null;
};

interface MoveToRejectedDialogProps {
  open: boolean;
  target: MoveToRejectedTarget | null;
  onClose: () => void;
  onSuccess: () => void;
}

function isExpiredStatus(status: string): boolean {
  return String(status || "").toLowerCase().includes("expired");
}

function isCaseLot(target: MoveToRejectedTarget | null): boolean {
  if (!target) return false;
  const qtyType = String(target.qtyMeta?.quantityType || "").toLowerCase();
  if (qtyType === "case") return true;
  return Number(target.availableCases || 0) > 0;
}

export function MoveToRejectedDialog({
  open,
  target,
  onClose,
  onSuccess,
}: MoveToRejectedDialogProps) {
  const maxUnits = Number(target?.availableQty || 0);
  const qtyMeta = target?.qtyMeta;
  const caseMode = isCaseLot(target);
  const pack = Math.max(1, Number(qtyMeta?.unitsPerPacking) || 1);
  const maxCases = caseMode
    ? target?.availableCases != null && Number(target.availableCases) > 0
      ? Number(target.availableCases)
      : Math.max(0, Math.floor(maxUnits / pack))
    : 0;
  const expired = isExpiredStatus(target?.status || "");
  const rejectType = expired ? "EXPIRED" : "DAMAGED";
  const rejectLabel = expired ? "Expired" : "Damaged";

  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !target) return;
    setError(null);
    setReason("");
    if (caseMode) {
      setQty(expired && maxCases > 0 ? String(maxCases) : "");
    } else {
      setQty(expired && maxUnits > 0 ? String(maxUnits) : "");
    }
    setSubmitting(false);
  }, [open, target, expired, caseMode, maxCases, maxUnits]);

  const qtyNum = useMemo(() => Number(qty), [qty]);
  const qtyValid = caseMode
    ? Number.isInteger(qtyNum) && qtyNum > 0 && qtyNum <= maxCases && maxCases > 0
    : Number.isFinite(qtyNum) && qtyNum > 0 && qtyNum <= maxUnits + 1e-9 && maxUnits > 0;

  const previewBaseQty = caseMode
    ? qtyValid
      ? qtyNum * pack
      : 0
    : qtyValid
      ? qtyNum
      : 0;

  const handleSubmit = async () => {
    if (!target || !qtyValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await StockOverviewApi.moveToRejected({
        sellable_item_id: target.sellableItemId,
        product_id: target.productId,
        warehouse_id: target.warehouseId,
        batch_no: target.batchNo,
        expiry_date: target.expiryDate ?? null,
        ...(caseMode ? { cases: qtyNum } : { qty: qtyNum }),
        reject_reason: reason.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(StockOverviewApi.getErrorMessage(err, "Failed to move stock to rejected."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            Move to Rejected
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            {caseMode
              ? "Packed case stock — move whole cases only (cannot take units from a case)."
              : "Piece stock — move unit qty from available only."}{" "}
            Reject type is set from expiry (Expired → Expired, otherwise Damaged).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold text-foreground truncate">
              {target?.productName || "—"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                Batch:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {target?.batchNo || "—"}
                </span>
              </span>
              <span>
                Type:{" "}
                <span className="font-semibold text-foreground">
                  {caseMode ? "Case" : "Piece"}
                </span>
              </span>
            </div>

            <div className="rounded border border-border/60 bg-white px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Available qty
              </p>
              <StackedQtyDisplay
                baseQty={maxUnits}
                meta={qtyMeta}
                layout="inline"
                emptyLabel="0"
              />
              {caseMode ? (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {maxCases.toLocaleString("en-IN")} packed case
                  {maxCases === 1 ? "" : "s"} available
                </p>
              ) : null}
            </div>

            <div className="pt-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-2">
                Reject type
              </span>
              <span
                className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                  expired
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {rejectLabel}
              </span>
              <span className="sr-only">{rejectType}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="move-rej-qty" className="text-xs">
              {caseMode ? (
                <>
                  Cases to move{" "}
                  <span className="text-muted-foreground font-normal">(whole cases only)</span>
                </>
              ) : (
                <>
                  Qty to move{" "}
                  <span className="text-muted-foreground font-normal">(units)</span>
                </>
              )}
            </Label>
            <Input
              id="move-rej-qty"
              type="number"
              min={0}
              step={caseMode ? 1 : "any"}
              max={caseMode ? maxCases : maxUnits}
              value={qty}
              disabled={submitting || (caseMode ? maxCases <= 0 : maxUnits <= 0)}
              onChange={(e) => setQty(e.target.value)}
              className="h-8 text-xs"
              placeholder={caseMode ? `Max ${maxCases} cases` : "Enter unit qty"}
            />
            {qtyValid ? (
              <div className="rounded border border-border/60 bg-muted/20 px-2.5 py-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                  Moving
                </p>
                <StackedQtyDisplay
                  baseQty={previewBaseQty}
                  meta={qtyMeta}
                  layout="inline"
                  emptyLabel="—"
                />
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                {caseMode
                  ? `Enter a whole number of cases (1–${maxCases}).`
                  : "Enter a unit qty greater than 0, up to available."}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="move-rej-reason" className="text-xs">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="move-rej-reason"
              value={reason}
              disabled={submitting}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[72px] text-xs resize-none"
              maxLength={500}
              placeholder={
                expired
                  ? "e.g. Past expiry — move remaining stock to rejected"
                  : "e.g. Damaged packaging / quality issue"
              }
            />
          </div>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        <DialogFooter className="flex gap-2 justify-end pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
            disabled={!qtyValid || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Moving…" : "Move to Rejected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
