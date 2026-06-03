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
import type { PurchaseRequest } from "../pr-data";

export type PRApprovalAction = "approve" | "reject";

interface PRApprovalModalProps {
  open: boolean;
  onClose: () => void;
  pr: PurchaseRequest | null;
  action: PRApprovalAction;
  onConfirm: (remarks: string) => void;
}

export function PRApprovalModal({ open, onClose, pr, action, onConfirm }: PRApprovalModalProps) {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) setRemarks("");
  }, [open, action, pr?.id]);

  if (!pr) return null;

  const isApprove = action === "approve";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/80">
          <DialogTitle
            className={`text-sm font-semibold flex items-center gap-2 ${isApprove ? "text-emerald-700" : "text-red-600"}`}
          >
            {isApprove ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {isApprove ? "Approve Purchase Request" : "Reject Purchase Request"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Confirm your decision. Remarks are shared in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">PR No.</p>
              <p className="font-mono font-semibold text-foreground mt-0.5">{pr.prNumber}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Requested By</p>
              <p className="font-medium text-foreground mt-0.5">{pr.requestedBy}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Approval Action</p>
              <p className={`font-medium mt-0.5 ${isApprove ? "text-emerald-700" : "text-red-600"}`}>
                {isApprove ? "Approve" : "Reject"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Remarks / Reason {!isApprove && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isApprove ? "Optional approval note…" : "Provide a clear reason for rejection…"}
              className="min-h-[88px] text-xs resize-none"
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
