"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
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

export default function PaymentRunsPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  const records = useMemo(
    () => accountsDataService.getPaymentRuns(),
    [refreshKey],
  );

  const filtered = useMemo(() => {
    let list = tab === "all" ? records : records.filter((r) => r.status === tab);
    list = filterByDateRange(list, "date", dateFrom, dateTo);
    list = searchRows(list, search, ["runNo", "branch", "status"]);
    return list;
  }, [records, tab, dateFrom, dateTo, search]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [tab, search, dateFrom, dateTo, pageSize]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: records.length };
    for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [records]);

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

  const handleExport = useCallback(() => exportPaymentRunsCsv(filtered), [filtered]);

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
          onClick={handleAdd}
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
            actions={<AccountsExportMenu onExcel={handleExport} onPdf={handleExport} disabled={filtered.length === 0} />}
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
        footer={
          filtered.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : undefined
        }
      >
        <AccountsTable minWidth={720}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell uppercase>Run No.</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Branch</AccountsTableHeadCell>
              <AccountsTableHeadCell align="center" uppercase>Payees</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>Total</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Status</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {paged.length === 0 ? (
              <AccountsTableEmpty colSpan={6} message="No payment runs found." />
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
                  <AccountsTableCell>
                    <StatusBadge status={r.status} />
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
