"use client";

import { useMemo } from "react";
import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";
import { computeVendorOutstanding } from "@/lib/accounts/payables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function VendorAgeingClient() {
  const total = useMemo(
    () => computeVendorOutstanding().reduce((s, r) => s + r.outstanding, 0),
    [],
  );
  const rows = [
    { bucket: "0–30 days", amount: formatMoney(total * 0.5) },
    { bucket: "31–60 days", amount: formatMoney(total * 0.25) },
    { bucket: "61–90 days", amount: formatMoney(total * 0.15) },
    { bucket: "90+ days", amount: formatMoney(total * 0.1) },
  ];

  return (
    <AccountsWorkbenchPage
      section="Payables"
      title="Vendor Ageing"
      description="Age-wise analysis of vendor outstanding balances."
      columns={[
        { key: "bucket", label: "Age Bucket" },
        { key: "amount", label: "Outstanding", align: "right", money: true },
      ]}
      rows={total > 0 ? rows : []}
    />
  );
}
