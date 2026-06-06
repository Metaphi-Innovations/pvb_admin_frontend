"use client";

import { useEffect, useState } from "react";
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

export type ProcurementApprovalAction = "approve" | "reject";

export function ProcurementApprovalModal({
  open,
  onOpenChange,
  documentNo,
  documentLabel,
  action,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentNo: string;
  documentLabel: string;
  action: ProcurementApprovalAction;
  onConfirm: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) setRemarks("");
  }, [open, action]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[400]">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {action === "approve" ? "Approve" : "Reject"} {documentLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Document No.</span>
              <span className="font-mono font-medium">{documentNo}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Action</span>
              <span className="font-medium capitalize">{action}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Remarks{action === "reject" ? " *" : ""}</Label>
            <Textarea
              className="text-xs min-h-[72px]"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={action === "reject" ? "Reason for rejection…" : "Optional remarks…"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {action === "reject" ? (
            <Button
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
              disabled={!remarks.trim()}
              onClick={() => onConfirm(remarks.trim())}
            >
              Reject
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onConfirm(remarks.trim())}
            >
              Approve
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
