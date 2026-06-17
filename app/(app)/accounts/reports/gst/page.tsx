"use client";

import { useMemo, useState } from "react";
import { Layers, IndianRupee, Receipt } from "lucide-react";
import {
  AccountsReportShell,
  ReportFilterBar,
} from "@/components/accounts/AccountsReportShell";
import { GST_SUMMARY_SEED } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function GstSummaryPage() {
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [branch, setBranch] = useState("");

  const rows = useMemo(
    () =>
      GST_SUMMARY_SEED.map((r) => ({
        period: r.period,
        outputGst: formatMoney(r.outputGst),
        inputGst: formatMoney(r.inputGst),
        netPayable: formatMoney(r.netPayable),
      })),
    [],
  );

  const netTotal = GST_SUMMARY_SEED.reduce((s, r) => s + r.netPayable, 0);

  return (
    <AccountsReportShell
      title="GST Summary"
      description="Monthly output GST, input GST and net liability summary."
      kpis={[
        { label: "Periods", value: String(rows.length), icon: Layers, accent: true },
        { label: "Output GST", value: formatMoney(GST_SUMMARY_SEED.reduce((s, r) => s + r.outputGst, 0)), icon: Receipt },
        { label: "Input GST", value: formatMoney(GST_SUMMARY_SEED.reduce((s, r) => s + r.inputGst, 0)), icon: Receipt },
        { label: "Net Payable", value: formatMoney(netTotal), icon: IndianRupee },
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
        { key: "period", label: "Period" },
        { key: "outputGst", label: "Output GST", align: "right", money: true },
        { key: "inputGst", label: "Input GST", align: "right", money: true },
        { key: "netPayable", label: "Net Payable", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
