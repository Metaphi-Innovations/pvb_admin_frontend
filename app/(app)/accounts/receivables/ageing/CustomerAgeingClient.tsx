"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  computeCustomerAgeingRows,
  type CustomerAgeingRow,
} from "@/lib/accounts/receivables-data";
import { ensureReceivablesDemoData } from "@/lib/accounts/receivables-demo-seed";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { SortTh } from "@/app/(app)/accounts/components/AccountsUI";
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
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import { cn } from "@/lib/utils";
import {
  exportReceivablesToExcel,
  exportReceivablesToPdf,
  formatExportAmount,
} from "../receivables-export";

type SortKey =
  | "customerName"
  | "totalOutstanding"
  | "bucket0_30"
  | "bucket31_60"
  | "bucket61_90"
  | "bucket91_120"
  | "bucketAbove120";

function AmountCell({ amount }: { amount: number }) {
  return (
    <span className={cn("inline-block whitespace-nowrap tabular-nums", MONEY_CELL_CLASS)}>
      {formatMoney(amount)}
    </span>
  );
}

export default function CustomerAgeingClient() {
  const router = useRouter();
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [financialYear, setFinancialYear] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalOutstanding");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    ensureReceivablesDemoData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [asOnDate, financialYear, customerId, search, pageSize]);

  const customers = useMemo(() => loadCustomers(), []);

  const rows = useMemo(() => {
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

    return [...data].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [asOnDate, customerId, search, sortKey, sortDir]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const handleSort = (key: string) => {
    const k = key as SortKey;
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const exportMeta = {
    reportName: "Customer Ageing",
    asOnDate,
    customer:
      customerId === "all"
        ? "All customers"
        : customers.find((c) => String(c.id) === customerId)?.customerName ?? "—",
    search,
  };

  const handleExcel = () => {
    void exportReceivablesToExcel(
      rows.map((r) => ({
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
      rows.map((r) => [
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

  const columns = useMemo((): AccountsRichColumnDef<CustomerAgeingRow>[] => {
    const sortHeader = (key: SortKey, label: string) => (
      <SortTh
        label={label}
        colKey={key}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        align={key === "customerName" ? "left" : "right"}
      />
    );

    return [
      {
        key: "customerName",
        label: "Customer",
        header: sortHeader("customerName", "Customer"),
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
        header: sortHeader("totalOutstanding", "Total Outstanding"),
        render: (r) => <AmountCell amount={r.totalOutstanding} />,
      },
      {
        key: "bucket0_30",
        label: "0-30 Days",
        align: "right",
        header: sortHeader("bucket0_30", "0-30 Days"),
        render: (r) => <AmountCell amount={r.bucket0_30} />,
      },
      {
        key: "bucket31_60",
        label: "31-60 Days",
        align: "right",
        header: sortHeader("bucket31_60", "31-60 Days"),
        render: (r) => <AmountCell amount={r.bucket31_60} />,
      },
      {
        key: "bucket61_90",
        label: "61-90 Days",
        align: "right",
        header: sortHeader("bucket61_90", "61-90 Days"),
        render: (r) => <AmountCell amount={r.bucket61_90} />,
      },
      {
        key: "bucket91_120",
        label: "91-120 Days",
        align: "right",
        header: sortHeader("bucket91_120", "91-120 Days"),
        render: (r) => <AmountCell amount={r.bucket91_120} />,
      },
      {
        key: "bucketAbove120",
        label: "Above 120 Days",
        align: "right",
        header: sortHeader("bucketAbove120", "Above 120 Days"),
        render: (r) => <AmountCell amount={r.bucketAbove120} />,
      },
    ];
  }, [sortKey, sortDir]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Customer Ageing")}
      title="Customer Ageing"
      description="Customer dues grouped by ageing buckets as on the selected date."
      filters={
        <ReportFilterRow>
          <ReportFinancialYearFilter value={financialYear} onChange={setFinancialYear} />
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
          <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search customer…" />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableToolbar onExcel={handleExcel} onPdf={handlePdf} />
        <AccountsTableScroll>
          <AccountsRichTable
            columns={columns}
            rows={pagedRows}
            minWidth={1000}
            getRowKey={(r) => r.customerId}
            emptyMessage="No ageing balances found."
            onRowClick={(r) => router.push(`/accounts/receivables/outstanding/${r.customerId}`)}
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
