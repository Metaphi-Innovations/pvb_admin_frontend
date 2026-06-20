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

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Vendor Outstanding")}
      title="Vendor Outstanding"
      description="Vendor-wise open payables from posted purchase bills, debit notes, credit notes and payments."
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
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table min-w-[1400px]">
          <thead className="bg-muted/20 border-b sticky top-0 z-10">
            <tr>
              {[
                "Vendor Name",
                "Vendor Code",
                "GSTIN",
                "Territory",
                "Total Purchase",
                "Paid",
                "Debit Note Adj.",
                "Outstanding",
                "Overdue",
                "Last Purchase",
                "Last Payment",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h || "act"}
                  className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vendorId} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-3 py-2.5 text-xs font-medium">
                  <Link
                    href={`/accounts/payables/outstanding/${r.vendorId}`}
                    className="text-brand-600 hover:underline"
                  >
                    {r.vendorName}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                  {r.vendorCode}
                </td>
                <td className="px-3 py-2.5 text-xs font-mono">{r.gstin}</td>
                <td className="px-3 py-2.5 text-xs">{r.territory}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                  {formatMoney(r.totalPurchaseValue)}
                </td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                  {formatMoney(r.paidAmount)}
                </td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                  {formatMoney(r.debitNoteAdjusted)}
                </td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold">
                  {formatMoney(r.outstanding)}
                </td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums text-red-600">
                  {formatMoney(r.overdueAmount)}
                </td>
                <td className="px-3 py-2.5 text-xs">{r.lastPurchaseDate}</td>
                <td className="px-3 py-2.5 text-xs">{r.lastPaymentDate}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/payables/outstanding/${r.vendorId}`}>
                          View Vendor
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/masters/ledgers/${r.ledgerId}`}>
                          View Vendor Ledger
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/vouchers?tab=payment&vendor=${r.vendorId}`}>
                          Make Payment
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/accounts/vouchers?tab=payment">Allocate Payment</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
