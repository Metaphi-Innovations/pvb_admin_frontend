"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTablePagination,
  ACCOUNTS_DEFAULT_PAGE_SIZE,
} from "@/components/accounts/AccountsTableListing";
import { BillOutstandingDetailsSheet } from "@/components/accounts/outstanding/BillOutstandingDetailsSheet";
import { OutstandingBillsTable } from "@/components/accounts/outstanding/OutstandingBillsTable";
import {
  defaultOutstandingFiltersState,
  OutstandingFiltersBar,
  resolveCurrentFinancialYear,
  type OutstandingFiltersState,
} from "@/components/accounts/outstanding/OutstandingFiltersBar";
import { OutstandingSummaryCards } from "@/components/accounts/outstanding/OutstandingSummaryCards";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  buildTabularReportBodyHtml,
  escapeHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
} from "@/lib/accounts/report-export-engine";
import { formatOutstandingReportDate } from "@/lib/accounts/bill-wise-outstanding-display";
import { formatMoney } from "@/lib/accounts/money-format";
import { useBillWiseOutstanding } from "@/lib/accounts/use-bill-wise-outstanding";
import { useFY } from "@/lib/fy-store";
import type { OutstandingBillDisplayRow } from "@/types/bill-wise-outstanding.types";

export function BillWiseOutstandingPanel({
  partyLedgerId,
  partyCode,
  partyName,
  partyKind = "customer",
  backHref,
  docLabel = "Invoice",
  openOutstandingOnly = false,
  refreshKey,
  compact = false,
}: {
  /** Backend AccountLedger.ledger_id (UUID). Required for API calls. */
  partyLedgerId?: string | null;
  partyCode?: string;
  partyName?: string;
  partyKind?: "customer" | "supplier";
  /** When set, renders full page chrome (matches COA Bill-wise layout). */
  backHref?: string;
  docLabel?: string;
  openOutstandingOnly?: boolean;
  refreshKey?: number | string;
  /** Embedded (receivables detail): tighter chrome, no page shell. */
  compact?: boolean;
}) {
  const { selectedFY, allFYs } = useFY();
  const currentFy = useMemo(
    () => resolveCurrentFinancialYear(allFYs, selectedFY),
    [allFYs, selectedFY],
  );
  const [filters, setFilters] = useState<OutstandingFiltersState>(() =>
    defaultOutstandingFiltersState(currentFy),
  );
  const fySyncedRef = useRef(false);

  // Once API FY list loads, lock filters to the active (isCurrent) year.
  useEffect(() => {
    if (!currentFy?.id || fySyncedRef.current) return;
    fySyncedRef.current = true;
    setFilters(defaultOutstandingFiltersState(currentFy));
  }, [currentFy]);

  const [sortBy, setSortBy] = useState("invoiceDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [detailRow, setDetailRow] = useState<OutstandingBillDisplayRow | null>(
    null,
  );
  const [exporting, setExporting] = useState(false);

  const enabled = Boolean(partyLedgerId);
  const pageMode = Boolean(backHref) && !compact;

  const apiStatus =
    filters.statuses.length === 1 ? filters.statuses[0] : undefined;

  const {
    rows: apiRows,
    summary,
    page,
    limit,
    totalRecords,
    loading,
    error,
    setPage,
    setLimit,
    resetPage,
  } = useBillWiseOutstanding({
    partyLedgerId: partyLedgerId || undefined,
    financialYearId:
      filters.financialYearId !== "all"
        ? filters.financialYearId
        : selectedFY?.id,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    asOfDate: filters.asOfDate || filters.endDate || undefined,
    status: apiStatus,
    search: filters.search,
    openOutstandingOnly,
    sortBy,
    sortOrder,
    enabled,
    refreshKey,
  });

  const rows = useMemo(() => {
    if (filters.statuses.length <= 1) return apiRows;
    const allowed = new Set(
      filters.statuses.map((s) => s.toUpperCase().replace(/\s+/g, "_")),
    );
    return apiRows.filter((r) =>
      allowed.has(String(r.displayStatus).toUpperCase().replace(/\s+/g, "_")),
    );
  }, [apiRows, filters.statuses]);

  const handleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortOrder((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortOrder("desc");
      }
      resetPage();
    },
    [sortBy, resetPage],
  );

  const financialYearLabel = useMemo(() => {
    if (filters.financialYearId === "all") return "All years";
    return (
      allFYs.find((f) => f.id === filters.financialYearId)?.label ??
      (currentFy?.id === filters.financialYearId ? currentFy.label : null) ??
      selectedFY?.label ??
      "—"
    );
  }, [filters.financialYearId, allFYs, currentFy, selectedFY?.label]);

  const buildExportBody = useCallback(() => {
    const columns = [
      { label: `${docLabel} No.`, className: "mono" },
      { label: `${docLabel} Date` },
      { label: "Due Date" },
      { label: "Original Amount", align: "right" as const, className: "num" },
      { label: "Adjusted Amount", align: "right" as const, className: "num" },
      { label: "Outstanding Amount", align: "right" as const, className: "num" },
      { label: "Ageing Days", align: "right" as const, className: "num" },
      { label: "Status" },
    ];
    const bodyHtml = rows
      .map((row) => {
        const cells = [
          `<td class="mono">${escapeHtml(row.documentNumber)}</td>`,
          `<td>${escapeHtml(formatOutstandingReportDate(row.invoiceDate))}</td>`,
          `<td>${escapeHtml(formatOutstandingReportDate(row.dueDate))}</td>`,
          `<td class="num">${escapeHtml(formatMoney(row.originalAmount))}</td>`,
          `<td class="num">${escapeHtml(formatMoney(row.adjustedAmount))}</td>`,
          `<td class="num">${escapeHtml(formatMoney(row.outstandingAmount))}</td>`,
          `<td class="num">${escapeHtml(String(Math.max(0, Math.floor(row.ageingDays || 0))))}</td>`,
          `<td>${escapeHtml(row.displayStatus)}</td>`,
        ].join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    return buildTabularReportBodyHtml({ columns, bodyHtml });
  }, [docLabel, rows]);

  const handleExportExcel = async () => {
    if (exporting || rows.length === 0) return;
    setExporting(true);
    try {
      await exportAccountsReportToExcel({
        title: "Bill-wise Outstanding",
        filename: `Bill_wise_Outstanding_${partyCode || "ledger"}`,
        header: {
          reportTitle: "Bill-wise Outstanding",
          financialYear: financialYearLabel,
          dateFrom: filters.startDate,
          dateTo: filters.endDate,
          subtitle: `${partyCode || ""} · ${partyName || ""}`.replace(
            /^ · | · $/g,
            "",
          ),
        },
        bodyHtml: buildExportBody(),
        landscape: true,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (rows.length === 0) return;
    exportAccountsReportToPdf({
      title: "Bill-wise Outstanding",
      filename: `Bill_wise_Outstanding_${partyCode || "ledger"}`,
      header: {
        reportTitle: "Bill-wise Outstanding",
        financialYear: financialYearLabel,
        dateFrom: filters.startDate,
        dateTo: filters.endDate,
        subtitle: `${partyCode || ""} · ${partyName || ""}`.replace(
          /^ · | · $/g,
          "",
        ),
      },
      bodyHtml: buildExportBody(),
      landscape: true,
    });
  };

  const filtersNode = (
    <OutstandingFiltersBar
      value={filters}
      onChange={setFilters}
      onResetPage={resetPage}
      docLabel={docLabel}
      exportDisabled={exporting || rows.length === 0}
      onExportExcel={handleExportExcel}
      onExportPdf={handleExportPdf}
    />
  );

  const tableBlock = (
    <>
      <OutstandingBillsTable
        rows={rows}
        loading={loading}
        error={error}
        docLabel={docLabel}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onView={setDetailRow}
        emptyMessage={
          partyLedgerId
            ? `No ${docLabel.toLowerCase()} outstanding records for the selected filters.`
            : "Party ledger is not linked yet."
        }
      />
      <AccountsTablePagination
        page={page}
        pageSize={limit || ACCOUNTS_DEFAULT_PAGE_SIZE}
        totalRecords={filters.statuses.length > 1 ? rows.length : totalRecords}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        recordLabel="bills"
      />
      <BillOutstandingDetailsSheet
        open={detailRow != null}
        onOpenChange={(open) => {
          if (!open) setDetailRow(null);
        }}
        row={detailRow}
        mode="receivables"
        asOfDate={filters.asOfDate || filters.endDate}
        financialYearId={
          filters.financialYearId !== "all"
            ? filters.financialYearId
            : selectedFY?.id
        }
        docLabel={docLabel}
      />
    </>
  );

  if (pageMode && backHref) {
    return (
      <AccountsPageShell
        breadcrumbs={[
          ...accountsBreadcrumb(
            "Chart of Accounts",
            partyName || "Ledger",
            backHref,
          ),
          { label: "Bill-wise Outstanding" },
        ]}
        title="Bill-wise Outstanding"
        description={`${partyCode || "—"} · ${partyName || "Ledger"} · ${
          partyKind === "customer" ? "Customer" : "Supplier"
        }`}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </Button>
        }
        filters={partyLedgerId ? filtersNode : undefined}
        layout="split"
        className="h-full min-h-0"
      >
        {!partyLedgerId ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Party ledger is not linked yet.
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 border-b border-border/60 bg-white px-4 py-3">
              <OutstandingSummaryCards summary={summary} loading={loading} />
            </div>
            <div className="flex-1 min-h-0 flex flex-col bg-white">
              {tableBlock}
            </div>
          </>
        )}
      </AccountsPageShell>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {filtersNode}
      <OutstandingSummaryCards summary={summary} loading={loading} />
      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
        {tableBlock}
      </div>
    </div>
  );
}
