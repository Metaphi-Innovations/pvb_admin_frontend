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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote } from "lucide-react";
import type { AccountExpense, PaymentMode } from "../expense-data";
import { getApprovedAmount } from "../expense-data";
import { formatINR } from "../expense-utils";

const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"];

export function ExpensePaymentModal({
  open,
  onClose,
  expense,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  expense: AccountExpense | null;
  onConfirm: (payload: {
    paymentDate: string;
    paymentMode: PaymentMode;
    paymentReferenceNo: string;
    paidAmount: number;
    paymentRemarks: string;
  }) => void;
}) {
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Bank Transfer");
  const [paymentReferenceNo, setPaymentReferenceNo] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");

  useEffect(() => {
    if (open && expense) {
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMode(expense.paymentMode ?? "Bank Transfer");
      setPaymentReferenceNo("");
      setPaidAmount(String(getApprovedAmount(expense)));
      setPaymentRemarks("");
    }
  }, [open, expense?.id, expense?.approvedAmount, expense?.paymentMode]);

  const amountNum = parseFloat(paidAmount) || 0;
  const valid = paymentDate && paymentMode && amountNum > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/80">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-brand-700">
            <Banknote className="w-4 h-4" />
            Mark as Paid
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Amount to pay (approved): {expense ? formatINR(getApprovedAmount(expense)) : "—"} · {expense?.expenseNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input
                type="date"
                className="h-9 text-sm font-medium"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                <SelectTrigger className="h-9 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment Reference No.</Label>
            <Input
              className="h-9 text-sm font-medium"
              value={paymentReferenceNo}
              onChange={(e) => setPaymentReferenceNo(e.target.value)}
              placeholder="UTR / Cheque no. / Ref"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount to Pay</Label>
            <AccountsMoneyInput
              className="h-9 text-sm font-medium"
              value={paidAmount}
              onChange={(v) => setPaidAmount(String(v))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment Remarks</Label>
            <Textarea
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
              className="min-h-[72px] text-xs resize-none"
              placeholder="Optional payment note…"
            />
          </div>
        </div>
        <DialogFooter className="px-5 py-3 border-t border-border/80 bg-muted/20">
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!valid}
            onClick={() => {
              onConfirm({
                paymentDate,
                paymentMode,
                paymentReferenceNo: paymentReferenceNo.trim(),
                paidAmount: amountNum,
                paymentRemarks: paymentRemarks.trim(),
              });
              onClose();
            }}
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
