"use client";

import { useMemo, useState } from "react";
import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { computeDuePayments } from "@/lib/accounts/payables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function DuePaymentsClient() {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return computeDuePayments().map((r) => ({
      party: r.party,
      type: r.type,
      amount: formatMoney(r.amount),
      dueDate: r.dueDate,
    }));
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

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
      rows={filteredRows}
      filters={
        <ReportSearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search party, type, amount…"
        />
      }
    />
  );
}
