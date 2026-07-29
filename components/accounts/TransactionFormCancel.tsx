"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface UseTransactionFormCancelOptions {
  /** Listing or parent screen to return to after cancel. */
  listHref: string;
  /** Whether the form has unsaved edits. */
  isDirty: boolean;
  /** Optional callback before navigation (e.g. clear local state). */
  onDiscard?: () => void;
  /** Override navigation (hub inline forms). Defaults to router.push(listHref). */
  onNavigate?: () => void;
}

export function useTransactionFormCancel({
  listHref,
  isDirty,
  onDiscard,
  onNavigate,
}: UseTransactionFormCancelOptions) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const navigateAway = useCallback(() => {
    onDiscard?.();
    if (onNavigate) {
      onNavigate();
    } else {
      router.push(listHref);
    }
  }, [listHref, onDiscard, onNavigate, router]);

  const requestCancel = useCallback(() => {
    if (isDirty) {
      setConfirmOpen(true);
      return;
    }
    navigateAway();
  }, [isDirty, navigateAway]);

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    navigateAway();
  }, [navigateAway]);

  const discardDialog = (
    <DiscardChangesDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      onConfirm={confirmDiscard}
    />
  );

  return { requestCancel, discardDialog, confirmOpen, setConfirmOpen };
}

export function DiscardChangesDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            Discard changes?
          </DialogTitle>
          <DialogDescription className="pt-1">
            You have unsaved changes. Do you want to discard them?
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
          >
            No, Continue Editing
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onConfirm}
          >
            Yes, Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface TransactionFormCancelButtonProps {
  listHref: string;
  isDirty: boolean;
  onDiscard?: () => void;
  onNavigate?: () => void;
  className?: string;
  size?: "sm" | "default";
}

/** Cancel button with unsaved-changes confirmation. Place next to Save actions. */
export function TransactionFormCancelButton({
  listHref,
  isDirty,
  onDiscard,
  onNavigate,
  className,
  size = "sm",
}: TransactionFormCancelButtonProps) {
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref,
    isDirty,
    onDiscard,
    onNavigate,
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={cn("h-8 text-xs font-medium", className)}
        onClick={requestCancel}
      >
        Cancel
      </Button>
      {discardDialog}
    </>
  );
}
