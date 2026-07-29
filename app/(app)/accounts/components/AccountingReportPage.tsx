"use client";

import React, { useCallback, useMemo } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { ReportFilterRow } from "@/components/accounts/ReportFilters";
import { AccountsClearAllColumnFiltersButton } from "@/components/accounts/AccountingReportToolbar";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsColumnarTable,
  AccountsTableScroll,
  type AccountsColumnDef,
} from "@/components/accounts/AccountsTable";
import { useAccountsColumnFilters } from "@/components/accounts/useAccountsColumnFilters";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** @deprecated use money */
  mono?: boolean;
  money?: boolean;
  filterType?: AccountsColumnDef["filterType"];
  statusOptions?: string[];
}

interface AccountingReportPageProps {
  title: string;
  description?: string;
  columns: Column[];
  rows: Record<string, string | number>[];
  footer?: React.ReactNode;
  filters?: React.ReactNode;
}

export function AccountingReportPage({
  title,
  description = "Tabular accounting report. Use filters and export for analysis.",
  columns,
  rows,
  footer,
  filters,
}: AccountingReportPageProps) {
  const tableColumns = useMemo(
    (): AccountsColumnDef[] =>
      columns.map((c) => ({
        key: c.key,
        label: c.label,
        align: c.align,
        money: c.money ?? c.mono,
        filterType: c.filterType ?? (c.money || c.mono ? "amount" : c.key.toLowerCase().includes("date") ? "date" : "text"),
        statusOptions: c.statusOptions,
      })),
    [columns],
  );

  const getCellValue = useCallback(
    (row: Record<string, string | number>, key: string) => row[key],
    [],
  );

  const col = useAccountsColumnFilters({
    rows,
    getCellValue,
    defaultSortKey: columns[0]?.key ?? null,
    defaultSortDir: "asc",
  });

  const exportRows = col.filteredRows;

  const exportCsv = () => {
    const header = columns.map((c) => c.label).join(",") + "\n";
    const body = exportRows
      .map((row) => columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", title)}
      title={title}
      description={description}
      filters={
        <ReportFilterRow
          end={
            <>
              <AccountsClearAllColumnFiltersButton
                onClear={col.clearAllColumnFilters}
                activeCount={col.activeFilterCount}
              />
              <AccountsExportMenu onExcel={exportCsv} onPdf={exportCsv} disabled={exportRows.length === 0} />
            </>
          }
        >
          {filters}
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
        <AccountsTableScroll>
          <AccountsColumnarTable
            columns={tableColumns}
            rows={exportRows}
            emptyMessage="No records found."
            footer={footer}
            sortKey={col.sortKey}
            sortDir={col.sortDir}
            onSort={col.handleSort}
            onRemoveSort={col.removeSort}
            columnFilters={col.columnFilters}
            onColumnFilterChange={col.setColumnFilter}
            getValueCounts={col.getValueCounts}
          />
        </AccountsTableScroll>
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
