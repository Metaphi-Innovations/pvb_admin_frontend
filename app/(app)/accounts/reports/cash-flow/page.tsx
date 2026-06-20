"use client";

import { useMemo, useState } from "react";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import { computePandLRows } from "@/lib/accounts/ledger-reports";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export default function CashFlowReportPage() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [branch, setBranch] = useState("all");

  const rows = useMemo(() => {
    const { net } = computePandLRows();
    const operating = net;
    return [
      { section: "Operating Activities", amount: formatMoney(operating) },
      { section: "Investing Activities", amount: formatMoney(0) },
      { section: "Financing Activities", amount: formatMoney(0) },
      { section: "Net Cash Flow", amount: formatMoney(operating) },
    ];
  }, [dateFrom, dateTo, branch]);

  return (
    <AccountingReportPage
      title="Cash Flow"
      description="Indirect cash flow statement derived from posted voucher movements."
      filters={
        <ReportFilterRow>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      columns={[
        { key: "section", label: "Activity" },
        { key: "amount", label: "Amount", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
