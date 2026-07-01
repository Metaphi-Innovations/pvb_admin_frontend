"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import {
  FUND_TRANSFER_TYPE_LABELS,
  loadFundTransfers,
} from "@/lib/accounts/fund-transfer-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Input } from "@/components/ui/input";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";

export default function FundTransferPage() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  const records = useMemo(() => {
    void refreshKey;
    return loadFundTransfers();
  }, [refreshKey]);

  const rows = useMemo(() => {
    let list = records;
    if (tab !== "all") list = list.filter((r) => r.status === tab);
    if (dateFrom) list = list.filter((r) => r.transferDate >= dateFrom);
    if (dateTo) list = list.filter((r) => r.transferDate <= dateTo);
    return list;
  }, [records, tab, dateFrom, dateTo]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Fund Transfer")}
      title="Fund Transfer"
      description="Transfer funds between bank and cash accounts with automatic ledger posting."
      actions={
        <Button
          size="sm"
          className="h-8 text-xs bg-brand-600 text-white gap-1"
          onClick={() => router.push("/accounts/banking/fund-transfer/new")}
        >
          <Plus className="w-3.5 h-3.5" /> New Transfer
        </Button>
      }
      filters={
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
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
          <SectionTabs
            tabs={[
              { id: "all", label: "All" },
              { id: "draft", label: "Draft" },
              { id: "posted", label: "Posted" },
              { id: "cancelled", label: "Cancelled" },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="accounts-table w-full text-table">
          <thead className="border-b border-border/60">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                Reference
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                From
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                To
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">
                Amount
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  No fund transfers yet. Create a new transfer to move funds between accounts.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/40 hover:bg-brand-50/30 cursor-pointer"
                  onClick={() => {
                    if (r.voucherId) router.push(`/accounts/vouchers/view/${r.voucherId}`);
                  }}
                >
                  <td className="px-4 py-2.5 text-xs font-mono font-semibold text-brand-700">
                    {r.referenceNumber}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{r.transferDate}</td>
                  <td className="px-4 py-2.5 text-xs">{FUND_TRANSFER_TYPE_LABELS[r.transferType]}</td>
                  <td className="px-4 py-2.5 text-xs">{r.fromAccountName}</td>
                  <td className="px-4 py-2.5 text-xs">{r.toAccountName}</td>
                  <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.amount)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
