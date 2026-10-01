"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";

export type HrApprovalAction = "approve" | "reject";

interface HrApprovalModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  referenceLabel: string;
  referenceValue: string;
  employeeLabel?: string;
  employeeValue?: string;
  action: HrApprovalAction;
  onConfirm: (remarks: string) => void;
}

export function HrApprovalModal({
  open,
  onClose,
  title,
  referenceLabel,
  referenceValue,
  employeeLabel,
  employeeValue,
  action,
  onConfirm,
}: HrApprovalModalProps) {
  const [remarks, setRemarks] = useState("");
  const isApprove = action === "approve";

  useEffect(() => {
    if (open) setRemarks("");
  }, [open, action, referenceValue]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/80">
          <DialogTitle
            className={`text-sm font-semibold flex items-center gap-2 ${isApprove ? "text-emerald-700" : "text-red-600"}`}
          >
            {isApprove ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Confirm your decision. Remarks are recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {referenceLabel}
              </p>
              <p className="font-mono font-semibold text-foreground mt-0.5">{referenceValue}</p>
            </div>
            {employeeValue && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {employeeLabel ?? "Employee"}
                </p>
                <p className="font-medium text-foreground mt-0.5">{employeeValue}</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Remarks {!isApprove && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isApprove ? "Optional note…" : "Reason for rejection…"}
              className="min-h-[80px] text-xs resize-none"
            />
          </div>
        </div>
        <DialogFooter className="px-5 py-3 border-t border-border/80 bg-muted/20">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={`h-8 text-xs text-white ${isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
            disabled={!isApprove && !remarks.trim()}
            onClick={() => {
              onConfirm(remarks.trim());
              onClose();
            }}
          >
            {isApprove ? "Confirm Approve" : "Confirm Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
