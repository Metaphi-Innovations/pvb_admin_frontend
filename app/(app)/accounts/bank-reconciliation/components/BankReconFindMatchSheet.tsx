"use client";

import React, { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { acceptMatch, findAlternativeMatches } from "@/lib/accounts/bank-recon-match-service";
import { getBankReconTransactionById } from "@/lib/accounts/bank-recon-register";

interface BankReconFindMatchSheetProps {
  bankAccountId: string;
  statementTransactionId: string | null;
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

export function BankReconFindMatchSheet({
  bankAccountId,
  statementTransactionId,
  open,
  onClose,
  onAccepted,
}: BankReconFindMatchSheetProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stmt = statementTransactionId ? getBankReconTransactionById(statementTransactionId) : null;

  const candidates = useMemo(() => {
    if (!statementTransactionId || !open) return [];
    return findAlternativeMatches({
      bankAccountId,
      statementTransactionId,
      search,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  }, [bankAccountId, statementTransactionId, open, search, dateFrom, dateTo]);

  const selected = candidates.find((c) => c.id === selectedId);

  const handleAccept = () => {
    if (!selected || !statementTransactionId) return;
    const result = acceptMatch({
      bankAccountId,
      statementTransactionId,
      candidate: selected,
      matchMethod: "Manual Selected",
    });
    if (result.ok) onAccepted();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[800px] w-full">
        <SheetHeader>
          <SheetTitle>Find Another Match</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-3">
          {stmt ? (
            <div className="rounded-lg border border-border px-3 py-2 bg-muted/20 text-xs">
              <span className="font-semibold">{stmt.reference || stmt.chequeNo || "Statement line"}</span>
              {" · "}
              {formatMoney(stmt.deposit || stmt.withdrawal)}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-1 space-y-1">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 text-sm pl-8" placeholder="Voucher, party, ref…" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden max-h-[420px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">Book Date</th>
                  <th className="px-2 py-2 text-left font-semibold">Voucher</th>
                  <th className="px-2 py-2 text-left font-semibold">Party</th>
                  <th className="px-2 py-2 text-left font-semibold">Reference</th>
                  <th className="px-2 py-2 text-right font-semibold">Deposit</th>
                  <th className="px-2 py-2 text-right font-semibold">Withdrawal</th>
                  <th className="px-2 py-2 text-right font-semibold">Score</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      No eligible book transactions found.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "border-b border-border/60 cursor-pointer hover:bg-muted/20",
                        selectedId === c.id && "bg-brand-50/60",
                      )}
                    >
                      <td className="px-2 py-2">{c.bookTarget.bookDate}</td>
                      <td className="px-2 py-2 font-mono text-brand-700">{c.bookTarget.voucherNo}</td>
                      <td className="px-2 py-2">{c.bookTarget.partyLedger}</td>
                      <td className="px-2 py-2">{c.bookTarget.reference || c.bookTarget.chequeNo || "—"}</td>
                      <td className="px-2 py-2 text-right">{formatMoneyOrDash(c.bookTarget.deposit)}</td>
                      <td className="px-2 py-2 text-right">{formatMoneyOrDash(c.bookTarget.withdrawal)}</td>
                      <td className="px-2 py-2 text-right font-semibold">{c.confidence}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!selected}
            onClick={handleAccept}
          >
            <Check className="w-3.5 h-3.5" />
            Accept Selected Match
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
