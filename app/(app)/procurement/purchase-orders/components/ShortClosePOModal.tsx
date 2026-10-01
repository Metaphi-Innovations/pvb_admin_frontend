"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import { ProcInput } from "../../design/proc-design";
import type { PurchaseOrder } from "../po-data";
import {
  SHORT_CLOSE_REASONS,
  getPOQtySummary,
  shortClosePO,
  type ShortCloseReason,
} from "../po-qty";
import { CURRENT_USER } from "@/lib/procurement/config";

export function ShortClosePOModal({
  open,
  onOpenChange,
  po,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  po: PurchaseOrder | null;
  onConfirm: (updated: PurchaseOrder) => void;
}) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<ShortCloseReason>("vendor_unable_to_supply");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  const summary = po ? getPOQtySummary(po) : null;
  const pending = summary?.pendingQty ?? 0;

  useEffect(() => {
    if (open && po) {
      setQty(String(getPOQtySummary(po).pendingQty));
      setReason("vendor_unable_to_supply");
      setRemarks("");
      setError("");
    }
  }, [open, po]);

  if (!po || !summary) return null;

  const submit = () => {
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 1) {
      setError("Short close quantity must be at least 1.");
      return;
    }
    if (n > pending) {
      setError(`Cannot exceed pending quantity (${pending}).`);
      return;
    }
    if (!remarks.trim()) {
      setError("Remarks are required.");
      return;
    }
    try {
      const updated = shortClosePO(po, {
        quantity: n,
        reason,
        remarks: remarks.trim(),
        by: CURRENT_USER,
      });
      onConfirm(updated);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to short close PO.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[400]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Short Close PO
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 leading-relaxed">
          Short Closing this PO will permanently close the remaining pending quantity. This action should be used only when the balance quantity is no longer required.
        </div>

        <div className="space-y-3 py-1">
          <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-xs space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">PO No.</span>
              <span className="font-mono font-semibold">{po.poNumber}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Supplier Name</span>
              <span className="font-medium text-right">{po.supplierName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Ordered Quantity</span>
              <span className="font-semibold tabular-nums">{summary.orderedQty}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Received Quantity</span>
              <span className="font-semibold tabular-nums">{summary.receivedQty}</span>
            </div>
            <div className="flex justify-between gap-2 border-t border-border/60 pt-1.5">
              <span className="text-muted-foreground font-medium">Pending Quantity</span>
              <span className="font-bold tabular-nums text-brand-700">{summary.pendingQty}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Short Close Quantity *</Label>
            <ProcInput
              type="number"
              min={1}
              max={pending}
              value={qty}
              onChange={(e) => {
                setQty(e.target.value);
                setError("");
              }}
              className="w-full max-w-[140px]"
            />
            <p className="text-[10px] text-muted-foreground">Maximum: {pending}</p>
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
              placeholder="Explain why the pending quantity is being short closed…"
            />
          </div>

          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={submit}
          >
            Confirm Short Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
