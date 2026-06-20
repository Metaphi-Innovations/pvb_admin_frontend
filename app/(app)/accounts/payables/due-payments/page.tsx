"use client";

import { useMemo } from "react";
import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";
import { computeDuePayments } from "@/lib/accounts/payables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function DuePaymentsClient() {
  const rows = useMemo(() => {
    return computeDuePayments().map((r) => ({
      party: r.party,
      type: r.type,
      amount: formatMoney(r.amount),
      dueDate: r.dueDate,
    }));
  }, []);

  return (
    <AccountsWorkbenchPage
      section="Purchases"
      title="Due Payments"
      description="Consolidated view of vendor and employee claim payments due."
      columns={[
        { key: "party", label: "Party" },
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount Due", align: "right", money: true },
        { key: "dueDate", label: "Due Date" },
      ]}
      rows={rows}
    />
  );
}
