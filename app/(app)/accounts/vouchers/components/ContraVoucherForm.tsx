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
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { getActivePostingLedgers } from "@/lib/accounts/coa-hierarchy";
import {
  createVoucher,
  generateVoucherNumber,
  loadVouchers,
  validateVoucherForPost,
} from "../voucher-data";

type ContraType = "cash_to_bank" | "bank_to_cash" | "bank_to_bank";

interface ContraVoucherFormProps {
  onDone?: () => void;
}

export function ContraVoucherForm({ onDone }: ContraVoucherFormProps) {
  const ledgers = useMemo(() => getActivePostingLedgers(), []);
  const bankLedgers = useMemo(() => getLedgersUnderSubGroupName("Bank Accounts"), []);
  const cashLedgers = useMemo(() => getLedgersUnderSubGroupName("Cash-in-Hand"), []);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [contraType, setContraType] = useState<ContraType>("cash_to_bank");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previewNo = useMemo(() => generateVoucherNumber("contra", loadVouchers()), []);

  const handleSave = () => {
    const amt = Number(amount);
    if (!fromId || !toId || !amt) {
      setError("From, To and Amount are required.");
      return;
    }
    const from = ledgers.find((l) => l.id === Number(fromId));
    const to = ledgers.find((l) => l.id === Number(toId));
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
    createVoucher("contra", {
      date,
      referenceNo: contraType.replace(/_/g, " "),
      narration,
      status: "posted",
      lines,
    });
    onDone?.();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-border/60 bg-white flex items-center gap-2">
        <Link href="/accounts/vouchers?tab=contra" className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
        <h1 className="text-sm font-semibold flex-1">Contra Voucher</h1>
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
            <Label className="text-[11px]">Contra Type</Label>
            <Select value={contraType} onValueChange={(v) => { setContraType(v as ContraType); setFromId(""); setToId(""); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_to_bank" className="text-xs">Cash To Bank</SelectItem>
                <SelectItem value="bank_to_cash" className="text-xs">Bank To Cash</SelectItem>
                <SelectItem value="bank_to_bank" className="text-xs">Bank To Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">From Ledger</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                {(contraType === "cash_to_bank" ? cashLedgers : contraType === "bank_to_cash" ? bankLedgers : bankLedgers).map((l) => (
                  <SelectItem key={l.id} value={String(l.id)} className="text-xs">{l.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">To Ledger</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Destination" /></SelectTrigger>
              <SelectContent>
                {(contraType === "cash_to_bank" ? bankLedgers : contraType === "bank_to_cash" ? cashLedgers : bankLedgers).map((l) => (
                  <SelectItem key={l.id} value={String(l.id)} className="text-xs">{l.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-[11px]">Amount</Label><Input className="h-8 text-xs font-medium tabular-nums text-right" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-[11px]">Narration</Label><Textarea className="text-xs min-h-[56px] resize-none" value={narration} onChange={(e) => setNarration(e.target.value)} /></div>
        </div>
      </div>
    </div>
  );
}
