"use client";

import React, { useMemo } from "react";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import { loadVouchers } from "../../vouchers/voucher-data";

export default function BankBookPage() {
  const rows = useMemo(() => {
    const bankIds = new Set(getLedgersUnderSubGroupName("Bank Accounts").map((l) => l.id));
    const lines: Record<string, string>[] = [];
    loadVouchers()
      .filter((v) => v.status === "posted" || v.status === "approved")
      .forEach((v) => {
        v.lines.forEach((l) => {
          if (l.ledgerId && bankIds.has(l.ledgerId)) {
            lines.push({
              date: v.date,
              voucher: v.voucherNumber,
              ledger: l.ledgerName,
              particulars: v.narration || l.remarks,
              debit: formatMoneyOrDash(l.debit),
              credit: formatMoneyOrDash(l.credit),
            });
          }
        });
      });
    return lines;
  }, []);

  return (
    <AccountingReportPage
      title="Bank Book"
      description="Bank ledger movements from voucher entries under Bank Accounts sub-group"
      columns={[
        { key: "date", label: "Date" },
        { key: "voucher", label: "Voucher" },
        { key: "ledger", label: "Bank Ledger" },
        { key: "particulars", label: "Particulars" },
        { key: "debit", label: "Debit", align: "right", money: true },
        { key: "credit", label: "Credit", align: "right", money: true },
      ]}
      rows={rows}
    />
  );
}
