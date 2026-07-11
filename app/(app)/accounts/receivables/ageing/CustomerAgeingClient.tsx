"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AgeingBreakpointPanel } from "@/components/accounts/AgeingBreakpointPanel";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  breakpointsToDraft,
  DEFAULT_AGEING_BREAKPOINTS,
  getAgeingBucketLabels,
  getVisibleAgeingBucketIndices,
  ageingBucketColumnKey,
  type AgeingBreakpoints,
} from "@/lib/accounts/ageing-breakpoints";
import {
  computeCustomerAgeingRows,
  type CustomerAgeingRow,
} from "@/lib/accounts/receivables-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import {
  AccountsColumnFilterProvider,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportFinancialYearFilter,
  ReportCustomerFilter,
  ReportSalespersonFilter,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { cn } from "@/lib/utils";
import {
  exportReceivablesToExcel,
  exportReceivablesToPdf,
  formatExportAmount,
} from "../receivables-export";

function AmountCell({ amount }: { amount: number }) {
  return (
    <span className={cn("inline-block whitespace-nowrap tabular-nums", MONEY_CELL_CLASS)}>
      {formatMoney(amount)}
    </span>
  );
}

function buildColumns(
  bucketLabels: string[],
  visibleBucketIndices: number[],
): AccountsRichColumnDef<CustomerAgeingRow>[] {
  const bucketColumns: AccountsRichColumnDef<CustomerAgeingRow>[] = visibleBucketIndices.map(
    (index) => ({
      key: ageingBucketColumnKey(index),
      label: bucketLabels[index] ?? "",
      align: "right" as const,
      filterType: "amount" as const,
      render: (r) => <AmountCell amount={r.buckets[index] ?? 0} />,
    }),
  );

  return [
    {
      key: "customerName",
      label: "Customer Name",
      filterType: "text",
      render: (r) => (
        <Link
          href={`/accounts/receivables/outstanding/${r.customerId}`}
          className="text-xs font-medium text-brand-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {r.customerName}
        </Link>
      ),
    },
    {
      key: "salesExecutive",
      label: "Salesperson",
      filterType: "text",
      render: (r) => <span className="text-xs">{r.salesExecutive || "—"}</span>,
    },
    {
      key: "totalOutstanding",
      label: "Total Outstanding",
      align: "right",
      filterType: "amount",
      render: (r) => <AmountCell amount={r.totalOutstanding} />,
    },
    ...bucketColumns,
  ];
}

function buildColumnConfig(visibleBucketIndices: number[]): Record<string, { type: "text" | "amount" }> {
  const config: Record<string, { type: "text" | "amount" }> = {
    customerName: { type: "text" },
    salesExecutive: { type: "text" },
    totalOutstanding: { type: "amount" },
  };
  for (const index of visibleBucketIndices) {
    config[ageingBucketColumnKey(index)] = { type: "amount" };
  }
  return config;
}

function AgeingExport({
  exportMeta,
  bucketLabels,
  visibleBucketIndices,
}: {
  exportMeta: {
    reportName: string;
    asOnDate: string;
    customer: string;
    search: string;
    ageingBuckets: string;
  };
  bucketLabels: string[];
  visibleBucketIndices: number[];
}) {
  const visible = useAccountsFilteredRows<CustomerAgeingRow>([]);
  const exportBucketLabels = visibleBucketIndices.map((i) => bucketLabels[i] ?? "");
  const headers = ["Customer Name", "Salesperson", "Total Outstanding", ...exportBucketLabels];

  const handleExcel = () => {
    void exportReceivablesToExcel(
      visible.map((r) => {
        const row: Record<string, string | number> = {
          "Customer Name": r.customerName,
          Salesperson: r.salesExecutive || "—",
          "Total Outstanding": formatExportAmount(r.totalOutstanding),
        };
        visibleBucketIndices.forEach((index) => {
          const label = bucketLabels[index] ?? "";
          row[label] = formatExportAmount(r.buckets[index] ?? 0);
        });
        return row;
      }),
      exportMeta,
      "customer_ageing",
    );
  };

  const handlePdf = () => {
    exportReceivablesToPdf(
      headers,
      visible.map((r) => [
        r.customerName,
        r.salesExecutive || "—",
        formatExportAmount(r.totalOutstanding),
        ...visibleBucketIndices.map((index) => formatExportAmount(r.buckets[index] ?? 0)),
      ]),
      exportMeta,
      { numericColumnFrom: 2 },
    );
  };

  return <AccountsExportMenu onExcel={handleExcel} onPdf={handlePdf} disabled={visible.length === 0} />;
}

function CustomerAgeingTable({
  columns,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  columns: AccountsRichColumnDef<CustomerAgeingRow>[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<CustomerAgeingRow>([]);

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
          columns={columns}
          rows={pagedRows}
          minWidth={1000}
          getRowKey={(r) => r.customerId}
          emptyMessage="No records found."
          onRowClick={(r) => router.push(`/accounts/receivables/outstanding/${r.customerId}`)}
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

export default function CustomerAgeingClient() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [financialYear, setFinancialYear] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [salesperson, setSalesperson] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [appliedBreakpoints, setAppliedBreakpoints] = useState<AgeingBreakpoints>(DEFAULT_AGEING_BREAKPOINTS);
  const [breakpointDraft, setBreakpointDraft] = useState<string[]>(() =>
    breakpointsToDraft(DEFAULT_AGEING_BREAKPOINTS),
  );
  const [breakpointError, setBreakpointError] = useState<string | null>(null);

  const sectionRefresh = useAccountsSectionRefresh();
  const customers = useMemo(() => loadCustomers(), []);

  const bucketLabels = useMemo(
    () => getAgeingBucketLabels(appliedBreakpoints),
    [appliedBreakpoints],
  );

  useEffect(() => {
    setPage(1);
  }, [asOnDate, financialYear, customerId, salesperson, search, pageSize, appliedBreakpoints]);

  const toolbarFiltered = useMemo(() => {
    let data = computeCustomerAgeingRows(
      asOnDate,
      {
        customerId: customerId === "all" ? undefined : Number(customerId),
        salesExecutive: salesperson === "all" ? undefined : salesperson,
      },
      appliedBreakpoints,
    );

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerCode.toLowerCase().includes(q) ||
          r.salesExecutive.toLowerCase().includes(q),
      );
    }

    return data;
  }, [asOnDate, customerId, salesperson, search, sectionRefresh, appliedBreakpoints]);

  const salespersonOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of computeCustomerAgeingRows(asOnDate, {}, appliedBreakpoints)) {
      const name = row.salesExecutive?.trim();
      if (name && name !== "—") names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [asOnDate, appliedBreakpoints, sectionRefresh]);

  const visibleBucketIndices = useMemo(
    () => getVisibleAgeingBucketIndices(toolbarFiltered, appliedBreakpoints.length),
    [toolbarFiltered, appliedBreakpoints.length],
  );

  const columns = useMemo(
    () => buildColumns(bucketLabels, visibleBucketIndices),
    [bucketLabels, visibleBucketIndices],
  );

  const getCellValue = useCallback((row: CustomerAgeingRow, key: string) => {
    const bucketMatch = /^bucket-(\d+)$/.exec(key);
    if (bucketMatch) {
      const index = Number(bucketMatch[1]);
      return row.buckets[index] ?? 0;
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const visibleBucketLabels = useMemo(
    () => visibleBucketIndices.map((i) => bucketLabels[i] ?? ""),
    [visibleBucketIndices, bucketLabels],
  );

  const exportMeta = useMemo(
    () => ({
      reportName: "Customer Ageing",
      asOnDate,
      customer:
        customerId === "all"
          ? "All customers"
          : (customers.find((c) => String(c.id) === customerId)?.customerName ?? "—"),
      search,
      ageingBuckets: visibleBucketLabels.join(" · "),
    }),
    [asOnDate, customerId, customers, search, visibleBucketLabels],
  );

  return (
    <AccountsColumnFilterProvider
      rows={toolbarFiltered}
      getCellValue={getCellValue}
      columnConfig={buildColumnConfig(visibleBucketIndices)}
      defaultSortKey="totalOutstanding"
      defaultSortDir="desc"
    >
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Receivables", "Customer Ageing")}
        title="Customer Ageing"
        description="Customer dues grouped by configurable ageing breakpoints as on the selected date."
        filters={
          <div className="space-y-2">
            <AgeingBreakpointPanel
              draft={breakpointDraft}
              onDraftChange={setBreakpointDraft}
              onApply={setAppliedBreakpoints}
              error={breakpointError}
              onErrorChange={setBreakpointError}
            />
            <ReportFilterRow
              end={
                <AgeingExport
                  exportMeta={exportMeta}
                  bucketLabels={bucketLabels}
                  visibleBucketIndices={visibleBucketIndices}
                />
              }
            >
              <ReportFinancialYearFilter value={financialYear} onChange={setFinancialYear} />
              <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
              <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
              <ReportSalespersonFilter
                value={salesperson}
                onChange={setSalesperson}
                salespeople={salespersonOptions}
              />
              <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search customer…" />
            </ReportFilterRow>
          </div>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <CustomerAgeingTable
          columns={columns}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}
