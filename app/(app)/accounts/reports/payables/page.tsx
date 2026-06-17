"use client";

import { useMemo } from "react";
import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";
import { computeVendorOutstanding } from "@/lib/accounts/payables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function VendorOutstandingReportPage() {
  const rows = useMemo(() => {
    return computeVendorOutstanding().map((r) => ({
      vendor: r.vendorName,
      bills: r.billCount,
      outstanding: formatMoney(r.outstanding),
      lastTxn: r.lastTransactionDate,
    }));
  }, []);

  return (
    <AccountsWorkbenchPage
      section="Reports"
      title="Vendor Outstanding"
      description="Report view of vendor payables from Trade Payables ledgers."
      columns={[
        { key: "vendor", label: "Vendor" },
        { key: "bills", label: "Bills", align: "center" },
        { key: "outstanding", label: "Outstanding", align: "right", money: true },
        { key: "lastTxn", label: "Last Transaction" },
      ]}
      rows={rows}
      emptyMessage="No vendor outstanding balances."
    />
  );
}
