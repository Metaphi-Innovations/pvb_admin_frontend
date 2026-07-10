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
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  useReportDateRange,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import {
  FUND_TRANSFER_MODE_LABELS,
  FUND_TRANSFER_MODES,
  filterFundTransfers,
  listAllTransferAccountOptions,
  loadFundTransfers,
  type FundTransferMode,
  type FundTransferRecord,
} from "@/lib/accounts/fund-transfer-data";
import {
  exportFundTransfersToExcel,
  exportFundTransfersToPdf,
} from "@/lib/accounts/fund-transfer-export";
import { cn } from "@/lib/utils";

function FundTransferTable({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  hasFilters,
  clearFilters,
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  hasFilters: boolean;
  clearFilters: () => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<FundTransferRecord>([]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <>
      <AccountsTable className="w-full">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Transfer Date" colKey="transferDate" filterType="date" />
            <SortTh label="Transfer No." colKey="transferNo" />
            <SortTh label="From Account" colKey="fromAccountName" />
            <SortTh label="To Account" colKey="toAccountName" />
            <SortTh label="Amount" colKey="amount" filterType="amount" align="right" />
            <SortTh label="Mode" colKey="transferMode" />
            <SortTh label="Reference No." colKey="referenceNo" />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("single")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {visible.length === 0 ? (
            <AccountsTableEmpty
              colSpan={8}
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
      {visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="transfers"
        />
      ) : null}
    </>
  );
}

function FundTransferExportToolbar({
  exportMeta,
  exporting,
  onExportExcel,
  onExportPdf,
  search,
  onSearchChange,
}: {
  exportMeta: {
    dateFrom: string;
    dateTo: string;
    financialYear: string;
    fromAccount: string;
    toAccount: string;
    transferMode: string;
    search: string;
  };
  exporting: boolean;
  onExportExcel: (rows: FundTransferRecord[], meta: typeof exportMeta) => Promise<void>;
  onExportPdf: (rows: FundTransferRecord[], meta: typeof exportMeta) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const visible = useAccountsFilteredRows<FundTransferRecord>([]);

  return (
    <AccountsTableToolbar
      placement="page-header"
      search={{ value: search, onChange: onSearchChange, placeholder: "Transfer no., reference, account…" }}
      onExcel={() => void onExportExcel(visible, exportMeta)}
      onPdf={() => onExportPdf(visible, exportMeta)}
      exportDisabled={exporting || visible.length === 0}
    />
  );
}

export default function FundTransferPageClient() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [search, setSearch] = useState("");
  const [fromAccountId, setFromAccountId] = useState("all");
  const [toAccountId, setToAccountId] = useState("all");
  const [transferMode, setTransferMode] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  const records = useMemo(() => {
    void refreshKey;
    return loadFundTransfers();
  }, [refreshKey]);

  const accountOptions = useMemo(() => listAllTransferAccountOptions(), [refreshKey]);

  const toolbarFiltered = useMemo(
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

  const getCellValue = useCallback((row: FundTransferRecord, key: string) => {
    if (key === "transferMode") return FUND_TRANSFER_MODE_LABELS[row.transferMode];
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

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

  const handleExportExcel = async (rows: FundTransferRecord[], meta: typeof exportMeta) => {
    if (rows.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportFundTransfersToExcel(rows, meta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = (rows: FundTransferRecord[], meta: typeof exportMeta) => {
    if (rows.length === 0 || exporting) return;
    setExporting(true);
    try {
      exportFundTransfersToPdf(rows, meta);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsColumnFilterProvider
      rows={toolbarFiltered}
      getCellValue={getCellValue}
      columnConfig={{
        transferDate: { type: "date" },
        transferNo: { type: "text" },
        fromAccountName: { type: "text" },
        toAccountName: { type: "text" },
        amount: { type: "amount" },
        transferMode: { type: "text" },
        referenceNo: { type: "text" },
      }}
      defaultSortKey="transferDate"
      defaultSortDir="desc"
    >
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Banking", "Fund Transfer")}
        title="Fund Transfer"
        description="Transfer funds between bank and cash accounts."
        hideDescription
        actions={
          <Button
            size="sm"
            className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1"
            onClick={() => router.push("/accounts/banking/fund-transfer/new")}
          >
            <Plus className="w-4 h-4" /> New Transfer
          </Button>
        }
        toolbar={
          <FundTransferExportToolbar
            exportMeta={exportMeta}
            exporting={exporting}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            search={search}
            onSearchChange={setSearch}
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
        <AccountsTableListing>
          <FundTransferTable
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            hasFilters={hasFilters}
            clearFilters={clearFilters}
          />
        </AccountsTableListing>
      </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}
