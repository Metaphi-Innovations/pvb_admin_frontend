"use client";

import { useMemo, useState } from "react";
import { AccountsReportShell } from "@/components/accounts/AccountsReportShell";
import {
  computeCustomerOutstanding,
  filterCustomerOutstandingRows,
  type ReceivableStatus,
} from "@/lib/accounts/receivables-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportCustomerMultiFilter,
  ReportBranchMultiFilter,
  ReportSalespersonMultiFilter,
  ReportStatusMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";

const PAYMENT_STATUS_OPTIONS: { value: ReceivableStatus; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Received" },
  { value: "unpaid", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];

export default function CustomerOutstandingReportClient() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [salespersonIds, setSalespersonIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const customers = useMemo(() => loadCustomers(), []);

  const customerSelectOptions = useMemo(
    () => customers.map((c) => ({ value: String(c.id), label: c.customerName })),
    [customers],
  );

  const salespeople = useMemo(() => {
    const names = new Set<string>();
    for (const c of customers) {
      if (c.salesManName?.trim()) names.add(c.salesManName.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const moreFiltersActive = countActiveMoreFilters({ status: statuses });

  const data = useMemo(() => {
    const rows = computeCustomerOutstanding(asOnDate);
    return filterCustomerOutstandingRows(rows, {
      customerIds,
      branch: branchIds,
      salespersons: salespersonIds,
      statuses,
    });
  }, [asOnDate, customerIds, branchIds, salespersonIds, statuses]);

  const rows = useMemo(
    () =>
      data.map((r) => ({
        customer: r.customerName,
        invoices: r.invoiceCount,
        debit: formatMoney(r.totalDebit),
        credit: formatMoney(r.totalCredit),
        outstanding: formatMoney(r.outstanding),
        lastTxn: r.lastTransactionDate,
      })),
    [data],
  );

  const filterSummaryItems = useMemo(
    () =>
      [
        buildBranchFilterSummary(branchIds, () => setBranchIds([])),
        buildEntityFilterSummary(
          "customer",
          "Customers",
          customerIds,
          customerSelectOptions,
          () => setCustomerIds([]),
        ),
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [branchIds, customerIds, customerSelectOptions],
  );

  return (
    <AccountsReportShell
      title="Customer Outstanding"
      description="Report view of open receivables from Sundry Debtors ledgers."
      filters={
        <>
          <ReportFilterRow>
            <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
            <ReportBranchMultiFilter values={branchIds} onChange={setBranchIds} />
            <ReportCustomerMultiFilter
              values={customerIds}
              onChange={setCustomerIds}
              customers={customers}
            />
            <ReportSalespersonMultiFilter
              values={salespersonIds}
              onChange={setSalespersonIds}
              salespeople={salespeople}
            />
            <ReportMoreFilters activeCount={moreFiltersActive}>
              <ReportStatusMultiFilter
                values={statuses}
                onChange={setStatuses}
                options={PAYMENT_STATUS_OPTIONS}
                label="Payment Status"
              />
            </ReportMoreFilters>
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      columns={[
        { key: "customer", label: "Customer" },
        { key: "invoices", label: "Invoices", align: "center" },
        { key: "debit", label: "Total Debit", align: "right", money: true },
        { key: "credit", label: "Total Credit", align: "right", money: true },
        { key: "outstanding", label: "Outstanding", align: "right", money: true },
        { key: "lastTxn", label: "Last Transaction" },
      ]}
      rows={rows}
      emptyMessage="No customer outstanding balances."
    />
  );
}
