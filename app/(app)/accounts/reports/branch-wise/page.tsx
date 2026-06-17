"use client";

import { useMemo, useState } from "react";
import { Building2, IndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import {
  AccountsReportShell,
  ReportFilterBar,
} from "@/components/accounts/AccountsReportShell";
import { BRANCH_REPORT_SEED } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function BranchWiseReportPage() {
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [branch, setBranch] = useState("");

  const rows = useMemo(() => {
    let list = BRANCH_REPORT_SEED;
    if (branch.trim()) {
      const b = branch.toLowerCase();
      list = list.filter((r) => r.branch.toLowerCase().includes(b));
    }
    return list.map((r) => ({
      branch: r.branch,
      revenue: formatMoney(r.revenue),
      expenses: formatMoney(r.expenses),
      profit: formatMoney(r.revenue - r.expenses),
      receivables: formatMoney(r.receivables),
      payables: formatMoney(r.payables),
    }));
  }, [branch]);

  const totals = BRANCH_REPORT_SEED.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      expenses: acc.expenses + r.expenses,
    }),
    { revenue: 0, expenses: 0 },
  );

  return (
    <AccountsReportShell
      title="Branch-wise Reports"
      description="Revenue, expenses, receivables and payables by branch."
      kpis={[
        { label: "Branches", value: String(BRANCH_REPORT_SEED.length), icon: Building2, accent: true },
        { label: "Total Revenue", value: formatMoney(totals.revenue), icon: TrendingUp },
        { label: "Total Expenses", value: formatMoney(totals.expenses), icon: TrendingDown },
        { label: "Net", value: formatMoney(totals.revenue - totals.expenses), icon: IndianRupee },
      ]}
      filters={
        <ReportFilterBar
          dateFrom={dateFrom}
          dateTo={dateTo}
          branch={branch}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
          onBranch={setBranch}
        />
      }
      columns={[
        { key: "branch", label: "Branch" },
        { key: "revenue", label: "Revenue", align: "right", money: true },
        { key: "expenses", label: "Expenses", align: "right", money: true },
        { key: "profit", label: "Profit", align: "right", money: true },
        { key: "receivables", label: "Receivables", align: "right", money: true },
        { key: "payables", label: "Payables", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
