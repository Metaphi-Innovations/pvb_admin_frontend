"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  buildBookEntries,
  computeBookSummary,
  getCashBookLedgers,
  CASH_BRANCH_OPTIONS,
} from "@/lib/accounts/banking-book-utils";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums mt-1", MONEY_AMOUNT_CLASS)}>{value}</p>
    </div>
  );
}

export default function CashBookPageClient() {
  const router = useRouter();
  const [branch, setBranch] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  const ledgers = useMemo(() => {
    void refreshKey;
    return getCashBookLedgers();
  }, [refreshKey]);

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      branch: branch !== "all" ? branch : undefined,
    }),
    [dateFrom, dateTo, branch],
  );

  const entries = useMemo(
    () => buildBookEntries(ledgers, filters),
    [ledgers, filters],
  );

  const summary = useMemo(
    () => computeBookSummary(ledgers, entries, filters),
    [ledgers, entries, filters],
  );

  const exportCsv = () => {
    const header = "Date,Voucher No,Particulars,Receipt,Payment,Running Balance\n";
    const body = entries
      .map(
        (r) =>
          `${r.date},"${r.voucherNo}","${r.particulars.replace(/"/g, '""')}",${r.receipt},${r.payment},${r.runningBalance}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cash-book.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Cash Book")}
      title="Cash Book"
      description="Cash-in-hand ledger with receipts, payments, and running balance."
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 p-4 border-b border-border/60 bg-muted/5 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Opening Cash" value={formatMoney(summary.openingBalance)} />
            <SummaryCard label="Cash Received" value={formatMoney(summary.totalReceipts)} />
            <SummaryCard label="Cash Paid" value={formatMoney(summary.totalPayments)} />
            <SummaryCard label="Closing Cash" value={formatMoney(summary.closingBalance)} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {CASH_BRANCH_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b === "all" ? "All Branches" : b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-8 text-xs w-36"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              className="h-8 text-xs w-36"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <table className="accounts-table w-full text-table">
            <thead className="border-b border-border/60">
              <tr>
                {["Date", "Voucher No", "Particulars", "Receipt", "Payment", "Running Balance"].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                      i >= 3 ? "text-right" : "text-left",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    No cash transactions for the selected filters.
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr
                    key={row.rowKey}
                    className="border-b border-border/40 hover:bg-brand-50/30 cursor-pointer"
                    onClick={() => router.push(`/accounts/vouchers/view/${row.voucherId}`)}
                  >
                    <td className="px-4 py-3 text-xs">{row.date}</td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-brand-700">{row.voucherNo}</td>
                    <td className="px-4 py-3 text-xs max-w-sm truncate">{row.particulars}</td>
                    <td className={cn("px-4 py-3 text-xs text-right", MONEY_AMOUNT_CLASS)}>
                      {row.receipt > 0 ? formatMoney(row.receipt) : "—"}
                    </td>
                    <td className={cn("px-4 py-3 text-xs text-right", MONEY_AMOUNT_CLASS)}>
                      {row.payment > 0 ? formatMoney(row.payment) : "—"}
                    </td>
                    <td className={cn("px-4 py-3 text-xs text-right font-medium", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(row.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AccountsPageShell>
  );
}
