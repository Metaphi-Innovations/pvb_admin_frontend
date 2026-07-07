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
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";
import type { AccountExpense } from "../expense-data";
import { getClaimedAmount, validateApprovedAmount } from "../expense-data";
import { formatINR } from "../expense-utils";
import { ExpenseAmountsCard } from "./ExpenseAmountsCard";

export function ExpenseApprovalModal({
  open,
  onClose,
  expense,
  onApproveFull,
  onApprovePartial,
  onReject,
}: {
  open: boolean;
  onClose: () => void;
  expense: AccountExpense | null;
  onApproveFull: (remarks: string) => void;
  onApprovePartial: (approvedAmount: number, remarks: string) => void;
  onReject: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [approvedInput, setApprovedInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const claimed = expense ? getClaimedAmount(expense) : 0;

  useEffect(() => {
    if (open && expense) {
      setRemarks("");
      setApprovedInput(String(getClaimedAmount(expense)));
      setError(null);
    }
  }, [open, expense?.id]);

  const parsedApproved = parseFloat(approvedInput) || 0;

  const handlePartial = () => {
    if (!expense) return;
    const err = validateApprovedAmount(expense, parsedApproved);
    if (err) {
      setError(err);
      return;
    }
    if (parsedApproved === claimed) {
      onApproveFull(remarks.trim());
    } else {
      onApprovePartial(parsedApproved, remarks.trim());
    }
    onClose();
  };

  const handleFull = () => {
    if (!expense) return;
    onApproveFull(remarks.trim());
    onClose();
  };

  const handleReject = () => {
    if (!remarks.trim()) {
      setError("Rejection remarks are required.");
      return;
    }
    onReject(remarks.trim());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/80">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            Approve Expense
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Approve full or partial amount. Claimed amount cannot be exceeded.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Expense No.</p>
              <p className="font-mono font-semibold text-foreground mt-0.5">{expense?.expenseNumber}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Employee</p>
              <p className="font-medium text-foreground mt-0.5">{expense?.employeeName}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Category</p>
              <p className="font-medium text-foreground mt-0.5">{expense?.categoryName}</p>
            </div>
          </div>

          {expense && <ExpenseAmountsCard expense={{ ...expense, approvedAmount: 0, paidAmount: 0 }} compact />}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Approved Amount (editable)</Label>
            <AccountsMoneyInput
              className="h-9 text-[13px] font-medium font-semibold"
              value={approvedInput}
              onChange={(v) => {
                setApprovedInput(String(v));
                setError(null);
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              Claimed: {formatINR(claimed)}
              {parsedApproved < claimed && parsedApproved > 0 && (
                <span className="text-amber-700 ml-2">
                  · Deducted: {formatINR(claimed - parsedApproved)}
                </span>
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Approval Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setError(null);
              }}
              placeholder="Optional for approval; required for rejection…"
              className="min-h-[72px] text-xs resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter className="px-5 py-3 border-t border-border/80 bg-muted/20 flex-col sm:flex-col gap-2">
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              size="sm"
              className="h-9 text-[13px] font-medium flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleFull}
            >
              Approve Full Amount
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-[13px] font-medium flex-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              onClick={handlePartial}
              disabled={parsedApproved <= 0 || parsedApproved > claimed}
            >
              Approve Partial Amount
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-[13px] font-medium flex-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleReject}
            >
              Reject
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
