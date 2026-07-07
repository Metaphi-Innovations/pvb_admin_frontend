"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { listAccountsForBankGroup, loadBankAccounts } from "@/lib/accounts/bank-accounts-data";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";

export default function BankGroupAccountsClient({ bankGroupId }: { bankGroupId: number }) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadBankAccounts();
    setRefreshKey((k) => k + 1);
  }, []);

  const bankGroup = useMemo(() => {
    void refreshKey;
    return loadChartOfAccounts().find((r) => r.id === bankGroupId) ?? null;
  }, [bankGroupId, refreshKey]);

  const accounts = useMemo(() => {
    void refreshKey;
    return listAccountsForBankGroup(bankGroupId);
  }, [bankGroupId, refreshKey]);

  const records = useMemo(() => loadChartOfAccounts(), [refreshKey]);

  if (!bankGroup) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Banking", "Bank Accounts", "/accounts/banking/bank-accounts")}
        title="Bank not found"
        description="This bank group may have been removed."
      >
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Link href="/accounts/banking/bank-accounts" className="text-brand-600 hover:underline">
            Back to Bank Accounts
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", bankGroup.accountName, "/accounts/banking/bank-accounts")}
      title={bankGroup.accountName}
      description="All account ledgers under this bank group"
      actions={
        <Button
          size="sm"
          className="h-9 text-[13px] font-medium bg-brand-600 text-white gap-1"
          onClick={() =>
            router.push(`/accounts/banking/bank-accounts/new?bankGroupId=${bankGroupId}`)
          }
        >
          <Plus className="w-4 h-4" /> Add Bank Account
        </Button>
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto">
        <table className="accounts-table w-full">
          <thead className="border-b">
            <tr>
              {["Account", "Account No.", "IFSC", "Branch", "Balance", "Recon", "Status"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => {
              const ledger = records.find((r) => r.id === a.coaLedgerId);
              const bal = ledger ? computeLedgerCurrentBalance(ledger).amount : a.openingBalance;
              return (
                <tr
                  key={a.id}
                  className="accounts-table-row group cursor-pointer"
                  onClick={() => router.push(`/accounts/banking/bank-accounts/${a.id}`)}
                >
                  <td className="px-4 py-2.5 font-medium">{formatBankAccountMaster(a)}</td>
                  <td className="px-4 py-2.5 font-mono">{a.accountNumber}</td>
                  <td className="px-4 py-2.5 font-mono">{a.ifsc || "—"}</td>
                  <td className="px-4 py-2.5">{a.branchName || "—"}</td>
                  <td className="px-4 py-2.5">
                    <MoneyAmount amount={bal} side="Debit" className="text-xs" />
                  </td>
                  <td className="px-4 py-2.5 capitalize">{a.reconciliationStatus}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
