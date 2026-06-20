"use client";

import { useMemo, useState } from "react";
import { AccountsReportShell } from "@/components/accounts/AccountsReportShell";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportCustomerFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";

export default function CustomerOutstandingReportClient() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [customerId, setCustomerId] = useState("all");
  const [branch, setBranch] = useState("all");

  const customers = useMemo(() => loadCustomers(), []);

  const data = useMemo(() => {
    let rows = computeCustomerOutstanding(asOnDate);
    if (customerId !== "all") {
      rows = rows.filter((r) => String(r.customerId) === customerId);
    }
    if (branch !== "all") {
      rows = rows.filter((r) => r.branch === branch);
    }
    return rows;
  }, [asOnDate, customerId, branch]);

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

  return (
    <AccountsReportShell
      title="Customer Outstanding"
      description="Report view of open receivables from Trade Receivables ledgers."
      filters={
        <ReportFilterRow>
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
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
