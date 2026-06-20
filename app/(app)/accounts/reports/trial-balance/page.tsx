"use client";

import React, { useMemo, useState } from "react";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { computeTrialBalanceRows } from "@/lib/accounts/ledger-reports";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export default function TrialBalancePage() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [branch, setBranch] = useState("all");

  const rows = useMemo(
    () =>
      computeTrialBalanceRows().map((r) => ({
        ledger: r.ledger,
        primaryHead: r.primaryHead,
        group: `${r.accountGroup} › ${r.subGroup}`,
        opening: formatBalanceAmount(r.opening, r.openingBalanceType),
        debit: formatMoney(r.debit),
        credit: formatMoney(r.credit),
        closing: formatBalanceAmount(r.closing.amount, r.closing.balanceType),
      })),
    [dateFrom, dateTo, branch],
  );

  return (
    <AccountingReportPage
      title="Trial Balance"
      description="Ledger-wise trial balance from voucher postings (Primary Head → Group → Sub-Group → Ledger)"
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
        { key: "ledger", label: "Ledger" },
        { key: "primaryHead", label: "Primary Head" },
        { key: "group", label: "Group Path" },
        { key: "opening", label: "Opening", align: "right", money: true },
        { key: "debit", label: "Debit", align: "right", money: true },
        { key: "credit", label: "Credit", align: "right", money: true },
        { key: "closing", label: "Closing", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
