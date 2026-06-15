"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RecordDetailPage,
  RecordSectionCard,
  OVERVIEW_TAB,
} from "@/components/record-detail";
import { BookOpen, IndianRupee } from "lucide-react";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { loadChartOfAccounts, type ChartOfAccount } from "../../../data";
import { computeLedgerCurrentBalance } from "../ledgers-utils";
import { loadVouchers, type AccountingVoucher, type VoucherLine } from "../../../vouchers/voucher-data";

export default function LedgerViewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ledger, setLedger] = useState<ChartOfAccount | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const records = loadChartOfAccounts();
    setLedger(records.find((r) => r.id === Number(id) && r.nodeLevel === "ledger") ?? null);
  }, [id]);

  const balance = useMemo(() => {
    if (!ledger) return { amount: 0, balanceType: "Debit" as const };
    return computeLedgerCurrentBalance(ledger);
  }, [ledger]);

  const transactions = useMemo(() => {
    if (!ledger) return [];
    const rows: { id: string; date: string; voucher: string; debit: number; credit: number }[] = [];
    loadVouchers().forEach((v: AccountingVoucher) => {
      v.lines.forEach((line: VoucherLine) => {
        if (line.ledgerId === ledger.id) {
          rows.push({
            id: `${v.id}-${line.id}`,
            date: v.date,
            voucher: v.voucherNumber,
            debit: line.debit,
            credit: line.credit,
          });
        }
      });
    });
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [ledger]);

  if (!ledger) {
    return (
      <RecordDetailPage
        listHref="/accounts/masters/ledgers"
        listLabel="Ledgers"
        recordName="Ledger not found"
        statusLabel="—"
        statusVariant="neutral"
        tabs={[OVERVIEW_TAB]}
        activeTab="overview"
        onTabChange={() => {}}
        sidebar={{}}
      >
        <p className="text-sm text-muted-foreground text-center py-8">
          <Link href="/accounts/masters/ledgers" className="text-brand-600 hover:underline">
            Back to ledgers
          </Link>
        </p>
      </RecordDetailPage>
    );
  }

  return (
    <RecordDetailPage
      listHref="/accounts/masters/ledgers"
      listLabel="Ledgers"
      recordName={ledger.accountName}
      recordCode={ledger.accountCode}
      statusLabel={ledger.status === "active" ? "Active" : "Inactive"}
      statusVariant={ledger.status === "active" ? "active" : "inactive"}
      kpis={[
        {
          icon: IndianRupee,
          iconBg: "#FFF4E6",
          iconColor: "#D96A10",
          value: `₹${Math.abs(balance.amount).toLocaleString("en-IN")}`,
          label: balance.balanceType === "Debit" ? "Dr Balance" : "Cr Balance",
        },
        {
          icon: BookOpen,
          iconBg: "#E8F4FD",
          iconColor: "#1554B4",
          value: String(transactions.length),
          label: "Recent Txns",
        },
      ]}
      tabs={[OVERVIEW_TAB, { value: "transactions", label: "Transactions", count: transactions.length }]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/accounts/masters/chart-of-accounts?node=${ledger.id}`)}
      sidebar={{
        quickActions: [
          {
            label: "Open in COA",
            icon: BookOpen,
            onClick: () => router.push(`/accounts/masters/chart-of-accounts?node=${ledger.id}`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Ledger Code", value: ledger.accountCode, highlight: true },
          { label: "Type", value: ledger.accountType },
          { label: "Opening Balance", value: String(ledger.openingBalance) },
        ],
      }}
    >
      {activeTab === "overview" ? (
        <RecordSectionCard title="Ledger Details" icon={BookOpen} accent="blue">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{ledger.accountName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono font-semibold text-brand-700">{ledger.accountCode}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Current Balance</span>
              <MoneyAmount amount={Math.abs(balance.amount)} />
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{ledger.status}</span>
            </div>
          </div>
        </RecordSectionCard>
      ) : (
        <RecordSectionCard title="Recent Transactions" icon={IndianRupee} accent="green">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No transactions posted to this ledger.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Voucher</th>
                    <th className="text-right px-3 py-2">Debit</th>
                    <th className="text-right px-3 py-2">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/40">
                      <td className="px-3 py-2">{t.date}</td>
                      <td className="px-3 py-2 font-mono text-brand-700">{t.voucher}</td>
                      <td className="px-3 py-2 text-right">
                        <MoneyAmount amount={t.debit} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MoneyAmount amount={t.credit} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </RecordSectionCard>
      )}
    </RecordDetailPage>
  );
}
