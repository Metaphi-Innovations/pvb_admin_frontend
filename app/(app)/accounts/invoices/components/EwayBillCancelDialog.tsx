"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CancelEwayBillInput } from "@/services/sales-invoice.service";

const CANCEL_REASONS: Array<{
  code: CancelEwayBillInput["cancelRsnCode"];
  label: string;
}> = [
  { code: 1, label: "1 — Duplicate" },
  { code: 2, label: "2 — Order Cancelled" },
  { code: 3, label: "3 — Data Entry Mistake" },
  { code: 4, label: "4 — Others" },
];

export function EwayBillCancelDialog({
  open,
  onClose,
  ewayBillNo,
  cancelling,
  onConfirmCancel,
}: {
  open: boolean;
  onClose: () => void;
  ewayBillNo?: string | null;
  cancelling?: boolean;
  onConfirmCancel: (input: CancelEwayBillInput) => void;
}) {
  const [reasonCode, setReasonCode] =
    useState<CancelEwayBillInput["cancelRsnCode"]>(2);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!open) return;
    setReasonCode(2);
    setRemarks("");
  }, [open]);

  const remarksRequired = reasonCode === 4;
  const canSubmit =
    !cancelling && (!remarksRequired || remarks.trim().length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !cancelling) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel E-Way Bill</DialogTitle>
          <DialogDescription>
            Cancellation is allowed within 24 hours of generation (NIC rule).
            After cancel, you can generate a new E-Way Bill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {ewayBillNo ? (
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
              <span className="text-muted-foreground">EWB No. </span>
              <span className="font-mono font-semibold">{ewayBillNo}</span>
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">
              Cancel reason
            </span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={reasonCode}
              disabled={cancelling}
              onChange={(e) =>
                setReasonCode(
                  Number(e.target.value) as CancelEwayBillInput["cancelRsnCode"],
                )
              }
            >
              {CANCEL_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">
              Remarks{remarksRequired ? " (required)" : " (optional)"}
            </span>
            <input
              type="text"
              maxLength={50}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={remarks}
              disabled={cancelling}
              placeholder={
                remarksRequired
                  ? "Enter reason for cancellation"
                  : "Optional remarks"
              }
              onChange={(e) => setRemarks(e.target.value)}
            />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={cancelling}
            onClick={onClose}
          >
            Keep E-Way Bill
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit}
            onClick={() =>
              onConfirmCancel({
                cancelRsnCode: reasonCode,
                cancelRmrk: remarks.trim() || undefined,
              })
            }
          >
            {cancelling ? "Cancelling…" : "Cancel E-Way Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
