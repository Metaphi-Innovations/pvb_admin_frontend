"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  computeVendorOutstanding,
  getPayablesFilterOptions,
} from "@/lib/accounts/payables-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportVendorFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";

type VendorOutstandingRow = ReturnType<typeof computeVendorOutstanding>[number];

export default function VendorOutstandingClient() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [vendorId, setVendorId] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");

  const filterOptions = useMemo(() => getPayablesFilterOptions(), []);

  const filters = useMemo(
    () => ({
      vendorId: vendorId === "all" ? undefined : Number(vendorId),
      branch: branch === "all" ? undefined : branch,
    }),
    [vendorId, branch],
  );

  const rows = useMemo(() => computeVendorOutstanding(asOnDate, filters), [asOnDate, filters]);

  const columns = useMemo((): AccountsRichColumnDef<VendorOutstandingRow>[] => [
    {
      key: "vendorName",
      label: "Supplier Name",
      render: (r) => (
        <Link href={buildGeneralLedgerHref(r.ledgerId)} className="text-brand-600 hover:underline font-medium">
          {r.vendorName}
        </Link>
      ),
    },
    {
      key: "vendorCode",
      label: "Supplier Code",
      render: (r) => <span className="font-mono text-muted-foreground">{r.vendorCode}</span>,
    },
    {
      key: "gstin",
      label: "GSTIN",
      render: (r) => <span className="font-mono">{r.gstin}</span>,
    },
    { key: "territory", label: "Territory", render: (r) => r.territory },
    {
      key: "totalPurchaseValue",
      label: "Total Purchase",
      align: "right",
      render: (r) => <span className="tabular-nums">{formatMoney(r.totalPurchaseValue)}</span>,
    },
    {
      key: "paidAmount",
      label: "Paid",
      align: "right",
      render: (r) => <span className="tabular-nums">{formatMoney(r.paidAmount)}</span>,
    },
    {
      key: "debitNoteAdjusted",
      label: "Debit Note Adj.",
      align: "right",
      render: (r) => <span className="tabular-nums">{formatMoney(r.debitNoteAdjusted)}</span>,
    },
    {
      key: "outstanding",
      label: "Outstanding",
      align: "right",
      render: (r) => <span className="tabular-nums font-semibold">{formatMoney(r.outstanding)}</span>,
    },
    {
      key: "overdueAmount",
      label: "Overdue",
      align: "right",
      render: (r) => <span className="tabular-nums text-red-600">{formatMoney(r.overdueAmount)}</span>,
    },
    { key: "lastPurchaseDate", label: "Last Purchase", render: (r) => r.lastPurchaseDate },
    { key: "lastPaymentDate", label: "Last Payment", render: (r) => r.lastPaymentDate },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      uppercase: false,
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/accounts/payables/outstanding/${r.vendorId}`}>View Supplier</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={buildGeneralLedgerHref(r.ledgerId)}>View Supplier Ledger</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/accounts/vouchers?tab=payment&vendor=${r.vendorId}`}>Make Payment</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/accounts/vouchers?tab=payment">Allocate Payment</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Supplier Outstanding")}
      title="Supplier Outstanding"
      description="Supplier-wise open payables from posted purchase bills, debit notes, credit notes and payments."
      filters={
        <ReportFilterRow>
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportVendorFilter value={vendorId} onChange={setVendorId} vendors={filterOptions.vendors} />
          <ReportBranchFilter value={branch} onChange={setBranch} options={filterOptions.branches} />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableScroll>
        <AccountsRichTable
          columns={columns}
          rows={rows}
          minWidth={1400}
          getRowKey={(r) => r.vendorId}
          emptyMessage="No supplier outstanding balances for the selected filters."
        />
      </AccountsTableScroll>
    </AccountsPageShell>
  );
}
