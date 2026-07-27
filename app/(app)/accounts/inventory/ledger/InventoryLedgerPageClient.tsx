"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { ReportFilterRow, ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";
import { cn } from "@/lib/utils";

export default function InventoryLedgerPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const records = useMemo(() => loadChartOfAccounts(), []);
  const ledgers = useMemo(
    () => getLedgersUnderSubGroupName("Inventory / Stock-in-Hand", records),
    [records],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ledgers;
    return ledgers.filter(
      (l) =>
        l.accountCode.toLowerCase().includes(q) ||
        l.accountName.toLowerCase().includes(q),
    );
  }, [ledgers, search]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Inventory", "Inventory Ledger")}
      title="Inventory Ledger"
      description="View stock-related ledgers under Chart of Accounts. Create items from Inventory → Items."
      actions={
        <Button asChild variant="outline" size="sm" className={ACCOUNTS_ACTION_BUTTON_CLASS}>
          <Link href="/accounts/masters/chart-of-accounts">View in Chart of Accounts</Link>
        </Button>
      }
      filters={
        <ReportFilterRow>
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search ledger code or name…"
            className="min-w-[240px] w-[280px] max-w-[320px] flex-none"
          />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
        <AccountsSummaryCards
          items={[{ label: "Inventory Ledgers", value: String(filtered.length) }]}
        />
        <AccountsTableScroll>
          <AccountsTable minWidth={720}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <th>Ledger Code</th>
                <th>Ledger Name</th>
                <th>Type</th>
                <th className="text-right">Opening Balance</th>
                <th className="text-right">Current Balance</th>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {filtered.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={5} className="accounts-table-empty">
                    {ledgers.length === 0
                      ? "No inventory ledgers yet. Stock postings will appear here when items and stock opening are configured."
                      : "No ledgers match your search."}
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                filtered.map((l) => {
                  const bal = computeLedgerCurrentBalance(l);
                  return (
                    <AccountsTableRow
                      key={l.id}
                      className={cn("accounts-table-row group cursor-pointer")}
                      onClick={() =>
                        router.push(`/accounts/masters/chart-of-accounts?node=${l.id}`)
                      }
                    >
                      <AccountsTableCell>
                        <span className="font-mono text-xs font-semibold text-brand-700">
                          {l.accountCode}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <span className="text-xs font-medium">{l.accountName}</span>
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <span className="text-xs">{resolveLedgerType(l, records)}</span>
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <MoneyAmount amount={l.openingBalance} side={l.balanceType} />
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <MoneyAmount amount={bal.amount} side={bal.balanceType} />
                      </AccountsTableCell>
                    </AccountsTableRow>
                  );
                })
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
