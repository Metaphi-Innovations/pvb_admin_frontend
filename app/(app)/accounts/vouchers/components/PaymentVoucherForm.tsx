"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
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
import { ArrowLeft, Save } from "lucide-react";
import { getActivePostingLedgers } from "@/lib/accounts/coa-hierarchy";
import {
  createVoucher,
  generateVoucherNumber,
  loadVouchers,
  validateVoucherForPost,
} from "../voucher-data";

interface PaymentVoucherFormProps {
  onDone?: () => void;
}

export function PaymentVoucherForm({ onDone }: PaymentVoucherFormProps) {
  const ledgers = useMemo(() => getActivePostingLedgers(), []);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidFromId, setPaidFromId] = useState<string>("");
  const [paidToId, setPaidToId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [error, setError] = useState<string | null>(null);

  const previewNo = useMemo(() => generateVoucherNumber("payment", loadVouchers()), []);

  const handleSave = () => {
    const amt = Number(amount);
    if (!paidFromId || !paidToId || !amt) {
      setError("Paid From, Paid To and Amount are required.");
      return;
    }
    const from = ledgers.find((l) => l.id === Number(paidFromId));
    const to = ledgers.find((l) => l.id === Number(paidToId));
    if (!from || !to) return;
    const lines = [
      { id: 1, ledgerId: to.id, ledgerName: to.accountName, debit: amt, credit: 0, remarks: "" },
      { id: 2, ledgerId: from.id, ledgerName: from.accountName, debit: 0, credit: amt, remarks: "" },
    ];
    const postErr = validateVoucherForPost({ date, narration, lines });
    if (postErr) {
      setError(postErr);
      return;
    }
    createVoucher("payment", {
      date,
      referenceNo: "",
      narration,
      status: "posted",
      lines,
    });
    onDone?.();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-border/60 bg-white flex items-center gap-2">
        <Link href="/accounts/vouchers?tab=payment" className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
        <h1 className="text-sm font-semibold flex-1">Payment Voucher</h1>
        <Button size="sm" className="h-8 text-xs bg-brand-600 text-white gap-1" onClick={handleSave}>
          <Save className="w-3.5 h-3.5" /> Post
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 max-w-xl">
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="bg-white border border-border/60 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-[11px]">Date</Label><Input className="h-8 text-xs" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-[11px]">Voucher No.</Label><Input className="h-8 text-xs font-mono bg-muted/30" value={previewNo} readOnly disabled /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Paid From Ledger</Label>
            <Select value={paidFromId} onValueChange={setPaidFromId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Bank / Cash" /></SelectTrigger>
              <SelectContent>{ledgers.map((l) => <SelectItem key={l.id} value={String(l.id)} className="text-xs">{l.accountName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Paid To Ledger</Label>
            <Select value={paidToId} onValueChange={setPaidToId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Expense / Creditor" /></SelectTrigger>
              <SelectContent>{ledgers.map((l) => <SelectItem key={l.id} value={String(l.id)} className="text-xs">{l.accountName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-[11px]">Amount</Label><Input className="h-8 text-xs font-medium tabular-nums text-right" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-[11px]">Narration</Label><Textarea className="text-xs min-h-[56px] resize-none" value={narration} onChange={(e) => setNarration(e.target.value)} /></div>
        </div>
      </div>
    </div>
  );
}
