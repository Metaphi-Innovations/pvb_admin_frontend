"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import { loadExpenses } from "@/app/(app)/accounts/expenses/expense-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function EmployeeClaimsPageClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Employee Claim Entries",
        description: "TA/DA and expense claims — approved claims auto-post to payables.",
        loadData: loadExpenses,
        newHref: "/accounts/transactions/expenses/new",
        editHref: (id) => `/accounts/transactions/expenses/${id}/edit`,
        getRow: (e) => ({
          id: e.id,
          number: e.expenseNumber,
          date: e.expenseDate,
          party: e.employeeName,
          amount: formatMoney(e.totalAmount),
          status: e.status,
          viewHref: `/accounts/transactions/expenses/${e.id}`,
        }),
      }}
    />
  );
}
