"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { getBankReconAccountById } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import {
  BANK_RECON_IMPORT_HISTORY_PATH,
  bankReconUploadPath,
  bankReconWorkspacePath,
  RECONCILIATION_LIST_PATH,
} from "@/app/(app)/accounts/bank-reconciliation/reconciliation-utils";
import { loadImportBatches, loadBankReconTransactions } from "@/lib/accounts/bank-recon-register";
import {
  canRollbackImport,
  rollbackImport,
} from "@/lib/accounts/bank-recon-tally-service";
import { loadTallyLinks } from "@/lib/accounts/bank-recon-tally-store";
import { TALLY_EVENT } from "@/lib/accounts/bank-recon-tally-types";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700",
  "Completed with Errors": "bg-amber-50 text-amber-700",
  Failed: "bg-red-50 text-red-700",
  Processing: "bg-sky-50 text-sky-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

export default function BankReconImportHistoryPageClient() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(TALLY_EVENT, handler);
    window.addEventListener("bank-recon-register-updated", handler);
    return () => {
      window.removeEventListener(TALLY_EVENT, handler);
      window.removeEventListener("bank-recon-register-updated", handler);
    };
  }, []);

  const batches = useMemo(() => {
    void tick;
    return loadImportBatches();
  }, [tick]);

  const reconciledByBatch = useMemo(() => {
    void tick;
    const map = new Map<string, number>();
    for (const link of loadTallyLinks()) {
      if (
        link.importBatchId &&
        (link.status === "RECONCILED" || link.status === "MARKED_FOR_REVIEW")
      ) {
        map.set(link.importBatchId, (map.get(link.importBatchId) ?? 0) + 1);
      }
    }
    return map;
  }, [tick]);

  const handleRollback = useCallback((batchId: string) => {
    const gate = canRollbackImport(batchId);
    if (!gate.ok) {
      window.alert(gate.reason ?? "Rollback not allowed.");
      return;
    }
    if (!window.confirm("Rollback this import? Imported statement rows will be removed.")) return;
    const res = rollbackImport(batchId);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    setTick((t) => t + 1);
  }, []);

  const handleDownloadErrors = useCallback((batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch?.errorReportJson) {
      window.alert("No error file available for this import.");
      return;
    }
    const blob = new Blob([batch.errorReportJson], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batch.batchNumber}-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [batches]);

  return (
    <AccountsPageShell
      breadcrumbs={[
        { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
        { label: "Banking" },
        { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
        { label: "Import History" },
      ]}
      title="Statement Import History"
      description="Audit log of bank statement uploads and import batches"
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button asChild size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
          <Link href={bankReconUploadPath()}>
            <Upload className="w-3.5 h-3.5" /> Upload Statement
          </Link>
        </Button>
      }
    >
      <div className="accounts-listing-table-card overflow-hidden flex flex-col flex-1 min-h-0">
        <AccountsTableScroll>
          <AccountsTable minWidth={1200}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                {[
                  "Import Date",
                  "Bank Account",
                  "Statement Period",
                  "File Name",
                  "Total Rows",
                  "Imported Rows",
                  "Duplicate Rows",
                  "Failed Rows",
                  "Reconciled Rows",
                  "Imported By",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <AccountsTableHeadCell key={h} sticky={h === "Actions"}>
                    {h}
                  </AccountsTableHeadCell>
                ))}
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {batches.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={12} className="text-center py-10 text-muted-foreground text-xs">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No import batches yet. Upload a bank statement to get started.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                batches.map((b) => {
                  const acct = getBankReconAccountById(b.bankAccountId);
                  const reconciledRows = reconciledByBatch.get(b.id) ?? 0;
                  const importedTxnCount = loadBankReconTransactions(b.bankAccountId).filter(
                    (t) => t.importBatchId === b.id,
                  ).length;
                  return (
                    <AccountsTableRow key={b.id} className="group">
                      <AccountsTableCell>
                        {b.importedOn.slice(0, 16).replace("T", " ")}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        {acct?.accountNickname ?? b.bankAccountId}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        {b.statementPeriodFrom} — {b.statementPeriodTo}
                      </AccountsTableCell>
                      <AccountsTableCell wrap>{b.fileName}</AccountsTableCell>
                      <AccountsTableCell>{b.totalRows}</AccountsTableCell>
                      <AccountsTableCell>{b.importedRows}</AccountsTableCell>
                      <AccountsTableCell>{b.duplicateRows}</AccountsTableCell>
                      <AccountsTableCell>{b.invalidRows}</AccountsTableCell>
                      <AccountsTableCell>{reconciledRows}</AccountsTableCell>
                      <AccountsTableCell>{b.importedBy}</AccountsTableCell>
                      <AccountsTableCell>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            STATUS_CLASS[b.status] ?? "bg-slate-100",
                          )}
                        >
                          {b.status}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell className="accounts-table-td-sticky">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={bankReconWorkspacePath(b.bankAccountId)}>
                                View Import / Transactions
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={bankReconWorkspacePath(b.bankAccountId)}>
                                View Imported Transactions ({importedTxnCount})
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadErrors(b.id)}>
                              Download Error File
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={b.status === "Cancelled"}
                              onClick={() => handleRollback(b.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              Rollback Import
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  );
                })
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
      </div>
    </AccountsPageShell>
  );
}
