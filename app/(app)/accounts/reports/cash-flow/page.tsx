"use client";

import { useMemo } from "react";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import { computePandLRows } from "@/lib/accounts/ledger-reports";
import { formatMoney } from "@/lib/accounts/money-format";

export default function CashFlowReportPage() {
  const rows = useMemo(() => {
    const { net } = computePandLRows();
    const operating = net;
    return [
      { section: "Operating Activities", amount: formatMoney(operating) },
      { section: "Investing Activities", amount: formatMoney(0) },
      { section: "Financing Activities", amount: formatMoney(0) },
      { section: "Net Cash Flow", amount: formatMoney(operating) },
    ];
  }, []);

  return (
    <AccountingReportPage
      title="Cash Flow"
      description="Indirect cash flow statement derived from posted voucher movements."
      columns={[
        { key: "section", label: "Activity" },
        { key: "amount", label: "Amount", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
