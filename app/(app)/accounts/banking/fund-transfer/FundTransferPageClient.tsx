"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Plus } from "lucide-react";
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
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { SortTh, StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  useReportDateRange,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";
import {
  FUND_TRANSFER_MODE_LABELS,
  FUND_TRANSFER_MODES,
  filterFundTransfers,
  listAllTransferAccountOptions,
  loadFundTransfers,
  sortFundTransfers,
  type FundTransferMode,
  type FundTransferSortKey,
} from "@/lib/accounts/fund-transfer-data";
import {
  exportFundTransfersToExcel,
  exportFundTransfersToPdf,
} from "@/lib/accounts/fund-transfer-export";
import { cn } from "@/lib/utils";

export default function FundTransferPageClient() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [search, setSearch] = useState("");
  const [fromAccountId, setFromAccountId] = useState("all");
  const [toAccountId, setToAccountId] = useState("all");
  const [transferMode, setTransferMode] = useState("all");
  const [sortKey, setSortKey] = useState<FundTransferSortKey>("transferDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  

  const records = useMemo(() => {
    void refreshKey;
    return loadFundTransfers();
  }, [refreshKey]);

  const accountOptions = useMemo(() => listAllTransferAccountOptions(), [refreshKey]);

  const filtered = useMemo(
    () =>
      filterFundTransfers(records, {
        search,
        dateFrom,
        dateTo,
        financialYearId: "all",
        fromAccountId: fromAccountId === "all" ? "all" : Number(fromAccountId),
        toAccountId: toAccountId === "all" ? "all" : Number(toAccountId),
        transferMode: transferMode === "all" ? "all" : (transferMode as FundTransferMode),
      }),
    [records, search, dateFrom, dateTo, fromAccountId, toAccountId, transferMode],
  );

  const sorted = useMemo(
    () => sortFundTransfers(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const hasFilters =
    Boolean(search.trim()) ||
    fromAccountId !== "all" ||
    toAccountId !== "all" ||
    transferMode !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setFromAccountId("all");
    setToAccountId("all");
    setTransferMode("all");
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, fromAccountId, toAccountId, transferMode, pageSize]);

  const handleSort = (key: string) => {
    const k = key as FundTransferSortKey;
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const fromAccountLabel = useMemo(() => {
    if (fromAccountId === "all") return "All accounts";
    return accountOptions.find((a) => String(a.id) === fromAccountId)?.label ?? fromAccountId;
  }, [fromAccountId, accountOptions]);

  const toAccountLabel = useMemo(() => {
    if (toAccountId === "all") return "All accounts";
    return accountOptions.find((a) => String(a.id) === toAccountId)?.label ?? toAccountId;
  }, [toAccountId, accountOptions]);

  const modeLabel = useMemo(() => {
    if (transferMode === "all") return "All modes";
    return FUND_TRANSFER_MODE_LABELS[transferMode as keyof typeof FUND_TRANSFER_MODE_LABELS] ?? transferMode;
  }, [transferMode]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
      fromAccount: fromAccountLabel,
      toAccount: toAccountLabel,
      transferMode: modeLabel,
      search: search.trim(),
    }),
    [dateFrom, dateTo, fromAccountLabel, toAccountLabel, modeLabel, search],
  );

  const handleExportExcel = async () => {
    if (sorted.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportFundTransfersToExcel(sorted, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (sorted.length === 0 || exporting) return;
    setExporting(true);
    try {
      exportFundTransfersToPdf(sorted, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Fund Transfer")}
      title="Fund Transfer"
      description="Transfer funds between bank and cash accounts."
      hideDescription
      actions={
        <Button
          size="sm"
          className="h-9 text-[13px] font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1"
          onClick={() => router.push("/accounts/banking/fund-transfer/new")}
        >
          <Plus className="w-4 h-4" /> New Transfer
        </Button>
      }
      toolbar={
        <AccountsTableToolbar
          placement="page-header"
          search={{ value: search, onChange: setSearch, placeholder: "Transfer no., reference, account…" }}
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          exportDisabled={exporting || sorted.length === 0}
        />
      }
      filters={
        <ReportFilterRow>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="space-y-1 min-w-[160px]">
            <Label className={filterLabelClass}>From Account</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[160px]")}>
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All accounts</SelectItem>
                {accountOptions.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[160px]">
            <Label className={filterLabelClass}>To Account</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[160px]")}>
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All accounts</SelectItem>
                {accountOptions.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[130px]">
            <Label className={filterLabelClass}>Mode</Label>
            <Select value={transferMode} onValueChange={setTransferMode}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[130px]")}>
                <SelectValue placeholder="All modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All modes</SelectItem>
                {FUND_TRANSFER_MODES.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {FUND_TRANSFER_MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        footer={
          sorted.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={sorted.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="transfers"
            />
          ) : null
        }
      >
        <AccountsTable className="w-full">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Transfer Date" colKey="transferDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Transfer No." colKey="transferNo" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="From Account" colKey="fromAccountName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="To Account" colKey="toAccountName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Amount" colKey="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
              <SortTh label="Mode" colKey="transferMode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Reference No." colKey="referenceNo" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <th className="accounts-col-actions w-10" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {paginated.length === 0 ? (
              <AccountsTableEmpty
                colSpan={9}
                message={hasFilters ? "No transfers match your filters." : "No fund transfers recorded yet."}
                onClear={hasFilters ? clearFilters : undefined}
              />
            ) : (
              paginated.map((r) => (
                <AccountsTableRow key={r.id} className="group">
                  <AccountsTableCell>{r.transferDate}</AccountsTableCell>
                  <AccountsTableCell className="font-mono font-semibold text-brand-700">
                    {r.transferNo}
                  </AccountsTableCell>
                  <AccountsTableCell className="accounts-col-wide">{r.fromAccountName}</AccountsTableCell>
                  <AccountsTableCell className="accounts-col-wide">{r.toAccountName}</AccountsTableCell>
                  <AccountsTableCell align="right" className={MONEY_AMOUNT_CLASS}>
                    {formatMoney(r.amount)}
                  </AccountsTableCell>
                  <AccountsTableCell>{FUND_TRANSFER_MODE_LABELS[r.transferMode]}</AccountsTableCell>
                  <AccountsTableCell className="font-mono text-xs">
                    {r.referenceNo || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge status={r.status} />
                  </AccountsTableCell>
                  <AccountsTableCell className={accountsActionColClass("single")}>
                    <AccountsViewAction
                      title="View transfer"
                      onClick={() => router.push(`/accounts/banking/fund-transfer/${r.id}`)}
                    />
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
