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
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import {
  exportSupplierAgeingToExcel,
  exportSupplierAgeingToPdf,
} from "@/lib/accounts/payables-export";
import { formatMoney, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import {
  AccountsColumnFilterProvider,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportFinancialYearFilter,
  ReportVendorFilter,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { cn } from "@/lib/utils";

const COLUMNS: AccountsRichColumnDef<VendorAgeingRow>[] = [
  {
    key: "vendorName",
    label: "Supplier",
    filterType: "text",
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
  {
    key: "totalOutstanding",
    label: "Total Outstanding",
    align: "right",
    filterType: "amount",
    render: (r) => (
      <span className={cn(MONEY_CELL_CLASS, "font-semibold text-foreground")}>
        {formatMoney(r.totalOutstanding)}
      </span>
    ),
  },
  {
    key: "bucket0_30",
    label: "0-30 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.bucket0_30)}</span>,
  },
  {
    key: "bucket31_60",
    label: "31-60 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.bucket31_60)}</span>,
  },
  {
    key: "bucket61_90",
    label: "61-90 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.bucket61_90)}</span>,
  },
  {
    key: "bucket91_120",
    label: "91-120 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.bucket91_120)}</span>,
  },
  {
    key: "bucketAbove120",
    label: "Above 120 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.bucketAbove120)}</span>,
  },
];

function AgeingExport({
  exportMeta,
  exporting,
  onExportingChange,
}: {
  exportMeta: Parameters<typeof exportSupplierAgeingToExcel>[1];
  exporting: boolean;
  onExportingChange: (v: boolean) => void;
}) {
  const visible = useAccountsFilteredRows<VendorAgeingRow>([]);

  const handleExportExcel = useCallback(async () => {
    onExportingChange(true);
    try {
      await exportSupplierAgeingToExcel(visible, exportMeta);
    } finally {
      onExportingChange(false);
    }
  }, [visible, exportMeta, onExportingChange]);

  const handleExportPdf = useCallback(() => {
    exportSupplierAgeingToPdf(visible, exportMeta);
  }, [visible, exportMeta]);

  return (
    <AccountsExportMenu
      onExcel={handleExportExcel}
      onPdf={handleExportPdf}
      disabled={exporting || visible.length === 0}
    />
  );
}

function VendorAgeingTable({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<VendorAgeingRow>([]);

  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsRichTable
          columns={COLUMNS}
          rows={pagedRows}
          minWidth={1100}
          getRowKey={(r) => r.vendorId}
          emptyMessage="No records found."
          onRowClick={(r) => router.push(`/accounts/payables/outstanding/${r.vendorId}`)}
        />
      </AccountsTableScroll>
      {visible.length > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

export default function VendorAgeingClient() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [financialYearId, setFinancialYearId] = useState("all");
  const [vendorId, setVendorId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

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

  const toolbarFiltered = useMemo(() => {
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

  const getCellValue = useCallback(
    (row: VendorAgeingRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

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

  return (
    <AccountsColumnFilterProvider
      rows={toolbarFiltered}
      getCellValue={getCellValue}
      columnConfig={{
        vendorName: { type: "text" },
        totalOutstanding: { type: "amount" },
        bucket0_30: { type: "amount" },
        bucket31_60: { type: "amount" },
        bucket61_90: { type: "amount" },
        bucket91_120: { type: "amount" },
        bucketAbove120: { type: "amount" },
      }}
      defaultSortKey="totalOutstanding"
      defaultSortDir="desc"
    >
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Payables", "Supplier Ageing")}
        title="Supplier Ageing"
        description="Supplier outstanding grouped by ageing buckets as on the selected date."
        filters={
          <ReportFilterRow
            end={
              <AgeingExport
                exportMeta={exportMeta}
                exporting={exporting}
                onExportingChange={setExporting}
              />
            }
          >
            <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
            <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
            <ReportVendorFilter value={vendorId} onChange={setVendorId} vendors={filterOptions.vendors} />
            <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search supplier…" />
          </ReportFilterRow>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <VendorAgeingTable
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}
