"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney } from "@/lib/accounts/money-format";
import type {
  ManualReconAllocationInput,
  ManualReconBookRow,
  ManualReconStatementRow,
} from "@/lib/accounts/bank-recon-manual-recon-types";
import { buildDefaultAllocations } from "@/lib/accounts/bank-recon-manual-recon-service";

interface BankReconManualReconAllocationDialogProps {
  open: boolean;
  onClose: () => void;
  books: ManualReconBookRow[];
  statements: ManualReconStatementRow[];
  selectedBookIds: Set<string>;
  selectedStmtIds: Set<string>;
  matchType: string | null;
  onConfirm: (allocations: ManualReconAllocationInput[], groupRemark: string) => void;
}

export function BankReconManualReconAllocationDialog({
  open,
  onClose,
  books,
  statements,
  selectedBookIds,
  selectedStmtIds,
  matchType,
  onConfirm,
}: BankReconManualReconAllocationDialogProps) {
  const [allocations, setAllocations] = useState<ManualReconAllocationInput[]>([]);
  const [groupRemark, setGroupRemark] = useState("");
  const [commonDate, setCommonDate] = useState("");

  useEffect(() => {
    if (!open) return;
    const defaults = buildDefaultAllocations(books, statements, selectedBookIds, selectedStmtIds);
    setAllocations(defaults);
    if (defaults[0]?.reconciliationDate) setCommonDate(defaults[0].reconciliationDate);
  }, [open, books, statements, selectedBookIds, selectedStmtIds]);

  const totalBook = useMemo(
    () => allocations.reduce((s, a) => s + a.appliedAmount, 0),
    [allocations],
  );
  const totalStmt = useMemo(
    () => allocations.filter((a) => a.statementTransactionId).reduce((s, a) => s + a.appliedAmount, 0),
    [allocations],
  );

  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const stmtMap = useMemo(() => new Map(statements.map((s) => [s.id, s])), [statements]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Reconciliation Allocation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-muted/40 border border-border">Match: {matchType ?? "—"}</span>
            <span className="px-2 py-0.5 rounded-md bg-muted/40 border border-border">Book: {formatMoney(totalBook)}</span>
            {selectedStmtIds.size > 0 ? (
              <span className="px-2 py-0.5 rounded-md bg-muted/40 border border-border">Statement: {formatMoney(totalStmt)}</span>
            ) : null}
            {selectedStmtIds.size > 0 && Math.abs(totalBook - totalStmt) > 0.009 ? (
              <span className="text-red-600 font-semibold">Difference: {formatMoney(Math.abs(totalBook - totalStmt))}</span>
            ) : (
              <span className="text-emerald-700 font-semibold">Balanced</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Common Reconciliation Date</Label>
              <Input type="date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">Book / Statement</th>
                  <th className="px-2 py-2 text-right font-semibold">Available</th>
                  <th className="px-2 py-2 text-right font-semibold">Applied</th>
                  <th className="px-2 py-2 text-left font-semibold">Recon Date</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a, i) => {
                  const book = bookMap.get(a.bookTargetId);
                  const stmt = a.statementTransactionId ? stmtMap.get(a.statementTransactionId) : null;
                  return (
                    <tr key={i} className="border-b border-border/60">
                      <td className="px-2 py-2">
                        <p className="font-medium">{book?.voucherNo}</p>
                        {stmt ? <p className="text-[10px] text-muted-foreground">↔ {stmt.reference || stmt.id}</p> : null}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatMoney(book?.availableAmount ?? 0)}
                        {stmt ? ` / ${formatMoney(stmt.availableAmount)}` : ""}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <AccountsMoneyInput
                          className="h-8 w-24 text-xs text-right ml-auto"
                          value={String(a.appliedAmount)}
                          onChange={(v) => {
                            setAllocations((prev) =>
                              prev.map((row, idx) =>
                                idx === i ? { ...row, appliedAmount: Number(v) || 0 } : row,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="date"
                          value={a.reconciliationDate}
                          onChange={(e) => {
                            setAllocations((prev) =>
                              prev.map((row, idx) =>
                                idx === i ? { ...row, reconciliationDate: e.target.value } : row,
                              ),
                            );
                          }}
                          className="h-8 text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {matchType === "Many-to-Many" ? (
            <div className="space-y-1">
              <Label className="text-xs">Grouping Remark *</Label>
              <Textarea rows={2} value={groupRemark} onChange={(e) => setGroupRemark(e.target.value)} className="text-sm" placeholder="Mandatory for many-to-many grouping…" />
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Textarea rows={2} value={groupRemark} onChange={(e) => setGroupRemark(e.target.value)} className="text-sm" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => onConfirm(allocations, groupRemark)}
            >
              <Check className="w-3.5 h-3.5" />
              Save Reconciliation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
