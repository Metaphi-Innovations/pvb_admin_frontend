"use client";

import { useMemo } from "react";
import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";
import { computeCustomerAgeing } from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function CustomerAgeingClient() {
  const rows = useMemo(() => {
    return computeCustomerAgeing().map((b) => ({
      bucket: b.label,
      amount: formatMoney(b.amount),
    }));
  }, []);

  return (
    <AccountsWorkbenchPage
      section="Sales"
      title="Customer Ageing"
      description="Age-wise analysis of customer outstanding balances."
      columns={[
        { key: "bucket", label: "Age Bucket" },
        { key: "amount", label: "Outstanding", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
