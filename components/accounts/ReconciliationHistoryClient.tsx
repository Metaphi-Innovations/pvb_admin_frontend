"use client";

import React, { useState, useMemo } from "react";
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
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
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
    <AccountsTableListing
      toolbar={
        <AccountsListingToolbar
          actions={<AccountsExportMenu onExcel={exportToExcel} onCsv={exportToExcel} disabled={history.length === 0} />}
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
        history.length > 0 ? (
          <AccountsListingCountFooter>
            Showing <span className="font-medium text-foreground">{history.length}</span> record(s)
          </AccountsListingCountFooter>
        ) : undefined
      }
    >
      <AccountsTable minWidth={1100}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Bank Account</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase className="accounts-col-wide">Narration</AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" uppercase>Amount</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Category</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Ledger</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Journal Entry</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Categorized By</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Reconciled By</AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {history.length === 0 ? (
            <AccountsTableEmpty colSpan={9} message="No reconciliation history. Categorized transactions will appear here." />
          ) : (
            history.map((entry) => (
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
    </AccountsTableListing>
  );
}
