"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
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

const COLUMNS: AccountsRichColumnDef<CustomerAgeingRow>[] = [
  {
    key: "customerName",
    label: "Customer",
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
    key: "totalOutstanding",
    label: "Total Outstanding",
    align: "right",
    filterType: "amount",
    render: (r) => <AmountCell amount={r.totalOutstanding} />,
  },
  {
    key: "bucket0_30",
    label: "0-30 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <AmountCell amount={r.bucket0_30} />,
  },
  {
    key: "bucket31_60",
    label: "31-60 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <AmountCell amount={r.bucket31_60} />,
  },
  {
    key: "bucket61_90",
    label: "61-90 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <AmountCell amount={r.bucket61_90} />,
  },
  {
    key: "bucket91_120",
    label: "91-120 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <AmountCell amount={r.bucket91_120} />,
  },
  {
    key: "bucketAbove120",
    label: "Above 120 Days",
    align: "right",
    filterType: "amount",
    render: (r) => <AmountCell amount={r.bucketAbove120} />,
  },
];

function AgeingExport({
  exportMeta,
}: {
  exportMeta: {
    reportName: string;
    asOnDate: string;
    customer: string;
    search: string;
  };
}) {
  const visible = useAccountsFilteredRows<CustomerAgeingRow>([]);

  const handleExcel = () => {
    void exportReceivablesToExcel(
      visible.map((r) => ({
        Customer: r.customerName,
        "Total Outstanding": formatExportAmount(r.totalOutstanding),
        "0-30 Days": formatExportAmount(r.bucket0_30),
        "31-60 Days": formatExportAmount(r.bucket31_60),
        "61-90 Days": formatExportAmount(r.bucket61_90),
        "91-120 Days": formatExportAmount(r.bucket91_120),
        "Above 120 Days": formatExportAmount(r.bucketAbove120),
      })),
      exportMeta,
      "customer_ageing",
    );
  };

  const handlePdf = () => {
    exportReceivablesToPdf(
      [
        "Customer",
        "Total Outstanding",
        "0-30 Days",
        "31-60 Days",
        "61-90 Days",
        "91-120 Days",
        "Above 120 Days",
      ],
      visible.map((r) => [
        r.customerName,
        formatExportAmount(r.totalOutstanding),
        formatExportAmount(r.bucket0_30),
        formatExportAmount(r.bucket31_60),
        formatExportAmount(r.bucket61_90),
        formatExportAmount(r.bucket91_120),
        formatExportAmount(r.bucketAbove120),
      ]),
      exportMeta,
    );
  };

  return <AccountsExportMenu onExcel={handleExcel} onPdf={handlePdf} disabled={visible.length === 0} />;
}

function CustomerAgeingTable({
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
          columns={COLUMNS}
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setPage(1);
  }, [asOnDate, financialYear, customerId, search, pageSize]);

  const customers = useMemo(() => loadCustomers(), []);

  const toolbarFiltered = useMemo(() => {
    let data = computeCustomerAgeingRows(asOnDate, {
      customerId: customerId === "all" ? undefined : Number(customerId),
    });

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerCode.toLowerCase().includes(q),
      );
    }

    return data;
  }, [asOnDate, customerId, search, sectionRefresh]);

  const getCellValue = useCallback(
    (row: CustomerAgeingRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
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
    }),
    [asOnDate, customerId, customers, search],
  );

  return (
    <AccountsColumnFilterProvider
      rows={toolbarFiltered}
      getCellValue={getCellValue}
      columnConfig={{
        customerName: { type: "text" },
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
        breadcrumbs={accountsBreadcrumb("Receivables", "Customer Ageing")}
        title="Customer Ageing"
        description="Customer dues grouped by ageing buckets as on the selected date."
        filters={
          <ReportFilterRow end={<AgeingExport exportMeta={exportMeta} />}>
            <ReportFinancialYearFilter value={financialYear} onChange={setFinancialYear} />
            <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
            <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
            <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search customer…" />
          </ReportFilterRow>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <CustomerAgeingTable
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}
