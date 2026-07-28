"use client";

import React, { useState, useMemo, useCallback } from "react";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsListingCountFooter,
  AccountsListingToolbar,
} from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getReconciliationHistory,
  TRANSACTION_CATEGORIES,
  type ReconciliationHistoryEntry,
} from "@/lib/accounts/bank-transaction-categorization";
import { listBankAccountSelectOptions } from "@/lib/accounts/bank-accounts-data";

function CategoryBadge({ category }: { category: string }) {
  const cat = TRANSACTION_CATEGORIES.find((c) => c.value === category);
  const label = cat?.label || category;
  const isReceipt = cat?.type === "receipt";

  return (
    <Badge
      className={cn(
        "text-xs px-2 py-0.5",
        isReceipt ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
      )}
    >
      {label}
    </Badge>
  );
}

function ReconciliationHistoryTable({ toolbarRows }: { toolbarRows: ReconciliationHistoryEntry[] }) {
  const visible = useAccountsFilteredRows<ReconciliationHistoryEntry>(toolbarRows);

  return (
    <AccountsTable minWidth={1100}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date" colKey="date" filterType="date" />
          <SortTh label="Bank Account" colKey="bankAccountName" />
          <SortTh label="Narration" colKey="narration" className="accounts-col-wide" />
          <SortTh label="Amount" colKey="amount" filterType="amount" align="right" />
          <SortTh label="Category" colKey="category" />
          <SortTh label="Ledger" colKey="ledger" />
          <SortTh label="Journal Entry" colKey="journalEntryNumber" />
          <SortTh label="Categorized By" colKey="categorizedBy" />
          <SortTh label="Reconciled By" colKey="reconciledBy" />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {toolbarRows.length === 0 ? (
          <AccountsTableEmpty colSpan={9} message="No reconciliation history. Categorized transactions will appear here." />
        ) : visible.length === 0 ? (
          <AccountsTableEmpty colSpan={9} message="No records match the column filters." />
        ) : (
          visible.map((entry) => (
            <AccountsTableRow key={entry.transactionId}>
              <AccountsTableCell>{entry.transactionDate}</AccountsTableCell>
              <AccountsTableCell className="font-medium">{entry.bankAccountName}</AccountsTableCell>
              <AccountsTableCell wrap>
                <span className="line-clamp-1">{entry.narration}</span>
              </AccountsTableCell>
              <AccountsTableCell align="right" money>{formatMoney(entry.amount)}</AccountsTableCell>
              <AccountsTableCell>
                <CategoryBadge category={entry.category} />
              </AccountsTableCell>
              <AccountsTableCell>{entry.ledgerName}</AccountsTableCell>
              <AccountsTableCell mono>{entry.journalEntryNumber}</AccountsTableCell>
              <AccountsTableCell wrap>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span>{entry.categorizedBy}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.categorizedAt).toLocaleString()}
                </span>
              </AccountsTableCell>
              <AccountsTableCell wrap>
                {entry.reconciledBy ? (
                  <>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <span>{entry.reconciledBy}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.reconciledAt).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export function ReconciliationHistoryClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [bankAccountId, setBankAccountId] = useState<number | undefined>();

  const bankAccounts = useMemo(() => listBankAccountSelectOptions(), []);

  const history = useMemo(() => {
    return getReconciliationHistory({
      bankAccountId,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    });
  }, [bankAccountId, dateFrom, dateTo]);

  const toolbarRows = history;

  const getCellValue = useCallback((row: ReconciliationHistoryEntry, key: string) => {
    switch (key) {
      case "date":
        return row.transactionDate;
      case "ledger":
        return row.ledgerName;
      case "category": {
        const cat = TRANSACTION_CATEGORIES.find((c) => c.value === row.category);
        return cat?.label ?? row.category;
      }
      default:
        return (row as unknown as Record<string, unknown>)[key];
    }
  }, []);

  const exportToExcel = () => {
    // Simple CSV export
    const headers = [
      "Date",
      "Bank Account",
      "Narration",
      "Amount",
      "Category",
      "Ledger",
      "Journal Entry",
      "Categorized By",
      "Categorized At",
      "Reconciled By",
      "Reconciled At",
    ];
    
    const rows = history.map((h) => [
      h.transactionDate,
      h.bankAccountName,
      h.narration,
      h.amount,
      TRANSACTION_CATEGORIES.find((c) => c.value === h.category)?.label || h.category,
      h.ledgerName,
      h.journalEntryNumber,
      h.categorizedBy,
      h.categorizedAt,
      h.reconciledBy,
      h.reconciledAt,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccountsColumnFilterProvider
      rows={toolbarRows}
      getCellValue={getCellValue}
      columnConfig={{
        date: { type: "date" },
        bankAccountName: { type: "text" },
        narration: { type: "text" },
        amount: { type: "amount" },
        category: { type: "text" },
        ledger: { type: "text" },
        journalEntryNumber: { type: "text" },
        categorizedBy: { type: "text" },
        reconciledBy: { type: "text" },
      }}
      defaultSortKey="date"
      defaultSortDir="desc"
    >
      <ReconciliationHistoryListing
        toolbarRows={toolbarRows}
        bankAccountId={bankAccountId}
        setBankAccountId={setBankAccountId}
        bankAccounts={bankAccounts}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        exportToExcel={exportToExcel}
      />
    </AccountsColumnFilterProvider>
  );
}

function ReconciliationHistoryListing({
  toolbarRows,
  bankAccountId,
  setBankAccountId,
  bankAccounts,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  exportToExcel,
}: {
  toolbarRows: ReconciliationHistoryEntry[];
  bankAccountId: number | undefined;
  setBankAccountId: (id: number | undefined) => void;
  bankAccounts: ReturnType<typeof listBankAccountSelectOptions>;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  exportToExcel: () => void;
}) {
  const visible = useAccountsFilteredRows<ReconciliationHistoryEntry>(toolbarRows);

  return (
    <AccountsTableListing
      toolbar={
        <AccountsListingToolbar
          actions={<AccountsExportMenu onExcel={exportToExcel} onCsv={exportToExcel} disabled={toolbarRows.length === 0} />}
        >
          <div className="space-y-1 min-w-[140px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Bank Account</Label>
            <Select
              value={bankAccountId?.toString() || "all"}
              onValueChange={(v) => setBankAccountId(v === "all" ? undefined : parseInt(v))}
            >
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[140px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Accounts</SelectItem>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id.toString()} className="text-xs">
                    {acc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </AccountsListingToolbar>
      }
      footer={
        visible.length > 0 ? (
          <AccountsListingCountFooter>
            Showing <span className="font-medium text-foreground">{visible.length}</span> record(s)
          </AccountsListingCountFooter>
        ) : undefined
      }
    >
      <ReconciliationHistoryTable toolbarRows={toolbarRows} />
    </AccountsTableListing>
  );
}
