"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Upload, History } from "lucide-react";
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
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/components/ui/Loaders";
import {
  BANK_RECON_ACCOUNT_STATUS_OPTIONS,
  BANK_RECON_ACCOUNT_TYPE_OPTIONS,
  computeAccountDifference,
  computeListingSummary,
  getBankReconAccounts,
  maskAccountNumber,
  type BankReconBankAccount,
} from "./bank-reconciliation-v2-data";
import { BankReconAccountStatusBadge } from "./components/BankReconBadges";
import {
  bankReconUploadPath,
  bankReconWorkspacePath,
  RECONCILIATION_LIST_PATH,
  BANK_RECON_IMPORT_HISTORY_PATH,
} from "./reconciliation-utils";
import { BankReconManualTransactionSheet } from "./components/BankReconManualTransactionSheet";
import { BankReconSelectAccountDialog } from "./components/BankReconSelectAccountDialog";

const ACCOUNT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  ...BANK_RECON_ACCOUNT_TYPE_OPTIONS.map((t) => ({ value: t, label: t })),
];

const STATUS_FILTER_OPTIONS = BANK_RECON_ACCOUNT_STATUS_OPTIONS.map((s) => ({
  value: s,
  label: s,
}));

function UploadButton({ onUpload }: { onUpload: (accountId?: string) => void }) {
  const accounts = getBankReconAccounts();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 text-xs gap-1.5"
      onClick={() => {
        if (accounts.length === 1) {
          onUpload(accounts[0]!.id);
        } else {
          onUpload();
        }
      }}
    >
      <Upload className="w-3.5 h-3.5" />
      Upload Statement
    </Button>
  );
}

function BankAccountTable({
  rows,
  onOpenReconciliation,
  onUploadStatement,
  onAddManual,
  onViewBankBook,
  loading,
}: {
  rows: BankReconBankAccount[];
  onOpenReconciliation: (id: string) => void;
  onUploadStatement: (id: string) => void;
  onAddManual: (id: string) => void;
  onViewBankBook: (id: string) => void;
  loading: boolean;
}) {
  const filtered = useAccountsFilteredRows(rows);

  if (loading) {
    return (
      <AccountsTable minWidth={1200}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {Array.from({ length: 11 }).map((_, i) => (
              <AccountsTableHeadCell key={i} sticky={false}>
                &nbsp;
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} cols={11} />
          ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  return (
    <AccountsTable minWidth={1200}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Bank Name" colKey="bankName" />
          <SortTh label="Account Nickname" colKey="accountNickname" />
          <SortTh label="Account Number" colKey="accountNumber" />
          <SortTh label="Account Type" colKey="accountType" />
          <SortTh label="Book Balance" colKey="bookBalance" filterType="amount" align="right" />
          <SortTh label="Statement Balance" colKey="statementBalance" filterType="amount" align="right" />
          <SortTh label="Difference" colKey="difference" filterType="amount" align="right" />
          <SortTh label="Pending Txns" colKey="pendingTransactions" filterType="amount" align="right" />
          <SortTh label="Last Reconciled" colKey="lastReconciledDate" filterType="date" />
          <SortTh label="Status" colKey="status" filterType="text" />
          <AccountsTableHeadCell className={accountsActionColClass("multi")} sticky>
            Action
          </AccountsTableHeadCell>
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.length === 0 ? (
          <AccountsTableEmpty colSpan={11} message="No bank accounts configured." />
        ) : filtered.length === 0 ? (
          <AccountsTableEmpty colSpan={11} message="No accounts match the current filters." />
        ) : (
          filtered.map((account) => {
            const diff = computeAccountDifference(account);
            return (
              <AccountsTableRow key={account.id} className="group">
                <AccountsTableCell className="font-medium">{account.bankName}</AccountsTableCell>
                <AccountsTableCell>{account.accountNickname}</AccountsTableCell>
                <AccountsTableCell mono>{maskAccountNumber(account.accountNumber)}</AccountsTableCell>
                <AccountsTableCell>{account.accountType}</AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(account.bookBalance)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(account.statementBalance)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  <span className={diff !== 0 ? "text-red-700" : undefined}>
                    {formatMoney(Math.abs(diff))}
                    {diff !== 0 ? (diff > 0 ? " Dr" : " Cr") : ""}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell align="right">{account.pendingTransactions}</AccountsTableCell>
                <AccountsTableCell>{account.lastReconciledDate ?? "—"}</AccountsTableCell>
                <AccountsTableCell>
                  <BankReconAccountStatusBadge status={account.status} />
                </AccountsTableCell>
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
                        Open Workspace
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewBankBook(account.id)}>
                        View Bank Book
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUploadStatement(account.id)}>
                        Upload Statement
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAddManual(account.id)}>
                        Manual Entry
                      </DropdownMenuItem>
                    </AccountsMoreActions>
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            );
          })
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function BankReconciliationListingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const { selectedFY } = useFY();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("all");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [manualSheetOpen, setManualSheetOpen] = useState(false);
  const [manualAccountId, setManualAccountId] = useState<string | undefined>();
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [manualPickerOpen, setManualPickerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "upload") {
      setUploadPickerOpen(true);
      router.replace(RECONCILIATION_LIST_PATH);
    }
  }, [searchParams, router]);

  const allAccounts = useMemo(() => getBankReconAccounts(), []);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAccounts.filter((a) => {
      if (accountType !== "all" && a.accountType !== accountType) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(a.status)) return false;
      if (!q) return true;
      return (
        a.bankName.toLowerCase().includes(q) ||
        a.accountNickname.toLowerCase().includes(q) ||
        a.accountNumber.includes(q) ||
        a.accountType.toLowerCase().includes(q)
      );
    });
  }, [allAccounts, search, accountType, filterStatus]);

  const tableRows = useMemo(
    () =>
      filteredAccounts.map((a) => ({
        ...a,
        difference: computeAccountDifference(a),
        accountNumber: maskAccountNumber(a.accountNumber),
      })),
    [filteredAccounts],
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, page, pageSize]);

  const summary = useMemo(() => computeListingSummary(allAccounts), [allAccounts]);

  const handleReset = useCallback(() => {
    setSearch("");
    setAccountType("all");
    setFilterStatus([]);
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
      "Book Balance",
      "Statement Balance",
      "Difference",
      "Pending Txns",
      "Last Reconciled",
      "Status",
    ];
    const lines = tableRows.map((a) => [
      a.bankName,
      a.accountNickname,
      a.accountNumber,
      a.accountType,
      a.bookBalance,
      a.statementBalance,
      computeAccountDifference(a),
      a.pendingTransactions,
      a.lastReconciledDate ?? "",
      a.status,
    ]);
    const csv = [headers, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bank-reconciliation-accounts.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [tableRows]);

  const handleUploadStatement = useCallback(
    (id?: string) => {
      if (id) {
        router.push(bankReconUploadPath(id));
        return;
      }
      setUploadPickerOpen(true);
    },
    [router],
  );

  const handleManualFromListing = useCallback(
    (accountId?: string) => {
      if (accountId) {
        router.push(`${bankReconWorkspacePath(accountId)}?manual=1`);
        return;
      }
      setManualPickerOpen(true);
    },
    [router],
  );

  const handleViewBankBook = useCallback(
    (_accountId: string) => {
      router.push("/accounts/reports/bank-book");
    },
    [router],
  );

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
    { label: "Total Book Balance", value: formatMoney(summary.totalBookBalance) },
    { label: "Total Statement Balance", value: formatMoney(summary.totalStatementBalance) },
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
      description={`Reconcile bank statements with books · ${selectedFY.label}`}
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => router.push(BANK_RECON_IMPORT_HISTORY_PATH)}
          >
            <History className="w-3.5 h-3.5" />
            Import History
          </Button>
          <UploadButton onUpload={handleUploadStatement} />
          <Button
            type="button"
            size="sm"
            className={cn("h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white border-0")}
            onClick={() => handleManualFromListing()}
          >
            <Plus className="w-3.5 h-3.5" />
            Manual Entry
          </Button>
        </div>
      }
    >
      <AccountsColumnFilterProvider
        rows={paginatedRows}
        getCellValue={getCellValue}
        columnConfig={{
          bankName: { type: "text" },
          accountNickname: { type: "text" },
          accountNumber: { type: "text" },
          accountType: { type: "text" },
          bookBalance: { type: "amount" },
          statementBalance: { type: "amount" },
          difference: { type: "amount" },
          pendingTransactions: { type: "amount" },
          lastReconciledDate: { type: "date" },
          status: { type: "text" },
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
                    statusOptions={STATUS_FILTER_OPTIONS}
                    status={filterStatus}
                    onStatusChange={(s) => {
                      setFilterStatus(s);
                      setPage(1);
                    }}
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
            onUploadStatement={handleUploadStatement}
            onAddManual={handleManualFromListing}
            onViewBankBook={handleViewBankBook}
            loading={loading}
          />
        </AccountsTableListing>
      </AccountsColumnFilterProvider>

      <BankReconSelectAccountDialog
        open={uploadPickerOpen}
        onClose={() => setUploadPickerOpen(false)}
        title="Upload Bank Statement"
        description="Choose the bank account for this statement import."
        confirmLabel="Continue"
        onConfirm={(id) => router.push(bankReconUploadPath(id))}
      />

      <BankReconSelectAccountDialog
        open={manualPickerOpen}
        onClose={() => setManualPickerOpen(false)}
        title="Manual Bank Entry"
        description="Choose the bank account for this manual entry."
        confirmLabel="Continue"
        onConfirm={(id) => router.push(`${bankReconWorkspacePath(id)}?manual=1`)}
      />

      <BankReconManualTransactionSheet
        open={manualSheetOpen}
        onClose={() => {
          setManualSheetOpen(false);
          setManualAccountId(undefined);
        }}
        bankAccountId={manualAccountId}
        onSaved={() => {}}
      />
    </AccountsPageShell>
  );
}
