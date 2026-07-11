"use client";

import React, { useMemo } from "react";
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
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
import { getBankReconAccountById } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import {
  BANK_RECON_IMPORT_HISTORY_PATH,
  bankReconUploadPath,
  bankReconWorkspacePath,
  RECONCILIATION_LIST_PATH,
} from "@/app/(app)/accounts/bank-reconciliation/reconciliation-utils";
import { loadImportBatches } from "@/lib/accounts/bank-recon-register";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700",
  "Completed with Errors": "bg-amber-50 text-amber-700",
  Failed: "bg-red-50 text-red-700",
  Processing: "bg-sky-50 text-sky-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

export default function BankReconImportHistoryPageClient() {
  const batches = useMemo(() => loadImportBatches(), []);

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
          <AccountsTable minWidth={1000}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                {["Batch No.", "Bank Account", "File Name", "Statement Period", "Imported", "Duplicates", "Invalid", "Imported By", "Imported On", "Status", "Action"].map((h) => (
                  <AccountsTableHeadCell key={h} sticky={h === "Action"}>{h}</AccountsTableHeadCell>
                ))}
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {batches.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={11} className="text-center py-10 text-muted-foreground text-xs">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No import batches yet. Upload a bank statement to get started.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                batches.map((b) => {
                  const acct = getBankReconAccountById(b.bankAccountId);
                  return (
                    <AccountsTableRow key={b.id}>
                      <AccountsTableCell mono>{b.batchNumber}</AccountsTableCell>
                      <AccountsTableCell>{acct?.accountNickname ?? b.bankAccountId}</AccountsTableCell>
                      <AccountsTableCell wrap>{b.fileName}</AccountsTableCell>
                      <AccountsTableCell>{b.statementPeriodFrom} — {b.statementPeriodTo}</AccountsTableCell>
                      <AccountsTableCell>{b.importedRows}</AccountsTableCell>
                      <AccountsTableCell>{b.duplicateRows}</AccountsTableCell>
                      <AccountsTableCell>{b.invalidRows}</AccountsTableCell>
                      <AccountsTableCell>{b.importedBy}</AccountsTableCell>
                      <AccountsTableCell>{b.importedOn.slice(0, 16).replace("T", " ")}</AccountsTableCell>
                      <AccountsTableCell>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", STATUS_CLASS[b.status] ?? "bg-slate-100")}>{b.status}</span>
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                          <Link href={bankReconWorkspacePath(b.bankAccountId)}>View Transactions</Link>
                        </Button>
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
