"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  buildLedgerAccountingSummary,
  type CoaTransactionRow,
} from "@/lib/accounts/coa-accounting-view";
import { CoaAccountingTransactionsTable } from "./CoaAccountingTransactionsTable";
import {
  LedgerTransactionDateFilter,
  useLedgerTransactionDateFilter,
} from "@/components/accounts/LedgerTransactionDateFilter";
import {
  parentGroupLabel,
  primaryHeadForLedger,
  resolveLedgerType,
} from "@/lib/accounts/ledger-detail-utils";
import {
  exportLedgerStatementToExcel,
  exportLedgerStatementToPdf,
} from "@/lib/accounts/ledger-statement-export";

function filterTransactions(rows: CoaTransactionRow[], query: string): CoaTransactionRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => {
    if (r.isOpeningRow) return false;
    return (
      r.voucherNo.toLowerCase().includes(q) ||
      r.narration.toLowerCase().includes(q) ||
      r.referenceNo.toLowerCase().includes(q)
    );
  });
}

export function CoaLedgerDetailPanel({
  ledger,
  records,
  onEditLedger,
  onDeleteLedger,
}: {
  ledger: ChartOfAccount;
  records: ChartOfAccount[];
  onEditLedger?: () => void;
  onDeleteLedger?: () => void;
}) {
  const { applied, draft, setPreset, setDraftFrom, setDraftTo, apply } =
    useLedgerTransactionDateFilter({ autoApply: true });
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const ledgerType = useMemo(() => resolveLedgerType(ledger, records), [ledger, records]);
  const parentGroup = useMemo(() => parentGroupLabel(records, ledger), [ledger, records]);

  const summary = useMemo(
    () => buildLedgerAccountingSummary(ledger, records, applied.from, applied.to),
    [ledger, records, applied.from, applied.to],
  );

  const filteredRows = useMemo(
    () => filterTransactions(summary.transactions, search),
    [summary.transactions, search],
  );

  const tableFooter = useMemo(
    () => ({
      totalDebit: summary.totalDebit,
      totalCredit: summary.totalCredit,
      closingBalance: summary.currentBalance,
      closingBalanceType: summary.balanceType,
    }),
    [summary],
  );

  const exportMeta = useMemo(
    () => ({
      ledgerName: ledger.accountName,
      ledgerCode: ledger.accountCode,
      ledgerType,
      parentGroup,
      primaryHead: primaryHeadForLedger(records, ledger),
      dateFrom: applied.from,
      dateTo: applied.to,
      totalDebit: summary.totalDebit,
      totalCredit: summary.totalCredit,
      closingBalance: summary.currentBalance,
      closingBalanceType: summary.balanceType,
    }),
    [ledger, records, ledgerType, parentGroup, applied.from, applied.to, summary],
  );

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      await exportLedgerStatementToExcel(summary.transactions, exportMeta);
    } finally {
      setExporting(false);
    }
  }, [summary.transactions, exportMeta]);

  const handleExportPdf = useCallback(() => {
    exportLedgerStatementToPdf(summary.transactions, exportMeta);
  }, [summary.transactions, exportMeta]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 space-y-3 bg-background">
      <div className="flex-shrink-0 bg-card border border-border rounded-xl shadow-sm px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{ledger.accountName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ledgerType} • {parentGroup}
            </p>
          </div>
          {(onEditLedger || onDeleteLedger) && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {onEditLedger && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onEditLedger}
                  aria-label="Edit ledger"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {onDeleteLedger && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={onDeleteLedger}
                  aria-label="Delete ledger"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 bg-card border border-border rounded-xl shadow-sm px-4 py-2.5">
        <LedgerTransactionDateFilter
          preset={draft.preset}
          dateFrom={draft.from}
          dateTo={draft.to}
          onPresetChange={setPreset}
          onDateFromChange={setDraftFrom}
          onDateToChange={setDraftTo}
          onApply={apply}
          autoApplyPresets
          search={search}
          onSearchChange={setSearch}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
          exporting={exporting}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0 master-listing-table-shell">
        <CoaAccountingTransactionsTable
          rows={filteredRows}
          variant="ledger-detail"
          footer={tableFooter}
          emptyLabel="No vouchers posted to this ledger in the selected period. Adjust the date range or post sales invoices, purchase bills, or vouchers to see entries here."
        />
      </div>
    </div>
  );
}
