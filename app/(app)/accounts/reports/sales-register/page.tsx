"use client";

import { useMemo, useState } from "react";
import { AccountsReportShell } from "@/components/accounts/AccountsReportShell";
import { buildSalesRegisterRows } from "@/lib/accounts/register-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  ReportCustomerFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export default function SalesRegisterPage() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [branch, setBranch] = useState("all");
  const [customerId, setCustomerId] = useState("all");

  const customers = useMemo(() => loadCustomers(), []);

  const source = useMemo(() => {
    let rows = buildSalesRegisterRows(dateFrom, dateTo);
    if (customerId !== "all") {
      const customer = customers.find((c) => String(c.id) === customerId);
      if (customer) rows = rows.filter((r) => r.party === customer.customerName);
    }
    return rows;
  }, [dateFrom, dateTo, customerId, customers, branch]);

  const rows = useMemo(
    () =>
      source.map((r) => ({
        docNo: r.docNo,
        date: r.date,
        party: r.party,
        taxable: formatMoney(r.taxable),
        tax: formatMoney(r.tax),
        total: formatMoney(r.total),
        status: r.status,
      })),
    [source],
  );

  return (
    <AccountsReportShell
      section="Sales"
      title="Sales Register"
      description="Register of sales invoices with taxable value and tax breakup."
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
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      columns={[
        { key: "docNo", label: "Invoice No.", mono: true },
        { key: "date", label: "Date" },
        { key: "party", label: "Customer" },
        { key: "taxable", label: "Taxable", align: "right", money: true },
        { key: "tax", label: "Tax", align: "right", money: true },
        { key: "total", label: "Total", align: "right", money: true },
        { key: "status", label: "Status" },
      ]}
      rows={rows}
    />
  );
}
