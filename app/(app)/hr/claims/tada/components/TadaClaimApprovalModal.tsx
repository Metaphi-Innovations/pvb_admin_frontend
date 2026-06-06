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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";
import {
  getClaimedAmount,
  getCurrentApprovalLevel,
  validatePartialApprovedAmount,
  type TadaClaim,
} from "../tada-claim-data";
import { loadApprovalHierarchy } from "../approval-hierarchy-data";

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function TadaClaimApprovalModal({
  open,
  onClose,
  claim,
  onApproveFull,
  onApprovePartial,
  onReject,
}: {
  open: boolean;
  onClose: () => void;
  claim: TadaClaim | null;
  onApproveFull: (remarks: string) => void;
  onApprovePartial: (approvedAmount: number, remarks: string) => void;
  onReject: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [approvedInput, setApprovedInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const claimed = claim ? getClaimedAmount(claim) : 0;
  const level = claim ? getCurrentApprovalLevel(claim) : undefined;
  const allowPartial = loadApprovalHierarchy().allowPartialApproval;

  useEffect(() => {
    if (open && claim) {
      setRemarks("");
      setApprovedInput(String(getClaimedAmount(claim)));
      setError(null);
    }
  }, [open, claim?.id]);

  const parsed = parseFloat(approvedInput) || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/80">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            Approve TA/DA Claim
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Level: {claim?.currentApprovalLevelLabel ?? "Final"} · Claim {claim?.claimNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Employee</p>
              <p className="font-medium">{claim?.employeeName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Claim Type</p>
              <p className="font-medium">{claim?.claimType}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/15 p-3 space-y-1">
            <p>
              <span className="text-muted-foreground">Claimed:</span>{" "}
              <span className="font-semibold text-brand-700">{formatINR(claimed)}</span>
            </p>
            {allowPartial && (
              <p>
                <span className="text-muted-foreground">Proposed approved:</span>{" "}
                <span className="font-semibold text-emerald-700">{formatINR(parsed)}</span>
                {parsed < claimed && (
                  <span className="text-amber-700 ml-2">Deducted {formatINR(claimed - parsed)}</span>
                )}
              </p>
            )}
            {level && (
              <p className="text-[10px] text-muted-foreground">Approver role: {level.label}</p>
            )}
          </div>
          {allowPartial && (
            <div className="space-y-1">
              <Label className="text-xs">Approved Amount</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                value={approvedInput}
                onChange={(e) => {
                  setApprovedInput(e.target.value);
                  setError(null);
                }}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Approval Remarks</Label>
            <Textarea
              className="min-h-[72px] text-xs resize-none"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600">{error}</p>}
        </div>
        <DialogFooter className="px-5 py-3 border-t bg-muted/20 flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button
              size="sm"
              className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (!claim) return;
                const err = validatePartialApprovedAmount(claim, claimed);
                if (err) {
                  setError(err);
                  return;
                }
                onApproveFull(remarks.trim());
                onClose();
              }}
            >
              Approve Full
            </Button>
            {allowPartial && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs flex-1"
                onClick={() => {
                  if (!claim) return;
                  const err = validatePartialApprovedAmount(claim, parsed);
                  if (err) {
                    setError(err);
                    return;
                  }
                  onApprovePartial(parsed, remarks.trim());
                  onClose();
                }}
              >
                Approve Partial
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs flex-1 text-red-600 border-red-200"
              onClick={() => {
                if (!remarks.trim()) {
                  setError("Rejection remarks required.");
                  return;
                }
                onReject(remarks.trim());
                onClose();
              }}
            >
              Reject
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
