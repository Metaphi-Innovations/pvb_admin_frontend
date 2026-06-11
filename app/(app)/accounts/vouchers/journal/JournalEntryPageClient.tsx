"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Save, Trash2, X } from "lucide-react";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { formatMoney, MONEY_INPUT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb, JOURNAL_VOUCHER_HREF } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "../../components/AccountsUI";
import { getActivePostingLedgers } from "@/lib/accounts/coa-hierarchy";
import { loadFinancialYears } from "../../masters/masters-data";
import {
  EMPTY_LINE,
  calcLineTotals,
  createVoucher,
  generateVoucherNumber,
  loadVouchers,
  validateVoucherDraft,
  validateVoucherForPost,
  type VoucherLine,
} from "../voucher-data";

export default function JournalEntryPageClient() {
  const router = useRouter();
  const ledgers = useMemo(() => getActivePostingLedgers(), []);
  const financialYears = useMemo(() => loadFinancialYears(), []);
  const activeFy = useMemo(() => financialYears.find((fy) => fy.status === "active"), [financialYears]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [financialYearId, setFinancialYearId] = useState<string>(
    activeFy ? String(activeFy.id) : "",
  );
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>([EMPTY_LINE(), EMPTY_LINE()]);
  const [error, setError] = useState<string | null>(null);

  const previewNumber = useMemo(() => generateVoucherNumber("journal", loadVouchers()), []);
  const { totalDebit, totalCredit } = calcLineTotals(lines);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  const selectedFy = financialYears.find((fy) => fy.id === Number(financialYearId));

  const updateLine = (idx: number, patch: Partial<VoucherLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const selectLedger = (idx: number, ledgerId: string) => {
    const ledger = ledgers.find((l) => l.id === Number(ledgerId));
    if (!ledger) return;
    updateLine(idx, { ledgerId: ledger.id, ledgerName: ledger.accountName });
  };

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, EMPTY_LINE()]);
  }, []);

  const removeLine = (idx: number) => {
    setLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const buildPayload = (status: "draft" | "posted") => ({
    date,
    financialYearId: financialYearId ? Number(financialYearId) : null,
    financialYearName: selectedFy?.name ?? "",
    referenceNo,
    narration,
    lines,
    status: status as "draft" | "posted",
  });

  const handleSaveDraft = () => {
    const err = validateVoucherDraft({ date });
    if (err) {
      setError(err);
      return;
    }
    createVoucher("journal", buildPayload("draft"));
    router.push(JOURNAL_VOUCHER_HREF);
  };

  const handlePost = () => {
    if (!financialYearId) {
      setError("Financial year is required.");
      return;
    }
    const err = validateVoucherForPost({ date, narration, lines });
    if (err) {
      setError(err);
      return;
    }
    createVoucher("journal", buildPayload("posted"));
    router.push(JOURNAL_VOUCHER_HREF);
  };

  const handleCancel = () => {
    router.push(JOURNAL_VOUCHER_HREF);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter" && balanced) {
        e.preventDefault();
        handlePost();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        addLine();
      }
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanced, date, narration, lines, financialYearId, referenceNo, addLine]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Vouchers", "New Journal")}
      title="New Journal Voucher"
      description="Enter debit and credit lines. Ctrl+Enter to post · Ctrl+Shift+A to add row · Esc to cancel."
      actions={
        <>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleCancel}>
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
            onClick={handlePost}
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

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-lg border border-border/50 bg-muted/5">
          <div className="space-y-1">
            <Label className="text-[11px]">Date</Label>
            <Input className="h-9 text-xs bg-white" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Voucher Number</Label>
            <Input className="h-9 text-xs font-mono bg-white" value={previewNumber} readOnly disabled />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Financial Year</Label>
            <Select value={financialYearId} onValueChange={setFinancialYearId}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="Select FY" />
              </SelectTrigger>
              <SelectContent>
                {financialYears.map((fy) => (
                  <SelectItem key={fy.id} value={String(fy.id)} className="text-xs">
                    {fy.name} {fy.status === "active" ? "(Active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Reference Number</Label>
            <Input className="h-9 text-xs bg-white" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <div className="h-9 flex items-center">
              <StatusBadge status="draft" />
              <span className="text-[10px] text-muted-foreground ml-2">Updates on post</span>
            </div>
          </div>
          <div className="space-y-1 col-span-2 lg:col-span-3">
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
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Entry Lines
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addLine} type="button">
              <Plus className="w-3 h-3" /> Add Row
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-muted/20 border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[42%]">Ledger Name</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-[14%]">Debit</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-[14%]">Credit</th>
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
                        step="0.01"
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
                        step="0.01"
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
                        aria-label="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/25 border-t-2 border-border/70">
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-right text-foreground">Running Total</td>
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
                      <span>
                        Difference: {formatMoney(Math.abs(totalDebit - totalCredit))}
                      </span>
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
