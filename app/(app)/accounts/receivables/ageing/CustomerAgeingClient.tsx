"use client";

import { useMemo, useState, Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  computeCustomerAgeingRows,
  getCustomerInvoiceAgeing,
  getAgeingFilterOptions,
} from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportCustomerFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";

export default function CustomerAgeingClient() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [customerId, setCustomerId] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);

  const filterOptions = useMemo(() => getAgeingFilterOptions(), []);

  const filters = useMemo(
    () => ({
      customerId: customerId === "all" ? undefined : Number(customerId),
      branch: branch === "all" ? undefined : branch,
    }),
    [customerId, branch],
  );

  const rows = useMemo(
    () => computeCustomerAgeingRows(asOnDate, filters),
    [asOnDate, filters],
  );

  const expandedInvoices = useMemo(() => {
    if (!expandedCustomerId) return [];
    return getCustomerInvoiceAgeing(expandedCustomerId, asOnDate);
  }, [expandedCustomerId, asOnDate]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Customer Ageing")}
      title="Customer Ageing"
      description="Age-wise analysis of customer outstanding by invoice due date."
      filters={
        <ReportFilterRow>
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportCustomerFilter
            value={customerId}
            onChange={setCustomerId}
            customers={filterOptions.customers}
          />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table min-w-[1100px]">
          <thead className="bg-muted/20 border-b sticky top-0 z-10">
            <tr>
              {["Customer", "Current / Not Due", "0–30 Days", "31–60 Days", "61–90 Days", "90+ Days", "Total", "Oldest Invoice", ""].map((h) => (
                <th key={h || "act"} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.customerId}>
                <tr className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-xs font-medium">{r.customerName}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.currentNotDue)}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.bucket0_30)}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.bucket31_60)}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.bucket61_90)}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.bucket90Plus)}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold">{formatMoney(r.totalOutstanding)}</td>
                  <td className="px-3 py-2.5 text-xs">{r.oldestInvoiceDate}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => setExpandedCustomerId(expandedCustomerId === r.customerId ? null : r.customerId)}
                    >
                      Invoice ageing
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCustomerId === r.customerId ? "rotate-90" : ""}`} />
                    </Button>
                  </td>
                </tr>
                {expandedCustomerId === r.customerId && (
                  <tr className="bg-muted/10">
                    <td colSpan={9} className="px-4 py-3">
                      <table className="w-full text-table border border-border/60 rounded-lg overflow-hidden bg-white">
                        <thead className="bg-muted/30">
                          <tr>
                            {["Invoice No", "Invoice Date", "Due Date", "Amount", "Paid", "Outstanding", "Ageing Bucket", "Days Overdue"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {expandedInvoices.map((inv) => (
                            <tr key={inv.invoiceId} className="border-t border-border/40">
                              <td className="px-3 py-2 text-xs font-mono">
                                <Link href={`/accounts/transactions/invoices/${inv.invoiceId}`} className="text-brand-600 hover:underline">{inv.invoiceNo}</Link>
                              </td>
                              <td className="px-3 py-2 text-xs">{inv.invoiceDate}</td>
                              <td className="px-3 py-2 text-xs">{inv.dueDate}</td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums">{formatMoney(inv.invoiceAmount)}</td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums">{formatMoney(inv.paidAmount)}</td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums font-semibold">{formatMoney(inv.outstanding)}</td>
                              <td className="px-3 py-2 text-xs">{inv.ageingBucket}</td>
                              <td className="px-3 py-2 text-xs text-center tabular-nums">{inv.daysOverdue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
