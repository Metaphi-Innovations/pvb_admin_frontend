"use client";

import React, { useMemo } from "react";
import { Clock, FileText, Link2, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  enrichBookRows,
  enrichStatementRows,
  getAllocationsForGroup,
  getGroupById,
  loadAllBookTargetsForRecon,
  loadManualReconAudit,
} from "@/lib/accounts/bank-recon-manual-recon-service";
import { loadBankReconTransactions } from "@/lib/accounts/bank-recon-register";
import type {
  ManualReconAllocationRecord,
  ManualReconAuditEntry,
  ManualReconciliationStatus,
} from "@/lib/accounts/bank-recon-manual-recon-types";
import { BankReconReconciliationStatusBadge } from "./BankReconBadges";

function ReconStatusPill({ status }: { status: ManualReconciliationStatus | string }) {
  return <BankReconReconciliationStatusBadge status={status} />;
}

interface BankReconManualReconDetailsSheetProps {
  groupId: string | null;
  bankAccountId: string;
  open: boolean;
  onClose: () => void;
  onUndo?: (groupId: string) => void;
}

export function BankReconManualReconDetailsSheet({
  groupId,
  bankAccountId,
  open,
  onClose,
  onUndo,
}: BankReconManualReconDetailsSheetProps) {
  const group = groupId ? getGroupById(groupId) : null;
  const allocs = groupId ? getAllocationsForGroup(groupId) : [];
  const books = useMemo(
    () => enrichBookRows(bankAccountId, loadAllBookTargetsForRecon(bankAccountId)),
    [bankAccountId, groupId],
  );
  const stmts = useMemo(() => {
    const records = loadBankReconTransactions(bankAccountId);
    return enrichStatementRows(bankAccountId, records, loadAllBookTargetsForRecon(bankAccountId));
  }, [bankAccountId, groupId]);

  const audit = useMemo(
    () =>
      loadManualReconAudit(bankAccountId)
        .filter((a: ManualReconAuditEntry) => a.groupId === groupId)
        .slice(0, 12),
    [bankAccountId, groupId],
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[480px]">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle>Reconciliation Details</SheetTitle>
              <SheetDescription>{group?.id ?? "—"}</SheetDescription>
            </div>
            {group ? <ReconStatusPill status={group.active ? "Reconciled" : "Unreconciled"} /> : null}
          </div>
        </SheetHeader>
        <SheetBody className="space-y-4 text-xs">
          {group ? (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-3">
                <div><p className="text-muted-foreground">Match Type</p><p className="font-semibold">{group.matchType}</p></div>
                <div><p className="text-muted-foreground">Method</p><p className="font-semibold">{group.reconciliationMethod}</p></div>
                <div><p className="text-muted-foreground">Reconciliation Date</p><p className="font-semibold">{group.reconciliationDate}</p></div>
                <div><p className="text-muted-foreground">Total Amount</p><p className="font-semibold">{formatMoney(group.totalBookAmount)}</p></div>
                <div><p className="text-muted-foreground">Created By</p><p className="font-semibold">{group.createdBy}</p></div>
                <div><p className="text-muted-foreground">Created On</p><p className="font-semibold">{new Date(group.createdOn).toLocaleString("en-IN")}</p></div>
              </div>

              {group.remarks ? (
                <div className="rounded-lg border border-border px-3 py-2 bg-muted/10">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Remarks</p>
                  <p>{group.remarks}</p>
                </div>
              ) : null}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border mb-2">Allocations</p>
                <div className="space-y-2">
                  {allocs.map((a: ManualReconAllocationRecord) => {
                    const book = books.find((b) => b.id === a.bookTargetId);
                    const stmt = a.statementTransactionId ? stmts.find((s) => s.id === a.statementTransactionId) : null;
                    return (
                      <div key={a.id} className="rounded-lg border border-border px-3 py-2">
                        <p className="font-semibold">{book?.voucherNo ?? a.bookTargetId}</p>
                        {stmt ? <p className="text-[11px] text-muted-foreground">↔ {stmt.reference || stmt.id}</p> : <p className="text-[11px] text-teal-700">Manual clearing (no statement)</p>}
                        <p className="text-[11px] mt-1">Applied: <span className="font-semibold">{formatMoney(a.allocatedAmount)}</span> · Date: {a.reconciliationDate}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border mb-2">Activity</p>
                <div className="space-y-2">
                  {audit.length === 0 ? (
                    <p className="text-muted-foreground">No audit entries.</p>
                  ) : (
                    audit.map((e: ManualReconAuditEntry) => (
                      <div key={e.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">{e.action}</p>
                          <p className="text-[11px] text-muted-foreground">{e.bookReference} {e.statementReference ? `· ${e.statementReference}` : ""}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(e.timestamp).toLocaleString("en-IN")} · {e.user}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {group.active && onUndo ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => onUndo(group.id)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo Reconciliation
                </Button>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <FileText className="w-8 h-8" />
              <p>Select a reconciled entry to view details.</p>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
