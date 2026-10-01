"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  AccountsMoreActions,
  AccountsTableActionCell,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
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
import {
  BANK_RECON_ACCOUNT_TYPE_OPTIONS,
  maskAccountNumber,
} from "./bank-reconciliation-v2-data";
import { bankReconWorkspacePath, RECONCILIATION_LIST_PATH } from "./reconciliation-utils";
import {
  computeListingSummary,
  getListingAccounts,
} from "@/lib/accounts/bank-recon-tally-service";
import { resetBankReconciliationDemoData } from "@/lib/accounts/bank-recon-tally-demo-seed";
import type { BankReconListingAccount } from "@/lib/accounts/bank-recon-tally-types";
import { TALLY_EVENT } from "@/lib/accounts/bank-recon-tally-types";

const ACCOUNT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  ...BANK_RECON_ACCOUNT_TYPE_OPTIONS.map((t) => ({ value: t, label: t })),
];

const IS_DEV = process.env.NODE_ENV === "development";

function BankAccountTable({
  rows,
  onOpenReconciliation,
  loading,
}: {
  rows: BankReconListingAccount[];
  onOpenReconciliation: (id: string) => void;
  loading: boolean;
}) {
  const filtered = useAccountsFilteredRows(rows);

  if (loading) {
    return (
      <AccountsTable minWidth={1180}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {Array.from({ length: 10 }).map((_, i) => (
              <AccountsTableHeadCell key={i} sticky={false}>
                &nbsp;
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} cols={10} />
          ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  return (
    <AccountsTable minWidth={1180}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Bank Name" colKey="bankName" />
          <SortTh label="Account Nickname" colKey="accountNickname" />
          <SortTh label="Account Number" colKey="maskedAccountNumber" />
          <SortTh label="Account Type" colKey="accountType" />
          <SortTh label="Balance as per Books" colKey="bookBalance" filterType="amount" align="right" />
          <SortTh
            label="Expected Balance as per Bank"
            colKey="bankBalance"
            filterType="amount"
            align="right"
          />
          <SortTh label="Difference" colKey="difference" filterType="amount" align="right" />
          <SortTh
            label="Pending Count"
            colKey="pendingReconciliationCount"
            filterType="amount"
            align="right"
          />
          <SortTh label="Last Reconciled Date" colKey="lastReconciledDate" filterType="date" />
          <AccountsTableHeadCell className={accountsActionColClass("multi")} sticky>
            Action
          </AccountsTableHeadCell>
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.length === 0 ? (
          <AccountsTableEmpty colSpan={10} message="No bank accounts configured." />
        ) : filtered.length === 0 ? (
          <AccountsTableEmpty colSpan={10} message="No accounts match the current filters." />
        ) : (
          filtered.map((account) => (
            <AccountsTableRow key={account.id} className="group">
              <AccountsTableCell className="font-medium">{account.bankName}</AccountsTableCell>
              <AccountsTableCell>{account.accountNickname}</AccountsTableCell>
              <AccountsTableCell mono>
                {maskAccountNumber(account.accountNumber)}
              </AccountsTableCell>
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
                {account.bookLedgerLinked ? (
                  formatMoney(account.bankBalance)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {account.difference == null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={account.difference !== 0 ? "text-red-700" : undefined}>
                    {formatMoney(Math.abs(account.difference))}
                    {account.difference !== 0
                      ? account.difference > 0
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
              <AccountsTableCell align="right" className="accounts-table-td-sticky">
                <AccountsTableActionCell variant="multi">
                  <Button
                    asChild
                    size="sm"
                    className="h-7 text-[11px] px-2 bg-brand-600 hover:bg-brand-700 text-white"
                  >
                    <Link href={bankReconWorkspacePath(account.id)}>Reconcile</Link>
                  </Button>
                  <AccountsMoreActions contentClassName="w-48">
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                      Actions
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onOpenReconciliation(account.id)}>
                      Reconcile
                    </DropdownMenuItem>
                  </AccountsMoreActions>
                </AccountsTableActionCell>
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function BankReconciliationListingPageClient() {
  const router = useRouter();
  const mounted = useClientMounted();
  const { selectedFY } = useFY();

  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = () => setTick((x) => x + 1);
    window.addEventListener(TALLY_EVENT, handler);
    return () => window.removeEventListener(TALLY_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const allAccounts = useMemo(() => {
    void tick;
    return getListingAccounts();
  }, [tick]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAccounts.filter((a) => {
      if (accountType !== "all" && a.accountType !== accountType) return false;
      if (dateFrom && a.lastReconciledDate && a.lastReconciledDate < dateFrom) return false;
      if (dateTo && a.lastReconciledDate && a.lastReconciledDate > dateTo) return false;
      if (!q) return true;
      return (
        a.bankName.toLowerCase().includes(q) ||
        a.accountNickname.toLowerCase().includes(q) ||
        a.accountNumber.includes(q) ||
        a.accountType.toLowerCase().includes(q)
      );
    });
  }, [allAccounts, search, accountType, dateFrom, dateTo]);

  const tableRows = useMemo(
    () =>
      filteredAccounts.map((a) => ({
        ...a,
        maskedAccountNumber: maskAccountNumber(a.accountNumber),
      })),
    [filteredAccounts],
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, page, pageSize]);

  const summary = useMemo(() => computeListingSummary(filteredAccounts), [filteredAccounts]);

  const handleReset = useCallback(() => {
    setSearch("");
    setAccountType("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const handleResetDemo = useCallback(() => {
    resetBankReconciliationDemoData();
    setTick((x) => x + 1);
    setToast("Bank Reconciliation demo data reset.");
  }, []);

  const handleExportExcel = useCallback(() => {
    const headers = [
      "Bank Name",
      "Nickname",
      "Account Number",
      "Type",
      "Balance as per Books",
      "Expected Balance as per Bank",
      "Difference",
      "Pending Count",
      "Last Reconciled Date",
    ];
    const lines = tableRows.map((a) => [
      a.bankName,
      a.accountNickname,
      maskAccountNumber(a.accountNumber),
      a.accountType,
      a.bookBalance ?? "",
      a.bankBalance,
      a.difference ?? "",
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
  }, [tableRows]);

  const handleOpenReconciliation = useCallback(
    (accountId: string) => {
      router.push(bankReconWorkspacePath(accountId));
    },
    [router],
  );

  const getCellValue = useCallback(
    (row: (typeof tableRows)[number], key: string) =>
      (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const summaryItems = [
    { label: "Total Bank Accounts", value: String(summary.totalAccounts) },
    { label: "Total Balance as per Books", value: formatMoney(summary.totalBookBalance) },
    {
      label: "Total Expected Balance as per Bank",
      value: formatMoney(summary.totalBankBalance),
    },
    {
      label: "Total Difference",
      value: formatMoney(Math.abs(summary.totalDifference)),
      warn: summary.totalDifference !== 0,
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
      actions={
        IS_DEV ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={handleResetDemo}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Bank Reconciliation Demo Data
            </Button>
          </div>
        ) : null
      }
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
          bankBalance: { type: "amount" },
          difference: { type: "amount" },
          pendingReconciliationCount: { type: "amount" },
          lastReconciledDate: { type: "date" },
        }}
        defaultSortKey="bankName"
      >
        <AccountsTableListing
          toolbar={
            <AccountsListingToolbar>
              <ReportFilterRow
                end={
                  <AccountsExportMenu
                    onExcel={handleExportExcel}
                    onCsv={handleExportExcel}
                    disabled={tableRows.length === 0}
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
                <div className="space-y-0.5">
                  <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Financial Year</span>
                  <div
                    className={cn(
                      ACCOUNTS_FILTER_CONTROL_CLASS,
                      "mt-0 flex items-center px-2.5 bg-muted/30 text-xs font-medium",
                    )}
                  >
                    {selectedFY.label}
                  </div>
                </div>
                <ReportFilterResetButton onClick={handleReset} />
              </ReportFilterRow>
            </AccountsListingToolbar>
          }
          summary={<AccountsSummaryCards items={summaryItems} columns={3} />}
          footer={
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={tableRows.length}
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
            onOpenReconciliation={handleOpenReconciliation}
            loading={loading}
          />
        </AccountsTableListing>
      </AccountsColumnFilterProvider>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
          {toast}
        </div>
      )}
    </AccountsPageShell>
  );
}
