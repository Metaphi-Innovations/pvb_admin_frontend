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
import { AlertTriangle, Banknote } from "lucide-react";
import { ThreeWayMatchStatusBadge } from "@/components/erp/ThreeWayMatchStatusBadge";
import { getPurchasePaymentMatchContext, purchaseMatchWarning } from "@/lib/erp/payment-match-context";
import type { PaymentMode } from "../../expenses/expense-data";
import { getBalanceAmount, PAYMENT_MODES, type CompanyPaymentRecord } from "../payments-data";
import { formatINR } from "../payment-utils";

export function PaymentInstallmentModal({
  open,
  onClose,
  record,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  record: CompanyPaymentRecord | null;
  onConfirm: (payload: {
    paymentDate: string;
    amount: number;
    paymentMode: PaymentMode;
    paymentReferenceNo: string;
    transactionNo: string;
    remarks: string;
  }) => void;
}) {
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Bank Transfer");
  const [paymentReferenceNo, setPaymentReferenceNo] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const maxPay = record ? getBalanceAmount(record) : 0;
  const matchCtx = record ? getPurchasePaymentMatchContext(record) : null;
  const mismatchWarning = matchCtx ? purchaseMatchWarning(matchCtx.matchStatus) : null;

  useEffect(() => {
    if (open && record) {
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMode("Bank Transfer");
      setPaymentReferenceNo("");
      setTransactionNo("");
      setAmount(String(maxPay));
      setRemarks("");
      setError(null);
    }
  }, [open, record?.id, maxPay]);

  const amt = parseFloat(amount) || 0;
  const valid = paymentDate && amt > 0 && amt <= maxPay;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-brand-700">
            <Banknote className="w-4 h-4" />
            Record Payment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {record?.paymentNo} · Balance {record ? formatINR(maxPay) : "—"}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3">
          {matchCtx && (
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 space-y-1.5 text-[11px]">
              <p><span className="text-muted-foreground">PO No.:</span> <span className="font-mono font-medium">{matchCtx.poNumber}</span></p>
              <p><span className="text-muted-foreground">Supplier Invoice No.:</span> <span className="font-mono font-medium">{matchCtx.vendorInvoiceNo}</span></p>
              <p><span className="text-muted-foreground">Purchase No.:</span> <span className="font-mono font-medium">{matchCtx.purchaseNo}</span></p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">3-Way Match:</span>
                <ThreeWayMatchStatusBadge status={matchCtx.matchStatus} />
              </div>
            </div>
          )}
          {mismatchWarning && (
            <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{mismatchWarning}</p>
            </div>
          )}
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
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Reference Number</Label>
              <Input className="h-8 text-xs" value={paymentReferenceNo} onChange={(e) => setPaymentReferenceNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transaction Number</Label>
              <Input className="h-8 text-xs" value={transactionNo} onChange={(e) => setTransactionNo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount (max {formatINR(maxPay)})</Label>
            <AccountsMoneyInput
              className="h-8 text-xs"
              value={amount}
              onChange={(v) => {
                setAmount(String(v));
                setError(null);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Remarks</Label>
            <Textarea className="min-h-[64px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
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
              if (amt > maxPay) {
                setError(`Cannot exceed balance ${formatINR(maxPay)}`);
                return;
              }
              onConfirm({
                paymentDate,
                amount: amt,
                paymentMode,
                paymentReferenceNo: paymentReferenceNo.trim(),
                transactionNo: transactionNo.trim(),
                remarks: remarks.trim(),
              });
              onClose();
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
