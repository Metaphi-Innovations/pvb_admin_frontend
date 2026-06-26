"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  computeVendorAgeingRows,
  getVendorBillAgeing,
  getPayablesFilterOptions,
} from "@/lib/accounts/payables-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportVendorFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";

export default function VendorAgeingClient() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [vendorId, setVendorId] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [expandedVendorId, setExpandedVendorId] = useState<number | null>(null);

  const filterOptions = useMemo(() => getPayablesFilterOptions(), []);

  const filters = useMemo(
    () => ({
      vendorId: vendorId === "all" ? undefined : Number(vendorId),
      branch: branch === "all" ? undefined : branch,
    }),
    [vendorId, branch],
  );

  const rows = useMemo(
    () => computeVendorAgeingRows(asOnDate, filters),
    [asOnDate, filters],
  );

  const expandedBills = useMemo(() => {
    if (!expandedVendorId) return [];
    return getVendorBillAgeing(expandedVendorId, asOnDate);
  }, [expandedVendorId, asOnDate]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Supplier Ageing")}
      title="Supplier Ageing"
      description="Age-wise analysis of supplier payables by purchase bill due date."
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
        <table className="w-full text-table min-w-[1200px]">
          <thead className="bg-muted/20 border-b sticky top-0 z-10">
            <tr>
              {[
                "Supplier Name",
                "Current",
                "0–30 Days",
                "31–60 Days",
                "61–90 Days",
                "90+ Days",
                "Total Outstanding",
                "Oldest Bill Date",
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
              <Fragment key={r.vendorId}>
                <tr className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-xs font-medium">
                    <Link
                      href={`/accounts/payables/outstanding/${r.vendorId}`}
                      className="text-brand-600 hover:underline"
                    >
                      {r.vendorName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                    {formatMoney(r.currentNotDue)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                    {formatMoney(r.bucket0_30)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                    {formatMoney(r.bucket31_60)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                    {formatMoney(r.bucket61_90)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                    {formatMoney(r.bucket90Plus)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold">
                    {formatMoney(r.totalOutstanding)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{r.oldestBillDate}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      onClick={() =>
                        setExpandedVendorId(
                          expandedVendorId === r.vendorId ? null : r.vendorId,
                        )
                      }
                    >
                      Bill ageing
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${expandedVendorId === r.vendorId ? "rotate-90" : ""}`}
                      />
                    </Button>
                  </td>
                </tr>
                {expandedVendorId === r.vendorId && (
                  <tr className="bg-muted/10">
                    <td colSpan={9} className="px-4 py-3">
                      <table className="w-full text-table border border-border/60 rounded-lg overflow-hidden bg-white">
                        <thead className="bg-muted/30">
                          <tr>
                            {[
                              "Bill No",
                              "Bill Date",
                              "Due Date",
                              "Bill Amount",
                              "Paid",
                              "Outstanding",
                              "Days Overdue",
                              "Ageing Bucket",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {expandedBills.map((bill) => (
                            <tr key={bill.billId} className="border-t border-border/40">
                              <td className="px-3 py-2 text-xs font-mono">
                                <Link
                                  href={`/accounts/purchase-invoices/${bill.billId}`}
                                  className="text-brand-600 hover:underline"
                                >
                                  {bill.billNo}
                                </Link>
                              </td>
                              <td className="px-3 py-2 text-xs">{bill.billDate}</td>
                              <td className="px-3 py-2 text-xs">{bill.dueDate}</td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums">
                                {formatMoney(bill.billAmount)}
                              </td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums">
                                {formatMoney(bill.paidAmount)}
                              </td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums font-semibold">
                                {formatMoney(bill.outstanding)}
                              </td>
                              <td className="px-3 py-2 text-xs text-center tabular-nums">
                                {bill.daysOverdue}
                              </td>
                              <td className="px-3 py-2 text-xs">{bill.ageingBucket}</td>
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
