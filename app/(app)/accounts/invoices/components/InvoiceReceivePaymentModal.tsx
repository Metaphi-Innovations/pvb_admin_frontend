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
import type { PaymentMode } from "../../expenses/expense-data";
import type { InvoiceRecord } from "../invoices-data";
import { formatINR } from "../invoice-utils";

const MODES: PaymentMode[] = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"];

export function InvoiceReceivePaymentModal({
  open,
  onClose,
  invoice,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceRecord | null;
  onConfirm: (payload: {
    paymentDate: string;
    amount: number;
    paymentMode: PaymentMode;
    referenceNo: string;
    remarks: string;
  }) => void;
}) {
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const maxPay = invoice?.balanceAmount ?? 0;

  useEffect(() => {
    if (open && invoice) {
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMode("Bank Transfer");
      setReferenceNo("");
      setAmount(String(maxPay));
      setRemarks("");
      setError(null);
    }
  }, [open, invoice?.id, maxPay]);

  const amt = parseFloat(amount) || 0;
  const valid = paymentDate && amt > 0 && amt <= maxPay;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-brand-700">
            <Banknote className="w-4 h-4" />
            Receive Payment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {invoice?.invoiceNo} · Balance {invoice ? formatINR(maxPay) : "—"}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input type="date" className="h-9 text-[13px] font-medium" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                <SelectTrigger className="h-9 text-[13px] font-medium">
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
            <Label className="text-xs">Reference Number</Label>
            <Input className="h-9 text-[13px] font-medium" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount Received (max {formatINR(maxPay)})</Label>
            <AccountsMoneyInput
              className="h-9 text-[13px] font-medium"
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
          <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 text-[13px] font-medium bg-brand-600 hover:bg-brand-700 text-white"
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
                referenceNo: referenceNo.trim(),
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
