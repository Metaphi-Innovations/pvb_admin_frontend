"use client";

import { useMemo } from "react";
import { Users, FileText, IndianRupee } from "lucide-react";
import {
  AccountsReportShell,
} from "@/components/accounts/AccountsReportShell";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function CustomerOutstandingReportClient() {
  const data = useMemo(() => computeCustomerOutstanding(), []);

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

  const totalOutstanding = data.reduce((s, r) => s + r.outstanding, 0);
  const totalCustomers = data.length;
  const totalInvoices = data.reduce((s, r) => s + r.invoiceCount, 0);

  return (
    <AccountsReportShell
      title="Customer Outstanding"
      description="Report view of open receivables from Trade Receivables ledgers."
      kpis={[
        { label: "Customers", value: String(totalCustomers), icon: Users },
        { label: "Open Invoices", value: String(totalInvoices), icon: FileText },
        { label: "Total Outstanding", value: formatMoney(totalOutstanding), icon: IndianRupee, accent: true },
      ]}
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
