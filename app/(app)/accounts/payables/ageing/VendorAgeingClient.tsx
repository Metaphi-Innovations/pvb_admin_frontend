"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  computeVendorAgeingRows,
  getPayablesFilterOptions,
  type VendorAgeingRow,
} from "@/lib/accounts/payables-data";
import { ensurePayablesDemoOnPageLoad } from "@/lib/accounts/payables-demo-seed";
import {
  exportSupplierAgeingToExcel,
  exportSupplierAgeingToPdf,
} from "@/lib/accounts/payables-export";
import { formatMoney, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportFinancialYearFilter,
  ReportVendorFilter,
} from "@/components/accounts/ReportFilters";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import { cn } from "@/lib/utils";

export default function VendorAgeingClient() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [financialYearId, setFinancialYearId] = useState("all");
  const [vendorId, setVendorId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    ensurePayablesDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    const years = loadFinancialYears();
    const activeFy = years.find((fy) => fy.id === activeFyId) ?? years.find((fy) => fy.status === "active");
    if (activeFy) setFinancialYearId(String(activeFy.id));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [asOnDate, financialYearId, vendorId, search, pageSize, refreshKey]);

  const filterOptions = useMemo(() => getPayablesFilterOptions(), [refreshKey]);

  const rows = useMemo(() => {
    let data = computeVendorAgeingRows(asOnDate, {
      vendorId: vendorId === "all" ? undefined : Number(vendorId),
    });
    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (r) =>
          r.vendorName.toLowerCase().includes(q) || r.vendorCode.toLowerCase().includes(q),
      );
    }
    return data;
  }, [asOnDate, vendorId, search, refreshKey]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const exportMeta = useMemo(() => {
    const fy =
      financialYearId === "all"
        ? "All years"
        : (loadFinancialYears().find((y) => String(y.id) === financialYearId)?.name ?? "All years");
    const vendor =
      vendorId === "all"
        ? "All suppliers"
        : (filterOptions.vendors.find((v) => String(v.id) === vendorId)?.vendorName ?? "All suppliers");
    return {
      reportName: "Supplier Ageing",
      financialYear: fy,
      asOnDate,
      supplier: vendor,
      paymentStatus: "—",
      search,
    };
  }, [financialYearId, vendorId, search, asOnDate, filterOptions.vendors]);

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      await exportSupplierAgeingToExcel(rows, exportMeta);
    } finally {
      setExporting(false);
    }
  }, [rows, exportMeta]);

  const handleExportPdf = useCallback(() => {
    exportSupplierAgeingToPdf(rows, exportMeta);
  }, [rows, exportMeta]);

  const amountCol = (
    key: keyof Pick<
      VendorAgeingRow,
      "totalOutstanding" | "bucket0_30" | "bucket31_60" | "bucket61_90" | "bucket91_120" | "bucketAbove120"
    >,
    label: string,
    bold?: boolean,
  ): AccountsRichColumnDef<VendorAgeingRow> => ({
    key,
    label,
    align: "right",
    render: (r) => (
      <span className={cn(MONEY_CELL_CLASS, bold && "font-semibold text-foreground")}>
        {formatMoney(r[key])}
      </span>
    ),
  });

  const columns = useMemo((): AccountsRichColumnDef<VendorAgeingRow>[] => [
    {
      key: "vendorName",
      label: "Supplier",
      render: (r) => (
        <Link
          href={`/accounts/payables/outstanding/${r.vendorId}`}
          className="text-xs font-medium text-brand-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {r.vendorName}
        </Link>
      ),
    },
    amountCol("totalOutstanding", "Total Outstanding", true),
    amountCol("bucket0_30", "0-30 Days"),
    amountCol("bucket31_60", "31-60 Days"),
    amountCol("bucket61_90", "61-90 Days"),
    amountCol("bucket91_120", "91-120 Days"),
    amountCol("bucketAbove120", "Above 120 Days"),
  ], []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Supplier Ageing")}
      title="Supplier Ageing"
      description="Supplier outstanding grouped by ageing buckets as on the selected date."
      filters={
        <ReportFilterRow>
          <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportVendorFilter value={vendorId} onChange={setVendorId} vendors={filterOptions.vendors} />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search supplier…" }}
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          exportDisabled={exporting || rows.length === 0}
        />
        <AccountsTableScroll>
          <AccountsRichTable
            columns={columns}
            rows={pagedRows}
            minWidth={1100}
            getRowKey={(r) => r.vendorId}
            emptyMessage="No supplier ageing data for the selected filters."
            onRowClick={(r) => router.push(`/accounts/payables/outstanding/${r.vendorId}`)}
          />
        </AccountsTableScroll>
        {rows.length > 0 && (
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </AccountsPageShell>
  );
}
