"use client";

import React from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsColumnarTable } from "@/components/accounts/AccountsTable";
import { AccountsTableListing } from "@/components/accounts/AccountsTableListing";import type { LucideIcon } from "lucide-react";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  money?: boolean;
  mono?: boolean;
}

export interface ReportKpi {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: boolean;
  warn?: boolean;
}

export interface AccountsReportShellProps {
  title: string;
  description?: string;
  section?: string;
  kpis?: ReportKpi[];
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  filters?: React.ReactNode;
  emptyMessage?: string;
  onRowClick?: (row: Record<string, string | number>, index: number) => void;
  getRowKey?: (row: Record<string, string | number>, index: number) => string | number;
  clickableColumnKeys?: string[];
  rowActionFooter?: React.ReactNode;
}

export function AccountsReportShell({
  title,
  description = "Report view with filters and export. Data from local mock / posted vouchers.",
  section = "Reports",
  kpis,
  columns,
  rows,
  filters,
  emptyMessage = "No records found.",
  onRowClick,
  getRowKey,
  clickableColumnKeys,
  rowActionFooter,
}: AccountsReportShellProps) {
  const exportCsv = () => {
    const header = columns.map((c) => c.label).join(",") + "\n";
    const body = rows
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
      breadcrumbs={accountsBreadcrumb(section, title)}
      title={title}
      description={description}
      actions={<AccountsExportMenu onExcel={exportCsv} onPdf={exportCsv} />}
      filters={filters}
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        summary={
          kpis && kpis.length > 0 ? (
            <AccountsSummaryBar
              items={kpis.map((k) => ({
                label: k.label,
                value: k.value,
                warn: k.warn,
              }))}
            />
          ) : undefined
        }
        footer={rowActionFooter}
      >
        <AccountsColumnarTable
          columns={columns.map((c) => ({
            key: c.key,
            label: c.label,
            align: c.align,
            money: c.money,
            mono: c.mono,
          }))}
          rows={rows}
          emptyMessage={emptyMessage}
          onRowClick={onRowClick}
          getRowKey={getRowKey}
          clickableColumnKeys={clickableColumnKeys}
        />
      </AccountsTableListing>    </AccountsPageShell>
  );
}

/** @deprecated Import from @/components/accounts/ReportFilters */
export { ReportFilterBar } from "@/components/accounts/ReportFilters";
