"use client";

import React, { useMemo } from "react";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { computeTrialBalanceRows } from "@/lib/accounts/ledger-reports";
import { AccountingReportPage } from "../../components/AccountingReportPage";

export default function TrialBalancePage() {
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
    [],
  );

  return (
    <AccountingReportPage
      title="Trial Balance"
      description="Ledger-wise trial balance from voucher postings (Primary Head → Group → Sub-Group → Ledger)"
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
