"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Plus, Save, Trash2 } from "lucide-react";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { formatMoney, MONEY_INPUT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActivePostingLedgers } from "@/lib/accounts/coa-hierarchy";
import {
  EMPTY_LINE,
  calcLineTotals,
  createVoucher,
  generateVoucherNumber,
  loadVouchers,
  validateVoucher,
  VOUCHER_TYPE_LABELS,
  type VoucherLine,
  type VoucherTypeCode,
} from "../voucher-data";

interface VoucherEntryClientProps {
  voucherType: VoucherTypeCode;
  onDone?: () => void;
}

export function VoucherEntryClient({ voucherType, onDone }: VoucherEntryClientProps) {
  const ledgers = useMemo(() => getActivePostingLedgers(), []);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>([EMPTY_LINE(), EMPTY_LINE()]);
  const [error, setError] = useState<string | null>(null);

  const label = VOUCHER_TYPE_LABELS[voucherType];
  const previewNumber = useMemo(
    () => generateVoucherNumber(voucherType, loadVouchers()),
    [voucherType],
  );
  const { totalDebit, totalCredit } = calcLineTotals(lines);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const updateLine = (idx: number, patch: Partial<VoucherLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const selectLedger = (idx: number, ledgerId: string) => {
    const ledger = ledgers.find((l) => l.id === Number(ledgerId));
    if (!ledger) return;
    updateLine(idx, { ledgerId: ledger.id, ledgerName: ledger.accountName });
  };

  const addLine = () => setLines((prev) => [...prev, EMPTY_LINE()]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));

  const handleSave = (asDraft: boolean) => {
    const payload = { date, referenceNo, narration, lines, status: asDraft ? "draft" as const : "posted" as const };
    const err = validateVoucher(payload);
    if (err) {
      setError(err);
      return;
    }
    createVoucher(voucherType, payload);
    onDone?.();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter" && balanced) {
        e.preventDefault();
        handleSave(false);
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        addLine();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanced, date, referenceNo, narration, lines]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Vouchers", `New ${label}`)}
      title={`New ${label}`}
      description="Enter debit and credit lines. Totals must balance before posting. Ctrl+Enter to post · Ctrl+Shift+A to add line."
      actions={
        <>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleSave(true)}>
            Save Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
            onClick={() => handleSave(false)}
            disabled={!balanced}
          >
            <Save className="w-3.5 h-3.5" /> Post Voucher
          </Button>
        </>
      }
      layout="split"
    >
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg border border-border/50 bg-muted/5">
          <div className="space-y-1">
            <Label className="text-[11px]">Date</Label>
            <Input className="h-9 text-xs" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Voucher No.</Label>
            <Input className="h-9 text-xs font-mono bg-white" value={previewNumber} disabled readOnly />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Reference No.</Label>
            <Input className="h-9 text-xs" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2 lg:col-span-4">
            <Label className="text-[11px]">Narration</Label>
            <Textarea
              className="text-xs min-h-[52px] resize-none bg-white"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Voucher narration…"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/60 bg-muted/10 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Entry Lines</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addLine} type="button">
              <Plus className="w-3 h-3" /> Add Line
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-muted/20 border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[40%]">Ledger</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-[15%]">Debit</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-[15%]">Credit</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Remarks</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="px-2 py-1">
                      <Select
                        value={line.ledgerId ? String(line.ledgerId) : ""}
                        onValueChange={(v) => selectLedger(idx, v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select ledger" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[240px]">
                          {ledgers.map((l) => (
                            <SelectItem key={l.id} value={String(l.id)} className="text-xs">
                              {l.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        className={cn("h-9 text-xs", MONEY_INPUT_CLASS)}
                        type="number"
                        min={0}
                        value={line.debit || ""}
                        onChange={(e) => updateLine(idx, { debit: Number(e.target.value) || 0, credit: 0 })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && idx === lines.length - 1) {
                            e.preventDefault();
                            addLine();
                          }
                        }}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        className={cn("h-9 text-xs", MONEY_INPUT_CLASS)}
                        type="number"
                        min={0}
                        value={line.credit || ""}
                        onChange={(e) => updateLine(idx, { credit: Number(e.target.value) || 0, debit: 0 })}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        className="h-9 text-xs"
                        value={line.remarks}
                        onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20 border-t-2 border-border/60 sticky bottom-0">
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-right text-foreground">Total</td>
                  <td className="px-3 py-2.5 text-right">
                    <MoneyAmount amount={totalDebit} className="font-semibold" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <MoneyAmount amount={totalCredit} className="font-semibold" />
                  </td>
                  <td colSpan={2} className="px-3 py-2.5 text-xs text-muted-foreground">
                    {balanced ? (
                      <span className="font-medium text-foreground">Balanced — ready to post</span>
                    ) : (
                      <span>Difference: {formatMoney(Math.abs(totalDebit - totalCredit))}</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AccountsPageShell>
  );
}
