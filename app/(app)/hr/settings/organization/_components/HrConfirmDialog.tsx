"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { HR_BTN_CLASS, HR_BTN_PRIMARY_CLASS } from "./hr-org-form";

export function HrConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-[16px] p-4 gap-3">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <div
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                destructive ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200",
              )}
            >
              <AlertTriangle
                className={cn("w-3.5 h-3.5", destructive ? "text-red-500" : "text-amber-500")}
              />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-snug pl-9">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" className={HR_BTN_CLASS} onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(
              HR_BTN_CLASS,
              "text-white",
              destructive ? "bg-red-600 hover:bg-red-700" : HR_BTN_PRIMARY_CLASS,
            )}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
