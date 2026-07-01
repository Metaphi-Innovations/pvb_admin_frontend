"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { loadReceiptAllocationRecords } from "@/lib/accounts/receivables-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportCustomerFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export default function ReceiptAllocationClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [customerId, setCustomerId] = useState("all");

  const records = useMemo(() => loadReceiptAllocationRecords(), []);
  const customers = useMemo(() => loadCustomers(), []);

  const rows = useMemo(() => {
    return records.filter((r) => {
      if (dateFrom && r.receiptDate < dateFrom) return false;
      if (dateTo && r.receiptDate > dateTo) return false;
      if (customerId !== "all" && String(r.customerId) !== customerId) return false;
      return true;
    });
  }, [records, dateFrom, dateTo, customerId]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Receipt Allocation")}
      title="Receipt Allocation"
      description="Allocate customer receipt vouchers against open sales invoices."
      filters={
        <ReportFilterRow>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="accounts-table w-full text-table min-w-[1100px]">
          <thead className="border-b">
            <tr>
              {["Receipt No", "Date", "Customer", "Receipt Amt", "Allocated", "Unallocated", "Bank / Cash", "Reference", "Status", ""].map((h) => (
                <th key={h || "act"} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.voucherId} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-3 py-2.5 text-xs font-mono font-semibold">{r.receiptNo}</td>
                <td className="px-3 py-2.5 text-xs">{r.receiptDate}</td>
                <td className="px-3 py-2.5 text-xs">{r.customerName}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.receiptAmount)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.allocatedAmount)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold">{formatMoney(r.unallocatedAmount)}</td>
                <td className="px-3 py-2.5 text-xs">{r.bankAccount}</td>
                <td className="px-3 py-2.5 text-xs font-mono">{r.referenceNo}</td>
                <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/receivables/receipt-allocation/${r.voucherId}`}>Allocate</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/vouchers/view/${r.voucherId}`}>View Receipt</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/receivables/outstanding/${r.customerId}`}>View Customer Outstanding</Link>
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
