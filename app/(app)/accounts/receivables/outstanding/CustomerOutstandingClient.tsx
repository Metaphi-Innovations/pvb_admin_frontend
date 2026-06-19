"use client";

import { useMemo } from "react";
import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function CustomerOutstandingClient() {
  const rows = useMemo(() => {
    return computeCustomerOutstanding().map((r) => ({
      customer: r.customerName,
      invoices: r.invoiceCount,
      debit: formatMoney(r.totalDebit),
      credit: formatMoney(r.totalCredit),
      outstanding: formatMoney(r.outstanding),
      lastTxn: r.lastTransactionDate,
    }));
  }, []);

  return (
    <AccountsWorkbenchPage
      section="Receivables"
      title="Customer Outstanding"
      description="Open receivables from Trade Receivables ledgers based on posted sales vouchers."
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
