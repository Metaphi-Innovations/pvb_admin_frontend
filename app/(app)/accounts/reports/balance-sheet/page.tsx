"use client";

import React, { useMemo, useState } from "react";
import { formatBalanceAmount } from "@/lib/accounts/money-format";
import { computeBalanceSheetRows } from "@/lib/accounts/ledger-reports";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";

export default function BalanceSheetPage() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [branch, setBranch] = useState("all");

  const rows = useMemo(
    () =>
      computeBalanceSheetRows().map((r) => ({
        head: r.head,
        section: r.section,
        primaryHead: r.primaryHead,
        accountGroup: r.accountGroup,
        balance: formatBalanceAmount(r.balance.amount, r.balance.balanceType),
      })),
    [asOnDate, branch],
  );

  return (
    <AccountingReportPage
      title="Balance Sheet"
      description="Asset and liability ledger balances from voucher postings"
      filters={
        <ReportFilterRow>
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      columns={[
        { key: "head", label: "Ledger" },
        { key: "section", label: "Section" },
        { key: "primaryHead", label: "Primary Head" },
        { key: "accountGroup", label: "Account Group" },
        { key: "balance", label: "Balance", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
