"use client";

import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
import {
  formatBalanceAmount,
  formatMoney,
} from "@/lib/accounts/money-format";
import type { CoaLedgerListingSummary, CoaListingSummary } from "../coa-listing-data";

export function CoaListingSummaryBar({
  summary,
  totalLabel = "Total Accounts / Ledgers",
}: {
  summary: CoaListingSummary;
  totalLabel?: string;
}) {
  const opening =
    summary.openingAmount > 0
      ? formatBalanceAmount(summary.openingAmount, summary.openingSide)
      : "—";
  const closing =
    summary.closingAmount > 0
      ? formatBalanceAmount(summary.closingAmount, summary.closingSide)
      : "—";

  return (
    <AccountsSummaryCards
      columns={5}
      items={[
        { label: totalLabel, value: String(summary.totalAccounts) },
        { label: "Opening Balance", value: opening },
        { label: "Total Debit", value: formatMoney(summary.periodDebit) },
        { label: "Total Credit", value: formatMoney(summary.periodCredit) },
        { label: "Closing Balance", value: closing },
      ]}
    />
  );
}

export function CoaLedgerListingSummaryBar({
  summary,
}: {
  summary: CoaLedgerListingSummary;
}) {
  const opening =
    summary.openingAmount > 0
      ? formatBalanceAmount(summary.openingAmount, summary.openingSide)
      : "—";
  const current =
    summary.currentAmount > 0
      ? formatBalanceAmount(summary.currentAmount, summary.currentSide)
      : "—";

  return (
    <AccountsSummaryCards
      columns={3}
      items={[
        { label: "Total Ledgers", value: String(summary.totalLedgers) },
        { label: "Opening Balance", value: opening },
        { label: "Current Balance", value: current },
      ]}
    />
  );
}
