"use client";

import { useCallback, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsColumnarTable,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  ACCOUNTS_DEFAULT_PAGE_SIZE,
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export interface ReportPlaceholderColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  money?: boolean;
  mono?: boolean;
}

export interface AccountsReportPlaceholderConfig {
  title: string;
  description: string;
  searchPlaceholder?: string;
  columns: ReportPlaceholderColumn[];
  emptyTitle?: string;
  emptyMessage?: string;
}

export function AccountsReportPlaceholderClient({
  title,
  description,
  searchPlaceholder = "Search…",
  columns,
  emptyTitle = "No records found",
  emptyMessage = "No data is available for the selected filters. Adjust the date range or search and try again.",
}: AccountsReportPlaceholderConfig) {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);

  const rows: Record<string, string | number>[] = [];
  const totalRecords = 0;

  const exportCsv = useCallback(() => {
    const header = columns.map((c) => c.label).join(",") + "\n";
    const blob = new Blob([header], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [columns, title]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", title)}
      title={title}
      description={description}
      filters={
        <ReportFilterRow
          end={
            <AccountsExportMenu onExcel={exportCsv} onPdf={exportCsv} disabled={totalRecords === 0} />
          }
        >
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
          />
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
      footer={
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      }
    >
      <AccountsTableListing>
        {totalRecords === 0 ? (
          <div className="flex flex-1 items-center justify-center min-h-[200px]">
            <p className="text-xs text-muted-foreground">No records found.</p>
          </div>
        ) : (
          <AccountsTableScroll>
            <AccountsColumnarTable
              columns={columns}
              rows={rows}
              emptyMessage={emptyTitle}
            />
          </AccountsTableScroll>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
