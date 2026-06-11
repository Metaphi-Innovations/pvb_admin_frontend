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

interface ReceiptVoucherFormProps {
  onDone?: () => void;
}

export function ReceiptVoucherForm({ onDone }: ReceiptVoucherFormProps) {
  const ledgers = useMemo(() => getActivePostingLedgers(), []);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivedInId, setReceivedInId] = useState("");
  const [receivedFromId, setReceivedFromId] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previewNo = useMemo(() => generateVoucherNumber("receipt", loadVouchers()), []);

  const handleSave = () => {
    const amt = Number(amount);
    if (!receivedInId || !receivedFromId || !amt) {
      setError("Received In, Received From and Amount are required.");
      return;
    }
    const recvIn = ledgers.find((l) => l.id === Number(receivedInId));
    const recvFrom = ledgers.find((l) => l.id === Number(receivedFromId));
    if (!recvIn || !recvFrom) return;
    const lines = [
      { id: 1, ledgerId: recvIn.id, ledgerName: recvIn.accountName, debit: amt, credit: 0, remarks: "" },
      { id: 2, ledgerId: recvFrom.id, ledgerName: recvFrom.accountName, debit: 0, credit: amt, remarks: "" },
    ];
    const postErr = validateVoucherForPost({ date, narration, lines });
    if (postErr) {
      setError(postErr);
      return;
    }
    createVoucher("receipt", {
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
        <Link href="/accounts/vouchers?tab=receipt" className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
        <h1 className="text-sm font-semibold flex-1">Receipt Voucher</h1>
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
            <Label className="text-[11px]">Received In Ledger</Label>
            <Select value={receivedInId} onValueChange={setReceivedInId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Bank / Cash" /></SelectTrigger>
              <SelectContent>{ledgers.map((l) => <SelectItem key={l.id} value={String(l.id)} className="text-xs">{l.accountName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Received From Ledger</Label>
            <Select value={receivedFromId} onValueChange={setReceivedFromId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Debtor / Income" /></SelectTrigger>
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
