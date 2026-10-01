"use client";

import { useMemo, useState } from "react";
import { Building2, IndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import { AccountsReportShell } from "@/components/accounts/AccountsReportShell";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchMultiFilter,
  ReportFilterSummary,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { BRANCH_REPORT_SEED } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  buildBranchFilterSummary,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";

export default function BranchWiseReportPage() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [branches, setBranches] = useState<string[]>([]);

  const branchOptions = useMemo(
    () => BRANCH_REPORT_SEED.map((r) => r.branch).sort(),
    [],
  );

  const filteredSeed = useMemo(() => {
    if (!isMultiFilterActive(branches)) return BRANCH_REPORT_SEED;
    return BRANCH_REPORT_SEED.filter((r) => branches.includes(r.branch));
  }, [branches]);

  const rows = useMemo(
    () =>
      filteredSeed.map((r) => ({
        branch: r.branch,
        revenue: formatMoney(r.revenue),
        expenses: formatMoney(r.expenses),
        profit: formatMoney(r.revenue - r.expenses),
        receivables: formatMoney(r.receivables),
        payables: formatMoney(r.payables),
      })),
    [filteredSeed],
  );

  const totals = filteredSeed.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      expenses: acc.expenses + r.expenses,
    }),
    { revenue: 0, expenses: 0 },
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildBranchFilterSummary(branches, () => setBranches([])),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [branches]);

  return (
    <AccountsReportShell
      title="Branch-wise Reports"
      description="Revenue, expenses, receivables and payables by branch."
      kpis={[
        { label: "Branches", value: String(filteredSeed.length), icon: Building2, accent: true },
        { label: "Total Revenue", value: formatMoney(totals.revenue), icon: TrendingUp },
        { label: "Total Expenses", value: formatMoney(totals.expenses), icon: TrendingDown },
        { label: "Net", value: formatMoney(totals.revenue - totals.expenses), icon: IndianRupee },
      ]}
      filters={
        <>
          <ReportFilterRow>
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportBranchMultiFilter
              values={branches}
              onChange={setBranches}
              options={branchOptions}
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
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
