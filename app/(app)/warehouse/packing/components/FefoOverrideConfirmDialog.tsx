"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FefoOverrideConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function FefoOverrideConfirmDialog({
  open,
  onClose,
  onConfirm,
}: FefoOverrideConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            FEFO Recommendation
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            An older batch is available as per FEFO. Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Review Selection
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Continue Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
