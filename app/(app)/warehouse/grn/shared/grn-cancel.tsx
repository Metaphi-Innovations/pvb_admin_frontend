"use client";

import React, { useCallback, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GrnService } from "@/services/grn.service";
import { showToast } from "@/lib/toast";

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const data = (err as { response?: { data?: { message?: string; error?: string } } })
      .response?.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export type GrnCancelTarget = {
  id: string;
  grnNo?: string;
  status?: string;
};

export function useGrnCancel(onSuccess: () => void) {
  const [cancelTarget, setCancelTarget] = useState<GrnCancelTarget | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const result = await GrnService.cancel(cancelTarget.id);
      showToast(
        `GRN ${result.grnNumber || cancelTarget.grnNo || ""} cancelled successfully.`.trim(),
        "success",
      );
      setCancelTarget(null);
      onSuccess();
    } catch (err) {
      showToast(
        getApiErrorMessage(err, "Failed to cancel GRN. Please try again."),
        "error",
      );
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget, onSuccess]);

  return {
    cancelTarget,
    setCancelTarget,
    cancelling,
    confirmCancel,
  };
}

export function GrnCancelDialog(props: {
  target: GrnCancelTarget | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { target, loading, onClose, onConfirm } = props;

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-amber-500" />
            </div>
            Cancel GRN?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to cancel{" "}
          <span className="font-semibold text-foreground">
            {target?.grnNo || "this GRN"}
          </span>
          ? Source received quantities will be rolled back and linked supplier
          invoice rows from this GRN will be removed. Only QC Pending GRNs can
          be cancelled — if QC is done, revert QC first.
        </p>
        <DialogFooter className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
            disabled={loading}
          >
            Keep GRN
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Cancelling…" : "Confirm Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
