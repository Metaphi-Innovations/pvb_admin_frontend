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
import { QcService } from "@/services/qc.service";
import { showToast } from "@/lib/toast";
import type { QcRecord } from "../types";

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

export function useQcRevert(onSuccess: () => void) {
  const [revertTarget, setRevertTarget] = useState<QcRecord | null>(null);
  const [reverting, setReverting] = useState(false);

  const confirmRevert = useCallback(async () => {
    if (!revertTarget) return;
    setReverting(true);
    try {
      await QcService.revert(revertTarget.id);
      showToast(
        `QC ${revertTarget.qcNo || ""} reverted successfully. GRN is QC Pending again.`.trim(),
        "success",
      );
      setRevertTarget(null);
      onSuccess();
    } catch (err) {
      showToast(
        getApiErrorMessage(err, "Failed to revert QC. Please try again."),
        "error",
      );
    } finally {
      setReverting(false);
    }
  }, [revertTarget, onSuccess]);

  return {
    revertTarget,
    setRevertTarget,
    reverting,
    confirmRevert,
  };
}

export function QcRevertDialog(props: {
  target: QcRecord | null;
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
            Revert QC?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to revert{" "}
          <span className="font-semibold text-foreground">
            {target?.qcNo || "this QC"}
          </span>
          ? Inventory from this QC will be removed and the GRN will return to QC
          Pending. This only works if stock is unused and any Purchase Invoice is
          cancelled (or never created).
        </p>
        <DialogFooter className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Reverting…" : "Confirm Revert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
