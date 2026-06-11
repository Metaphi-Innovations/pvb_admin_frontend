"use client";

import React, { useMemo } from "react";
import { formatBalanceAmount } from "@/lib/accounts/money-format";
import { computeBalanceSheetRows } from "@/lib/accounts/ledger-reports";
import { AccountingReportPage } from "../../components/AccountingReportPage";

export default function BalanceSheetPage() {
  const rows = useMemo(
    () =>
      computeBalanceSheetRows().map((r) => ({
        head: r.head,
        section: r.section,
        primaryHead: r.primaryHead,
        accountGroup: r.accountGroup,
        balance: formatBalanceAmount(r.balance.amount, r.balance.balanceType),
      })),
    [],
  );

  return (
    <AccountingReportPage
      title="Balance Sheet"
      description="Asset and liability ledger balances from voucher postings"
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
