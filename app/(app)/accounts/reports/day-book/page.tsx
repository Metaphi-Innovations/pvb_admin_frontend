"use client";

import React, { useMemo } from "react";
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import { loadVouchers } from "../../vouchers/voucher-data";

export default function DayBookPage() {
  const rows = useMemo(
    () =>
      loadVouchers()
        .filter((v) => v.status === "posted" || v.status === "approved")
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap((v) =>
          v.lines.map((l) => ({
            date: v.date,
            voucher: v.voucherNumber,
            ledger: l.ledgerName,
            debit: formatMoneyOrDash(l.debit),
            credit: formatMoneyOrDash(l.credit),
          })),
        ),
    [],
  );

  return (
    <AccountingReportPage
      title="Day Book"
      description="Chronological voucher entries"
      columns={[
        { key: "date", label: "Date" },
        { key: "voucher", label: "Voucher", mono: true },
        { key: "ledger", label: "Ledger" },
        { key: "debit", label: "Debit", align: "right", money: true },
        { key: "credit", label: "Credit", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
