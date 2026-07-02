"use client";

import React from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsColumnarTable,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** @deprecated use money */
  mono?: boolean;
  money?: boolean;
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
      breadcrumbs={accountsBreadcrumb("Reports", title)}
      title={title}
      description={description}
      actions={<AccountsExportMenu onExcel={exportCsv} onPdf={exportCsv} />}
      filters={filters}
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableScroll>
          <AccountsColumnarTable
            columns={columns.map((c) => ({
              key: c.key,
              label: c.label,
              align: c.align,
              money: c.money ?? c.mono,
            }))}
            rows={rows}
            emptyMessage="No records found."
            footer={footer}
          />
        </AccountsTableScroll>
      </div>
    </AccountsPageShell>
  );
}
