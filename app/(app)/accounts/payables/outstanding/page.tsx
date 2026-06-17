"use client";

import { useMemo } from "react";
import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";
import { computeVendorOutstanding } from "@/lib/accounts/payables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function VendorOutstandingClient() {
  const rows = useMemo(() => {
    return computeVendorOutstanding().map((r) => ({
      vendor: r.vendorName,
      bills: r.billCount,
      debit: formatMoney(r.totalDebit),
      credit: formatMoney(r.totalCredit),
      outstanding: formatMoney(r.outstanding),
      lastTxn: r.lastTransactionDate,
    }));
  }, []);

  return (
    <AccountsWorkbenchPage
      section="Payables"
      title="Vendor Outstanding"
      description="Open payables from Trade Payables ledgers based on posted purchase vouchers."
      columns={[
        { key: "vendor", label: "Vendor" },
        { key: "bills", label: "Bills", align: "center" },
        { key: "debit", label: "Total Debit", align: "right", money: true },
        { key: "credit", label: "Total Credit", align: "right", money: true },
        { key: "outstanding", label: "Outstanding", align: "right", money: true },
        { key: "lastTxn", label: "Last Transaction" },
      ]}
      rows={rows}
      emptyMessage="No vendor outstanding balances."
    />
  );
}
