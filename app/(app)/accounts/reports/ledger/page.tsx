"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { computeLedgerReportRows } from "@/lib/accounts/ledger-reports";
import { getPostableCoaAccounts } from "@/app/(app)/accounts/data";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  ReportLedgerFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export default function LedgerReportPage() {
  const searchParams = useSearchParams();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [branch, setBranch] = useState("all");
  const [ledgerId, setLedgerId] = useState("all");

  const ledgers = useMemo(
    () =>
      getPostableCoaAccounts()
        .map((a) => ({ id: a.id, name: a.accountName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  useEffect(() => {
    const fromUrl = searchParams.get("ledger");
    if (fromUrl && ledgers.some((l) => String(l.id) === fromUrl)) {
      setLedgerId(fromUrl);
    }
  }, [searchParams, ledgers]);

  const rows = useMemo(() => {
    let data = computeLedgerReportRows();
    if (ledgerId !== "all") {
      const ledger = ledgers.find((l) => String(l.id) === ledgerId);
      if (ledger) data = data.filter((r) => r.ledger === ledger.name);
    }
    return data.map((r) => ({
      ledger: r.ledger,
      primaryHead: r.primaryHead,
      group: r.group,
      opening: formatBalanceAmount(r.opening.amount, r.opening.balanceType),
      debit: formatMoney(r.movement.debit),
      credit: formatMoney(r.movement.credit),
      closing: formatBalanceAmount(r.closing.amount, r.closing.balanceType),
    }));
  }, [dateFrom, dateTo, branch, ledgerId, ledgers]);

  return (
    <AccountingReportPage
      title="General Ledger"
      description="Ledger-wise opening, movement and closing from voucher entries"
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
          <ReportLedgerFilter value={ledgerId} onChange={setLedgerId} ledgers={ledgers} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
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
