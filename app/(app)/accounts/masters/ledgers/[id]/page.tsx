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
import {
  buildLedgerStatement,
  collectLedgerTransactions,
} from "@/lib/accounts/ledger-detail-utils";
import { formatMoney } from "@/lib/accounts/money-format";

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

  const statement = useMemo(() => {
    if (!ledger) return [];
    const txns = collectLedgerTransactions(ledger.id);
    return buildLedgerStatement(ledger, txns);
  }, [ledger]);

  const totals = useMemo(() => {
    const totalDebit = statement.reduce((s, r) => s + r.debit, 0);
    const totalCredit = statement.reduce((s, r) => s + r.credit, 0);
    return { totalDebit, totalCredit };
  }, [statement]);

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
          value: formatMoney(Math.abs(balance.amount)),
          label: `${balance.balanceType} Balance`,
        },
        {
          icon: BookOpen,
          iconBg: "#E8F4FD",
          iconColor: "#1554B4",
          value: String(statement.length),
          label: "Transactions",
        },
      ]}
      tabs={[OVERVIEW_TAB, { value: "transactions", label: "Transactions", count: statement.length }]}
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
          {
            label: "Opening Balance",
            value: `${formatMoney(ledger.openingBalance)} ${ledger.balanceType}`,
          },
          { label: "Closing Balance", value: `${formatMoney(Math.abs(balance.amount))} ${balance.balanceType}`, highlight: true },
        ],
      }}
    >
      {activeTab === "overview" ? (
        <RecordSectionCard title="Ledger Summary" icon={BookOpen} accent="blue">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
              <p className="text-[10px] uppercase text-muted-foreground">Opening Balance</p>
              <p className="font-semibold mt-1 tabular-nums">
                {formatMoney(ledger.openingBalance)} {ledger.balanceType}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
              <p className="text-[10px] uppercase text-muted-foreground">Total Debit</p>
              <p className="font-semibold mt-1 tabular-nums text-emerald-800">{formatMoney(totals.totalDebit)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
              <p className="text-[10px] uppercase text-muted-foreground">Total Credit</p>
              <p className="font-semibold mt-1 tabular-nums text-red-700">{formatMoney(totals.totalCredit)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 bg-brand-50/50">
              <p className="text-[10px] uppercase text-muted-foreground">Closing Balance</p>
              <p className="font-semibold mt-1 tabular-nums">
                {formatMoney(Math.abs(balance.amount))} {balance.balanceType}
              </p>
            </div>
          </div>
        </RecordSectionCard>
      ) : (
        <RecordSectionCard title="Ledger Transactions" icon={IndianRupee} accent="green">
          {statement.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No transactions posted to this ledger.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Voucher No</th>
                    <th className="text-left px-3 py-2">Voucher Type</th>
                    <th className="text-left px-3 py-2">Narration</th>
                    <th className="text-right px-3 py-2">Debit</th>
                    <th className="text-right px-3 py-2">Credit</th>
                    <th className="text-right px-3 py-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.map((t) => (
                    <tr key={`${t.date}-${t.voucherNo}-${t.debit}-${t.credit}`} className="border-b border-border/40">
                      <td className="px-3 py-2">{t.date}</td>
                      <td className="px-3 py-2 font-mono text-brand-700">{t.voucherNo}</td>
                      <td className="px-3 py-2">{t.voucherType}</td>
                      <td className="px-3 py-2 max-w-[220px] truncate" title={t.particulars}>
                        {t.particulars}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {t.debit > 0 ? formatMoney(t.debit) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {t.credit > 0 ? formatMoney(t.credit) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatMoney(Math.abs(t.runningBalance))} {t.balanceType}
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
