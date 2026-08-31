"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
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
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import "./bank-reconciliation-listing.css";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsListingToolbar,
  ACCOUNTS_DEFAULT_PAGE_SIZE,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportSearchFilter,
  ReportFilterResetButton,
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/components/accounts/ReportFilters";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { formatMoney } from "@/lib/accounts/money-format";
import { useFY } from "@/lib/fy-store";
import { useClientMounted } from "@/lib/use-client-mounted";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/components/ui/Loaders";
import { bankReconWorkspacePath, RECONCILIATION_LIST_PATH } from "./reconciliation-utils";
import { BankReconciliationService } from "@/services/bank-reconciliation.service";
import {
  mapDashboardItemToListingRow,
  type BankReconListingRowUi,
} from "@/lib/accounts/bank-recon-api-mappers";

const ACCOUNT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Current", label: "Current" },
  { value: "Savings", label: "Savings" },
  { value: "Cash Credit", label: "Cash Credit" },
  { value: "Overdraft", label: "Overdraft" },
];

const BANK_RECON_LISTING_COL_COUNT = 10;
const BANK_RECON_LISTING_MIN_WIDTH = 1360;

/** Explicit <col> widths — Action stays compact; data cols keep readable floors. */
function BankReconListingColGroup() {
  return (
    <colgroup>
      <col className="bank-recon-col-bank" />
      <col className="bank-recon-col-nickname" />
      <col className="bank-recon-col-acct-no" />
      <col className="bank-recon-col-type" />
      <col className="bank-recon-col-book-bal" />
      <col className="bank-recon-col-stmt-bal" />
      <col className="bank-recon-col-diff" />
      <col className="bank-recon-col-pending" />
      <col className="bank-recon-col-last-recon" />
      <col className="bank-recon-listing-action-col-width" />
    </colgroup>
  );
}

function BankAccountTable({
  rows,
  loading,
  error,
  onRetry,
}: {
  rows: BankReconListingRowUi[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const filtered = useAccountsFilteredRows(rows);

  if (loading) {
    return (
      <AccountsTable minWidth={BANK_RECON_LISTING_MIN_WIDTH}>
        <BankReconListingColGroup />
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {Array.from({ length: BANK_RECON_LISTING_COL_COUNT }).map((_, i) => (
              <AccountsTableHeadCell key={i} sticky={false}>
                &nbsp;
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} cols={BANK_RECON_LISTING_COL_COUNT} />
          ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <p className="text-sm font-medium text-foreground">Unable to load bank accounts</p>
        <p className="text-xs text-muted-foreground max-w-md">{error}</p>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AccountsTable minWidth={BANK_RECON_LISTING_MIN_WIDTH}>
      <BankReconListingColGroup />
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Bank Name" colKey="bankName" />
          <SortTh label="Account Nickname" colKey="accountNickname" />
          <SortTh label="Account Number" colKey="maskedAccountNumber" />
          <SortTh label="Account Type" colKey="accountType" />
          <SortTh label="Balance as per Books" colKey="bookBalance" filterType="amount" align="right" />
          <SortTh
            label="Bank Statement Balance"
            colKey="statementBalanceDisplay"
            filterType="amount"
            align="right"
          />
          <SortTh label="Difference" colKey="differenceDisplay" filterType="amount" align="right" />
          <SortTh
            label="Pending Count"
            colKey="pendingReconciliationCount"
            filterType="amount"
            align="right"
          />
          <SortTh label="Last Reconciled Date" colKey="lastReconciledDate" filterType="date" />
          <AccountsTableHeadCell className="bank-recon-listing-action-col" align="center" sticky>
            Action
          </AccountsTableHeadCell>
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.length === 0 ? (
          <AccountsTableEmpty
            colSpan={BANK_RECON_LISTING_COL_COUNT}
            message="No bank accounts configured for reconciliation."
          />
        ) : filtered.length === 0 ? (
          <AccountsTableEmpty
            colSpan={BANK_RECON_LISTING_COL_COUNT}
            message="No accounts match the current filters."
          />
        ) : (
          filtered.map((account) => (
            <AccountsTableRow key={account.id} className="group">
              <AccountsTableCell className="font-medium">{account.bankName}</AccountsTableCell>
              <AccountsTableCell>{account.accountNickname}</AccountsTableCell>
              <AccountsTableCell mono>{account.maskedAccountNumber}</AccountsTableCell>
              <AccountsTableCell>{account.accountType}</AccountsTableCell>
              <AccountsTableCell align="right" money>
                {account.bookLedgerLinked && account.bookBalance != null ? (
                  formatMoney(account.bookBalance)
                ) : (
                  <span className="text-[11px] text-amber-700 font-medium whitespace-nowrap">
                    Book ledger not linked
                  </span>
                )}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {account.statementBalanceDisplay != null ? (
                  formatMoney(account.statementBalanceDisplay)
                ) : (
                  <span className="text-muted-foreground" title="Not Available">
                    —
                  </span>
                )}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {account.differenceDisplay == null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={account.differenceDisplay !== 0 ? "text-red-700" : undefined}>
                    {formatMoney(Math.abs(account.differenceDisplay))}
                    {account.differenceDisplay !== 0
                      ? account.differenceDisplay > 0
                        ? " Dr"
                        : " Cr"
                      : ""}
                  </span>
                )}
              </AccountsTableCell>
              <AccountsTableCell align="right">
                {account.pendingReconciliationCount}
              </AccountsTableCell>
              <AccountsTableCell>{account.lastReconciledDate ?? "—"}</AccountsTableCell>
              <AccountsTableCell align="center" className="bank-recon-listing-action-col">
                <Button
                  asChild
                  size="sm"
                  className="h-7 text-[11px] px-2 bg-brand-600 hover:bg-brand-700 text-white"
                >
                  <Link href={bankReconWorkspacePath(account.id)}>Reconcile</Link>
                </Button>
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function BankReconciliationListingPageClient() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<BankReconListingRowUi[]>([]);
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BankReconciliationService.getDashboard({
        search: search.trim() || undefined,
      });
      setAllRows(data.items.map(mapDashboardItemToListingRow));
    } catch (err) {
      setAllRows([]);
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const filteredAccounts = useMemo(() => {
    return allRows.filter((a) => {
      if (accountType !== "all" && a.accountType !== accountType) return false;
      if (dateFrom && a.lastReconciledDate && a.lastReconciledDate < dateFrom) return false;
      if (dateTo && a.lastReconciledDate && a.lastReconciledDate > dateTo) return false;
      return true;
    });
  }, [allRows, accountType, dateFrom, dateTo]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page, pageSize]);

  const summary = useMemo(() => {
    const linked = filteredAccounts.filter((a) => a.bookLedgerLinked && a.bookBalance != null);
    const withStmt = filteredAccounts.filter((a) => a.statementBalanceDisplay != null);
    const totalBook = linked.reduce((s, a) => s + (a.bookBalance ?? 0), 0);
    const totalStatement = withStmt.reduce((s, a) => s + (a.statementBalanceDisplay ?? 0), 0);
    const totalDiff = filteredAccounts
      .filter((a) => a.differenceDisplay != null)
      .reduce((s, a) => s + (a.differenceDisplay ?? 0), 0);
  const reconciledThisMonth = 0;

    return {
      totalAccounts: filteredAccounts.length,
      totalBookBalance: totalBook,
      totalStatementBalance: withStmt.length > 0 ? totalStatement : null,
      totalDifference: withStmt.length > 0 ? totalDiff : null,
      pendingReconciliation: filteredAccounts.reduce(
        (s, a) => s + a.pendingReconciliationCount,
        0,
      ),
      reconciledThisMonth,
    };
  }, [filteredAccounts]);

  const handleReset = useCallback(() => {
    setSearch("");
    setAccountType("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const handleExportExcel = useCallback(() => {
    const headers = [
      "Bank Name",
      "Nickname",
      "Account Number",
      "Type",
      "Balance as per Books",
      "Bank Statement Balance",
      "Difference",
      "Pending Count",
      "Last Reconciled Date",
    ];
    const lines = filteredAccounts.map((a) => [
      a.bankName,
      a.accountNickname,
      a.maskedAccountNumber,
      a.accountType,
      a.bookBalance ?? "",
      a.statementBalanceDisplay ?? "Not Available",
      a.differenceDisplay ?? "",
      a.pendingReconciliationCount,
      a.lastReconciledDate ?? "",
    ]);
    const csv = [headers, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bank-reconciliation-accounts.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredAccounts]);

  const getCellValue = useCallback(
    (row: BankReconListingRowUi, key: string) =>
      (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const summaryItems = [
    { label: "Total Bank Accounts", value: String(summary.totalAccounts) },
    { label: "Balance as per Books", value: formatMoney(summary.totalBookBalance) },
    {
      label: "Bank Statement Balance",
      value:
        summary.totalStatementBalance != null
          ? formatMoney(summary.totalStatementBalance)
          : "—",
    },
    {
      label: "Difference",
      value:
        summary.totalDifference != null
          ? formatMoney(Math.abs(summary.totalDifference))
          : "—",
      warn: summary.totalDifference != null && summary.totalDifference !== 0,
    },
    { label: "Pending Reconciliation", value: String(summary.pendingReconciliation) },
    { label: "Reconciled This Month", value: String(summary.reconciledThisMonth) },
  ];

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Reconciliation", RECONCILIATION_LIST_PATH)}
      title="Bank Reconciliation"
      description={`Mark book entries cleared by bank date · ${selectedFY.label}`}
      hideDescription
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsColumnFilterProvider
        rows={paginatedRows}
        getCellValue={getCellValue}
        columnConfig={{
          bankName: { type: "text" },
          accountNickname: { type: "text" },
          maskedAccountNumber: { type: "text" },
          accountType: { type: "text" },
          bookBalance: { type: "amount" },
          statementBalanceDisplay: { type: "amount" },
          differenceDisplay: { type: "amount" },
          pendingReconciliationCount: { type: "amount" },
          lastReconciledDate: { type: "date" },
        }}
        defaultSortKey="bankName"
      >
        <AccountsTableListing
          className="bank-recon-listing"
          toolbar={
            <AccountsListingToolbar>
              <ReportFilterRow
                end={
                  <AccountsExportMenu
                    onExcel={handleExportExcel}
                    onCsv={handleExportExcel}
                    disabled={filteredAccounts.length === 0}
                  />
                }
              >
                <ReportSearchFilter
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  placeholder="Search bank accounts…"
                  className="min-w-[180px] flex-1 max-w-sm"
                />
                <div className="space-y-0.5 min-w-[130px]">
                  <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Account Type</Label>
                  <Select
                    value={accountType}
                    onValueChange={(v) => {
                      setAccountType(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPE_FILTER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {mounted && (
                  <AccountsListingDateFilter
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateFromChange={setDateFrom}
                    onDateToChange={setDateTo}
                    initialPreset="this_year"
                  />
                )}
                <ReportFilterResetButton onClick={handleReset} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => void loadDashboard()}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </ReportFilterRow>
            </AccountsListingToolbar>
          }
          summary={<AccountsSummaryCards items={summaryItems} columns={3} />}
          footer={
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filteredAccounts.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              recordLabel="accounts"
            />
          }
        >
          <BankAccountTable
            rows={paginatedRows}
            loading={loading}
            error={error}
            onRetry={() => void loadDashboard()}
          />
        </AccountsTableListing>
      </AccountsColumnFilterProvider>
    </AccountsPageShell>
  );
}
