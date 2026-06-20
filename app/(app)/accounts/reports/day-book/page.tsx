"use client";

import React, { useMemo, useState } from "react";
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
import { AccountingReportPage } from "../../components/AccountingReportPage";
import { loadVouchers } from "../../vouchers/voucher-data";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  ReportVoucherTypeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export default function DayBookPage() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [branch, setBranch] = useState("all");
  const [voucherType, setVoucherType] = useState("all");

  const rows = useMemo(
    () =>
      loadVouchers()
        .filter((v) => v.status === "posted" || v.status === "approved")
        .filter((v) => {
          if (dateFrom && v.date < dateFrom) return false;
          if (dateTo && v.date > dateTo) return false;
          if (voucherType !== "all" && v.voucherType !== voucherType) return false;
          return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap((v) =>
          v.lines.map((l) => ({
            date: v.date,
            voucher: v.voucherNumber,
            type: v.voucherType,
            ledger: l.ledgerName,
            debit: formatMoneyOrDash(l.debit),
            credit: formatMoneyOrDash(l.credit),
          })),
        ),
    [dateFrom, dateTo, branch, voucherType],
  );

  return (
    <AccountingReportPage
      title="Day Book"
      description="Chronological voucher entries"
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
          <ReportVoucherTypeFilter value={voucherType} onChange={setVoucherType} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
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
