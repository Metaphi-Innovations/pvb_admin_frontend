"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportCustomerFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import { cn } from "@/lib/utils";

type CustomerOutstandingRow = ReturnType<typeof computeCustomerOutstanding>[number];

const AMOUNT_HEADERS = [
  { key: "totalInvoiceAmount" as const, label: "Invoice Total (Incl. GST)" },
  { key: "paidAmount" as const, label: "Paid" },
  { key: "creditNoteAdjusted" as const, label: "Credit Note" },
  { key: "outstanding" as const, label: "Outstanding" },
  { key: "overdueAmount" as const, label: "Overdue" },
];

function formatReportDate(value: string): string {
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

function formatAmount(amount: number): string {
  return `₹${formatMoneyNumber(amount)}`;
}

function AmountValue({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-block whitespace-nowrap", MONEY_CELL_CLASS, className)}>
      {formatAmount(amount)}
    </span>
  );
}

export default function CustomerOutstandingClient() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [customerId, setCustomerId] = useState("all");
  const [branch, setBranch] = useState("all");

  const customers = useMemo(() => loadCustomers(), []);

  const rows = useMemo(() => {
    let data = computeCustomerOutstanding(asOnDate);
    if (customerId !== "all") {
      data = data.filter((r) => String(r.customerId) === customerId);
    }
    if (branch !== "all") {
      data = data.filter((r) => r.branch === branch);
    }
    return data;
  }, [asOnDate, customerId, branch]);

  const columns = useMemo((): AccountsRichColumnDef<CustomerOutstandingRow>[] => {
    const amountCols: AccountsRichColumnDef<CustomerOutstandingRow>[] = AMOUNT_HEADERS.map(
      ({ key, label }) => ({
        key,
        label,
        align: "right" as const,
        render: (r) => {
          const amount = r[key];
          if (key === "outstanding") {
            return <AmountValue amount={amount} className="font-semibold text-foreground" />;
          }
          if (key === "overdueAmount") {
            return (
              <AmountValue
                amount={amount}
                className={amount > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}
              />
            );
          }
          return <AmountValue amount={amount} />;
        },
      }),
    );

    return [
      {
        key: "customerName",
        label: "Customer",
        render: (r) => (
          <Link
            href={buildGeneralLedgerHref(r.ledgerId)}
            className="block text-xs font-medium leading-snug line-clamp-2 break-words text-brand-700 hover:underline"
            title={r.customerName}
          >
            {r.customerName}
          </Link>
        ),
      },
      {
        key: "customerCode",
        label: "Code",
        render: (r) => (
          <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">{r.customerCode}</span>
        ),
      },
      {
        key: "branch",
        label: "Branch",
        render: (r) => (
          <span className="block text-xs text-muted-foreground truncate" title={r.branch}>
            {r.branch}
          </span>
        ),
      },
      ...amountCols,
      {
        key: "lastInvoiceDate",
        label: "Last Invoice",
        render: (r) => (
          <span className="text-muted-foreground whitespace-nowrap tabular-nums">
            {formatReportDate(r.lastInvoiceDate)}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: "action",
        label: "Action",
        align: "right",
        render: (r) => (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-brand-700" asChild>
            <Link href={`/accounts/receivables/outstanding/${r.customerId}`}>View</Link>
          </Button>
        ),
      },
    ];
  }, []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding")}
      title="Customer Outstanding"
      description="Customer-wise open receivables from posted sales invoices, credit notes and receipts."
      filters={
        <ReportFilterRow>
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableScroll>
        <AccountsRichTable
          columns={columns}
          rows={rows}
          minWidth={1120}
          getRowKey={(r) => r.customerId}
          emptyMessage="No customer outstanding balances for the selected filters."
        />
      </AccountsTableScroll>
    </AccountsPageShell>
  );
}
