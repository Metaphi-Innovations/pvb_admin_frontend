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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote } from "lucide-react";
import type { PaymentMode } from "../expense-data";
import {
  getPendingPaymentAmount,
  getRejectedAmount,
  type AccountPaymentRecord,
} from "../accounts-payment-data";
import { formatINR } from "../expense-utils";

const MODES: PaymentMode[] = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"];

export function FinancePaymentModal({
  open,
  onClose,
  record,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  record: AccountPaymentRecord | null;
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
  const [error, setError] = useState<string | null>(null);

  const maxPay = record ? getPendingPaymentAmount(record) : 0;

  useEffect(() => {
    if (open && record) {
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMode("Bank Transfer");
      setPaymentReferenceNo("");
      setPaidAmount(String(getPendingPaymentAmount(record)));
      setPaymentRemarks("");
      setError(null);
    }
  }, [open, record?.id, record?.approvedAmount, record?.paidAmount]);

  const amount = parseFloat(paidAmount) || 0;
  const valid = paymentDate && amount > 0 && amount <= maxPay;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/80">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-brand-700">
            <Banknote className="w-4 h-4" />
            Mark as Paid
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pay against approved amount only · Pending: {record ? formatINR(maxPay) : "—"}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-3 space-y-1 text-xs border-b bg-muted/10">
          {record && (
            <>
              <p>
                Claimed {formatINR(record.claimedAmount)} · Approved{" "}
                <span className="font-semibold text-emerald-700">{formatINR(record.approvedAmount)}</span>
                {getRejectedAmount(record) > 0 && (
                  <span className="text-amber-800"> · Rejected {formatINR(getRejectedAmount(record))}</span>
                )}
              </p>
              <p>
                Already paid {formatINR(record.paidAmount)} · This payment max {formatINR(maxPay)}
              </p>
            </>
          )}
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input type="date" className="h-8 text-xs" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
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
            <Input className="h-8 text-xs" value={paymentReferenceNo} onChange={(e) => setPaymentReferenceNo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Paid Amount (max {formatINR(maxPay)})</Label>
            <Input
              type="number"
              min={0}
              max={maxPay}
              className="h-8 text-xs"
              value={paidAmount}
              onChange={(e) => {
                setPaidAmount(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment Remarks</Label>
            <Textarea className="min-h-[72px] text-xs resize-none" value={paymentRemarks} onChange={(e) => setPaymentRemarks(e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter className="px-5 py-3 border-t bg-muted/20">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!valid}
            onClick={() => {
              if (amount > maxPay) {
                setError(`Cannot exceed remaining ${formatINR(maxPay)}`);
                return;
              }
              onConfirm({
                paymentDate,
                paymentMode,
                paymentReferenceNo: paymentReferenceNo.trim(),
                paidAmount: amount,
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
