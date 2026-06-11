"use client";

import React, { useMemo } from "react";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { computeLedgerReportRows } from "@/lib/accounts/ledger-reports";
import { AccountingReportPage } from "../../components/AccountingReportPage";

export default function LedgerReportPage() {
  const rows = useMemo(
    () =>
      computeLedgerReportRows().map((r) => ({
        ledger: r.ledger,
        primaryHead: r.primaryHead,
        group: r.group,
        opening: formatBalanceAmount(r.opening.amount, r.opening.balanceType),
        debit: formatMoney(r.movement.debit),
        credit: formatMoney(r.movement.credit),
        closing: formatBalanceAmount(r.closing.amount, r.closing.balanceType),
      })),
    [],
  );

  return (
    <AccountingReportPage
      title="Ledger Report"
      description="Ledger-wise opening, movement and closing from voucher entries"
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
