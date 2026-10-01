"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  SectionTabs,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  ACCOUNTS_DEFAULT_PAGE_SIZE,
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  accountsDataService,
  filterByDateRange,
  searchRows,
} from "@/lib/accounts/accounts-data-service";
import {
  savePaymentRuns,
  type PaymentRunRecord,
} from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";

function exportPaymentRunsCsv(rows: PaymentRunRecord[]) {
  const headers = ["Run No", "Date", "Branch", "Payees", "Total", "Status"];
  const lines = rows.map((r) =>
    [r.runNo, r.date, r.branch, r.payeeCount, r.totalAmount, r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "payment-runs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function PaymentRunsTable({
  toolbarRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  toolbarRows: PaymentRunRecord[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(toolbarRows);
  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <>
      <AccountsTable minWidth={720}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Run No." colKey="runNo" />
            <SortTh label="Date" colKey="date" filterType="date" />
            <SortTh label="Branch" colKey="branch" />
            <SortTh label="Payees" colKey="payeeCount" filterType="amount" align="center" />
            <SortTh label="Total" colKey="totalAmount" filterType="amount" align="right" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {paged.length === 0 ? (
            <AccountsTableEmpty
              colSpan={5}
              message={
                toolbarRows.length === 0
                  ? "No payment runs found."
                  : "No records match the column filters."
              }
            />
          ) : (
            paged.map((r) => (
              <AccountsTableRow key={r.id}>
                <AccountsTableCell mono className="font-semibold text-brand-700">
                  {r.runNo}
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums">{r.date}</AccountsTableCell>
                <AccountsTableCell>{r.branch}</AccountsTableCell>
                <AccountsTableCell align="center">{r.payeeCount}</AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(r.totalAmount)}
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
        />
      ) : null}
    </>
  );
}

function PaymentRunsContent({
  tab,
  setTab,
  search,
  setSearch,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  counts,
  toolbarRows,
  onAdd,
}: {
  tab: string;
  setTab: (t: string) => void;
  search: string;
  setSearch: (s: string) => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  counts: Record<string, number>;
  toolbarRows: PaymentRunRecord[];
  onAdd: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const visible = useAccountsFilteredRows(toolbarRows);

  useEffect(() => {
    setPage(1);
  }, [tab, search, dateFrom, dateTo, pageSize]);

  const handleExport = useCallback(() => exportPaymentRunsCsv(visible), [visible]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Payment Runs")}
      title="Payment Runs"
      description="Batch vendor and employee claim payments for approval and execution."
      hideDescription
      actions={
        <Button
          size="sm"
          className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5 px-2.5"
          onClick={onAdd}
        >
          <Plus className="w-4 h-4" /> New Payment Run
        </Button>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        toolbar={
          <AccountsTableToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search run no., branch…",
            }}
            filters={
              <ReportDateRangeFilter
                preset={preset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPresetChange={setPreset}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
            }
            actions={
              <AccountsExportMenu onExcel={handleExport} onPdf={handleExport} disabled={visible.length === 0} />
            }
          />
        }
        subheader={
          <SectionTabs
            tabs={[
              { id: "all", label: "All" },
              { id: "draft", label: "Draft" },
              { id: "approved", label: "Approved" },
              { id: "paid", label: "Paid" },
              { id: "cancelled", label: "Cancelled" },
            ]}
            active={tab}
            onChange={setTab}
            counts={counts}
            compact
          />
        }
      >
        <PaymentRunsTable
          toolbarRows={toolbarRows}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function PaymentRunsPageClient() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [refreshKey, setRefreshKey] = useState(0);

  const records = useMemo(() => accountsDataService.getPaymentRuns(), [refreshKey]);

  const toolbarRows = useMemo(() => {
    let list = tab === "all" ? records : records.filter((r) => r.status === tab);
    list = filterByDateRange(list, "date", dateFrom, dateTo);
    list = searchRows(list, search, ["runNo", "branch", "status"]);
    return list;
  }, [records, tab, dateFrom, dateTo, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: records.length };
    for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [records]);

  const getCellValue = useCallback(
    (row: PaymentRunRecord, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const handleAdd = () => {
    const nextId = records.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    const runNo = `PRUN-${String(nextId).padStart(4, "0")}`;
    const today = new Date().toISOString().slice(0, 10);
    const newRun: PaymentRunRecord = {
      id: nextId,
      runNo,
      date: today,
      payeeCount: 1,
      totalAmount: 0,
      status: "draft",
      branch: "Head Office",
    };
    savePaymentRuns([newRun, ...records]);
    accountsDataService.invalidate("paymentRuns");
    setRefreshKey((k) => k + 1);
  };

  return (
    <AccountsColumnFilterProvider
      rows={toolbarRows}
      getCellValue={getCellValue}
      columnConfig={{
        runNo: { type: "text" },
        date: { type: "date" },
        branch: { type: "text" },
        payeeCount: { type: "amount" },
        totalAmount: { type: "amount" },
      }}
      defaultSortKey="date"
      defaultSortDir="desc"
    >
      <PaymentRunsContent
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        counts={counts}
        toolbarRows={toolbarRows}
        onAdd={handleAdd}
      />
    </AccountsColumnFilterProvider>
  );
}
