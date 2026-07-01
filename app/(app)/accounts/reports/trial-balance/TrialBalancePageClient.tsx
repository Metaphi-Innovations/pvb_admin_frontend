"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { computeTrialBalanceRows } from "@/lib/accounts/ledger-reports";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function TrialBalancePageClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [branch, setBranch] = useState("all");

  const rows = useMemo(() => computeTrialBalanceRows(), [dateFrom, dateTo, branch]);

  const exportCsv = () => {
    const header = "Ledger,Primary Head,Group Path,Opening,Debit,Credit,Closing\n";
    const body = rows
      .map((r) =>
        [
          r.ledger,
          r.primaryHead,
          `${r.accountGroup} › ${r.subGroup}`,
          formatBalanceAmount(r.opening, r.openingBalanceType),
          formatMoney(r.debit),
          formatMoney(r.credit),
          formatBalanceAmount(r.closing.amount, r.closing.balanceType),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trial-balance.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Trial Balance")}
      title="Trial Balance"
      description="Ledger-wise trial balance from voucher postings (Primary Head → Group → Sub-Group → Ledger)"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      }
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
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableScroll>
        <AccountsTable minWidth={1000}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              {["Ledger", "Primary Head", "Group Path", "Opening", "Debit", "Credit", "Closing"].map((h, i) => (
                <AccountsTableHeadCell key={h} align={i >= 3 ? "right" : "left"}>
                  {h}
                </AccountsTableHeadCell>
              ))}
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {rows.map((r) => (
              <AccountsTableRow key={r.ledgerId}>
                <AccountsTableCell>
                  <Link
                    href={buildGeneralLedgerHref(r.ledgerId)}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    {r.ledger}
                  </Link>
                </AccountsTableCell>
                <AccountsTableCell className="text-muted-foreground">{r.primaryHead}</AccountsTableCell>
                <AccountsTableCell className="text-muted-foreground text-xs">
                  {r.accountGroup} › {r.subGroup}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatBalanceAmount(r.opening, r.openingBalanceType)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(r.debit)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(r.credit)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="font-medium">
                  {formatBalanceAmount(r.closing.amount, r.closing.balanceType)}
                </AccountsTableCell>
              </AccountsTableRow>
            ))}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </AccountsPageShell>
  );
}
