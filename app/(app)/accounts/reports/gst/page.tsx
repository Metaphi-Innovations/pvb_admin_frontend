"use client";

import { useMemo, useState } from "react";
import { AccountsReportShell } from "@/components/accounts/AccountsReportShell";
import { GST_SUMMARY_SEED } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultDateRangeState } from "@/lib/accounts/report-date-presets";
import {
  ReportFilterRow,
  ReportFromToDateFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";

export default function GstSummaryPage() {
  const initial = defaultDateRangeState();
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [branch, setBranch] = useState("all");

  const rows = useMemo(
    () =>
      GST_SUMMARY_SEED.map((r) => ({
        period: r.period,
        outputGst: formatMoney(r.outputGst),
        inputGst: formatMoney(r.inputGst),
        netPayable: formatMoney(r.netPayable),
      })),
    [dateFrom, dateTo, branch],
  );

  return (
    <AccountsReportShell
      title="GST Summary"
      description="Monthly output GST, input GST and net liability summary."
      filters={
        <ReportFilterRow>
          <ReportFromToDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      columns={[
        { key: "period", label: "Period" },
        { key: "outputGst", label: "Output GST", align: "right", money: true },
        { key: "inputGst", label: "Input GST", align: "right", money: true },
        { key: "netPayable", label: "Net Payable", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
