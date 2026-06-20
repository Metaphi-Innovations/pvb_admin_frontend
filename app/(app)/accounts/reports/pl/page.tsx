"use client";

import React, { useMemo, useState } from "react";
import { formatBalanceAmount, formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { computePandLRows } from "@/lib/accounts/ledger-reports";
import { cn } from "@/lib/utils";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  ReportBasisFilter,
  useReportDateRange,
  type ReportBasis,
} from "@/components/accounts/ReportFilters";

export default function PLPage() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [branch, setBranch] = useState("all");
  const [basis, setBasis] = useState<ReportBasis>("accrual");

  const { rows, net } = useMemo(() => {
    const { rows: data, net: netProfit } = computePandLRows();
    return {
      rows: data.map((r) => ({
        head: r.head,
        type: r.type,
        primaryHead: r.primaryHead,
        accountGroup: r.accountGroup,
        amount: formatBalanceAmount(r.amount.amount, r.amount.balanceType),
      })),
      net: netProfit,
    };
  }, [dateFrom, dateTo, branch, basis]);

  return (
    <AccountingReportPage
      title="Profit & Loss"
      description="Income and expense ledgers with closing balances from voucher postings"
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
          <ReportBasisFilter value={basis} onChange={setBasis} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      columns={[
        { key: "head", label: "Ledger" },
        { key: "type", label: "Type" },
        { key: "primaryHead", label: "Primary Head" },
        { key: "accountGroup", label: "Account Group" },
        { key: "amount", label: "Amount", align: "right", money: true },
      ]}
      rows={rows}
      footer={
        <tr>
          <td colSpan={4} className="px-4 py-3.5 text-xs font-semibold text-right">
            Net Profit / Loss
          </td>
          <td className={cn("px-4 py-3.5 text-xs text-right font-semibold", MONEY_AMOUNT_CLASS)}>
            {formatMoney(Math.abs(net))} {net >= 0 ? "Cr" : "Dr"}
          </td>
        </tr>
      }
    />
  );
}
