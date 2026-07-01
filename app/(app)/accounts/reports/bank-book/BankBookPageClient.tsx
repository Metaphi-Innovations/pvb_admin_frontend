"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Download } from "lucide-react";
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
  BANK_BOOK_VOUCHER_TYPES,
  buildBookEntries,
  computeBookSummary,
  getBankBookLedgers,
  listBankAccountFilterOptions,
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

export default function BankBookPageClient() {
  const router = useRouter();
  const [bankAccountId, setBankAccountId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [voucherType, setVoucherType] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  const bankOptions = useMemo(() => {
    void refreshKey;
    return listBankAccountFilterOptions();
  }, [refreshKey]);

  const ledgers = useMemo(() => {
    void refreshKey;
    return getBankBookLedgers();
  }, [refreshKey]);

  const filters = useMemo(
    () => ({
      ledgerIds:
        bankAccountId !== "all" ? [Number(bankAccountId)] : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      voucherTypeLabel: voucherType !== "all" ? voucherType : undefined,
      search: search || undefined,
    }),
    [bankAccountId, dateFrom, dateTo, voucherType, search],
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
    const header = "Date,Voucher No,Voucher Type,Particulars,Receipt,Payment,Running Balance\n";
    const body = entries
      .map(
        (r) =>
          `${r.date},"${r.voucherNo}","${r.voucherTypeLabel}","${r.particulars.replace(/"/g, '""')}",${r.receipt},${r.payment},${r.runningBalance}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bank-book.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Book")}
      title="Bank Book"
      description="Bank ledger with receipts, payments, and running balance from posted vouchers."
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
            <SummaryCard label="Opening Balance" value={formatMoney(summary.openingBalance)} />
            <SummaryCard label="Total Receipts" value={formatMoney(summary.totalReceipts)} />
            <SummaryCard label="Total Payments" value={formatMoney(summary.totalPayments)} />
            <SummaryCard label="Closing Balance" value={formatMoney(summary.closingBalance)} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue placeholder="Bank Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bank Accounts</SelectItem>
                {bankOptions.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-8 text-xs w-36"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <Input
              type="date"
              className="h-8 text-xs w-36"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
            <Select value={voucherType} onValueChange={setVoucherType}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Voucher Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Voucher Types</SelectItem>
                {BANK_BOOK_VOUCHER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder="Search voucher, particulars…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <table className="accounts-table w-full text-table">
            <thead className="border-b border-border/60">
              <tr>
                {["Date", "Voucher No", "Voucher Type", "Particulars", "Receipt", "Payment", "Running Balance"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                        i >= 4 ? "text-right" : "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    No bank transactions for the selected filters.
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
                    <td className="px-4 py-3 text-xs">{row.voucherTypeLabel}</td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate">{row.particulars}</td>
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
