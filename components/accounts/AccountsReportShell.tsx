"use client";

import React, { useCallback, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { AccountsColumnarTable } from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsListingToolbar,
} from "@/components/accounts/AccountsTableListing";
import {
  buildTabularReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  escapeHtml,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import { formatMoney } from "@/lib/accounts/money-format";
import { useFY } from "@/lib/fy-store";
import type { LucideIcon } from "lucide-react";

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
  /** Optional export period metadata */
  dateFrom?: string;
  dateTo?: string;
}

function formatCellValue(value: string | number | undefined, money?: boolean): string {
  if (value == null || value === "") return "—";
  if (money && typeof value === "number") return formatMoney(value);
  return String(value);
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
  dateFrom,
  dateTo,
}: AccountsReportShellProps) {
  const { selectedFY } = useFY();
  const [exporting, setExporting] = useState(false);

  const buildExportBody = useCallback(() => {
    const exportColumns: ReportColumnHeader[] = columns.map((c) => ({
      label: c.label,
      align: c.align,
      className: c.align === "right" ? "num" : c.mono ? "mono" : undefined,
    }));

    const bodyHtml = rows
      .map((row) => {
        const cells = columns
          .map((c) => {
            const raw = row[c.key];
            const formatted = formatCellValue(raw, c.money);
            const alignClass =
              c.align === "right" ? "num" : c.align === "center" ? "center" : "";
            const monoClass = c.mono ? "mono" : "";
            const cls = [alignClass, monoClass].filter(Boolean).join(" ");
            return `<td${cls ? ` class="${cls}"` : ""}>${escapeHtml(formatted)}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    return buildTabularReportBodyHtml({ columns: exportColumns, bodyHtml });
  }, [columns, rows]);

  const buildHeaderOptions = useCallback((): ReportHeaderOptions => {
    return {
      reportTitle: title,
      financialYear: selectedFY.label,
      ...(dateFrom && dateTo ? { dateFrom, dateTo } : {}),
    };
  }, [title, selectedFY.label, dateFrom, dateTo]);

  const handleExportExcel = useCallback(async () => {
    if (exporting || rows.length === 0) return;
    setExporting(true);
    try {
      await exportAccountsReportToExcel({
        title,
        filename: title.replace(/\s+/g, "_"),
        header: buildHeaderOptions(),
        bodyHtml: buildExportBody(),
        landscape: columns.length > 5,
      });
    } finally {
      setExporting(false);
    }
  }, [buildExportBody, buildHeaderOptions, columns.length, exporting, rows.length, title]);

  const handleExportPdf = useCallback(() => {
    if (rows.length === 0) return;
    exportAccountsReportToPdf({
      title,
      filename: title.replace(/\s+/g, "_"),
      header: buildHeaderOptions(),
      bodyHtml: buildExportBody(),
      landscape: columns.length > 5,
    });
  }, [buildExportBody, buildHeaderOptions, columns.length, rows.length, title]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(section, title)}
      title={title}
      description={description}
      hideDescription
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        toolbar={
          <AccountsListingToolbar
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            exportDisabled={rows.length === 0 || exporting}
          >
            {filters}
          </AccountsListingToolbar>
        }
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
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

/** @deprecated Import from @/components/accounts/ReportFilters */
export { ReportFilterBar } from "@/components/accounts/ReportFilters";
