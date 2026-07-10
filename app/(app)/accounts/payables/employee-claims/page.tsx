"use client";

import { useMemo } from "react";
import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";
import { computeEmployeeClaimsPayable } from "@/lib/accounts/payables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function EmployeeClaimsPayableClient() {
  const rows = useMemo(() => {
    return computeEmployeeClaimsPayable().map((r) => ({
      employee: r.employeeName,
      claim: r.claimNo,
      amount: formatMoney(r.amount),
      dueDate: r.dueDate,
      status: r.status,
    }));
  }, []);

  return (
    <AccountsWorkbenchPage
      section="Purchases"
      title="Employee Claims Payable"
      description="Approved HR claims posted to Expenses Payable ledgers awaiting payment."
      columns={[
        { key: "employee", label: "Employee" },
        { key: "claim", label: "Claim No.", mono: true },
        { key: "amount", label: "Amount", align: "right", money: true },
        { key: "dueDate", label: "Due Date" },
      ]}
      rows={rows}
    />
  );
}
