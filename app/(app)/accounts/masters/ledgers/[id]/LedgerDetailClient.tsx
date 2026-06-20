"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { MiniKPICard } from "@/components/ui/KPICard";
import { IndianRupee, BookOpen, FileText, Scale } from "lucide-react";
import { loadChartOfAccounts } from "../../../data";
import { computeLedgerCurrentBalance } from "../ledgers-utils";
import {
  buildLedgerStatement,
  collectLedgerTransactions,
  getLedgerById,
  ledgerOutstanding,
  parentGroupLabel,
  resolveLedgerType,
} from "@/lib/accounts/ledger-detail-utils";
import { formatMoney } from "@/lib/accounts/money-format";
import { loadLedgerMeta } from "@/lib/accounts/ledger-metadata";
import { resolveCoaMasterLink, isMasterLinkedLedger } from "@/lib/accounts/coa-master-link";
import {
  CoaMasterLinkActions,
  CoaMasterLinkPanel,
} from "@/components/accounts/CoaMasterLinkPanel";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "outstanding", label: "Outstanding" },
  { id: "statement", label: "Statement" },
];

export default function LedgerDetailClient({ ledgerId }: { ledgerId: number }) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [records, setRecords] = useState(() => loadChartOfAccounts());

  useEffect(() => {
    setRecords(loadChartOfAccounts());
  }, [ledgerId]);

  const ledger = useMemo(() => getLedgerById(ledgerId), [ledgerId, records]);
  const balance = useMemo(
    () => (ledger ? computeLedgerCurrentBalance(ledger) : { amount: 0, balanceType: "Debit" as const }),
    [ledger],
  );
  const ledgerType = useMemo(
    () => (ledger ? resolveLedgerType(ledger, records) : "General"),
    [ledger, records],
  );
  const meta = useMemo(
    () => (ledger ? loadLedgerMeta(ledger.id) : null),
    [ledger],
  );
  const masterLink = useMemo(
    () => (ledger ? resolveCoaMasterLink(ledger, records) : null),
    [ledger, records],
  );
  const isMasterOwned = ledger ? isMasterLinkedLedger(ledger, records) : false;
  const outstanding = useMemo(() => (ledger ? ledgerOutstanding(ledger) : 0), [ledger]);
  const transactions = useMemo(
    () => (ledger ? collectLedgerTransactions(ledger.id) : []),
    [ledger],
  );
  const statement = useMemo(
    () => (ledger ? buildLedgerStatement(ledger, transactions) : []),
    [ledger, transactions],
  );

  if (!ledger) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Masters", "Ledgers", "/accounts/masters/ledgers")}
        title="Ledger not found"
        description="This ledger may have been removed."
      >
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Link href="/accounts/masters/ledgers" className="text-brand-600 hover:underline">
            Back to Ledgers
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Masters", "Ledgers", "/accounts/masters/ledgers")}
      title={ledger.accountName}
      description={`${ledger.accountCode} · ${ledgerType} Ledger`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {masterLink && (
            <CoaMasterLinkActions
              ledgerId={ledger.id}
              link={masterLink}
              onViewTransactions={() => setTab("transactions")}
            />
          )}
          <button
            type="button"
            onClick={() => router.push(`/accounts/masters/chart-of-accounts?node=${ledger.id}`)}
            className="h-8 px-3 text-xs border border-border rounded-lg hover:bg-muted/40"
          >
            Open in COA
          </button>
        </div>
      }
      layout="split"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-border/60 bg-muted/10">
          <MiniKPICard
            label="Current Balance"
            value={formatMoney(balance.amount)}
            icon={IndianRupee}
            accent
          />
          <MiniKPICard label="Outstanding" value={formatMoney(outstanding)} icon={Scale} />
          <MiniKPICard label="Transactions" value={String(transactions.length)} icon={FileText} />
          <MiniKPICard label="Ledger Type" value={ledgerType} icon={BookOpen} />
        </div>

        <div className="flex-shrink-0 px-4 pt-3 border-b border-border/60">
          <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={{ transactions: transactions.length }} />
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === "overview" && (
            <div className="space-y-4 max-w-5xl">
              {masterLink && <CoaMasterLinkPanel ledgerId={ledger.id} link={masterLink} />}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Ledger Name", value: ledger.accountName },
                { label: "Ledger Type", value: ledgerType },
                { label: "Parent Group", value: parentGroupLabel(records, ledger) },
                {
                  label: "Opening Balance",
                  value: <MoneyAmount amount={ledger.openingBalance} side={ledger.balanceType} />,
                },
                {
                  label: "Current Balance",
                  value: <MoneyAmount amount={balance.amount} side={balance.balanceType} />,
                },
                { label: "Outstanding Amount", value: formatMoney(outstanding) },
                ...(!isMasterOwned && ledgerType === "Customer"
                  ? [
                      { label: "Customer Code", value: meta?.customerCode || "—" },
                      { label: "Credit Limit", value: meta?.creditLimit ? formatMoney(Number(meta.creditLimit)) : "—" },
                      { label: "Credit Days", value: meta?.creditDays || "—" },
                    ]
                  : []),
                ...(!isMasterOwned && ledgerType === "Vendor"
                  ? [
                      { label: "Vendor Code", value: meta?.vendorCode || "—" },
                      { label: "Payment Terms", value: meta?.paymentTerms || "—" },
                      { label: "TDS Applicable", value: meta?.tdsApplicableMeta ? "Yes" : "No" },
                    ]
                  : []),
                ...(!isMasterOwned && ledgerType === "Bank"
                  ? [
                      { label: "Bank Name", value: meta?.bankName || "—" },
                      { label: "Account Number", value: meta?.accountNumber || "—" },
                      { label: "IFSC", value: meta?.ifsc || "—" },
                      { label: "Reconciliation", value: meta?.reconciliationEnabled ? "Enabled" : "Disabled" },
                    ]
                  : []),
                ...(!isMasterOwned && ledgerType === "Expense"
                  ? [
                      { label: "Expense Category", value: meta?.expenseCategory || "—" },
                    ]
                  : []),
                ...(!isMasterOwned
                  ? [
                      { label: "GSTIN", value: meta?.gstin || (ledger.gstApplicable ? "On file" : "—") },
                      { label: "PAN", value: meta?.pan || "—" },
                      {
                        label: "Contact",
                        value: meta?.contactPerson
                          ? `${meta.contactPerson}${meta.mobile ? ` · ${meta.mobile}` : ""}`
                          : "—",
                      },
                      { label: "Email", value: meta?.email || "—" },
                    ]
                  : []),
                { label: "Branch", value: meta?.branch || "Head Office" },
                { label: "Status", value: <StatusBadge status={ledger.status} /> },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2.5"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    {item.label}
                  </p>
                  <div className="text-sm text-foreground">{item.value}</div>
                </div>
              ))}
              </div>
            </div>
          )}

          {tab === "transactions" && (
            <LedgerTable
              columns={["Date", "Voucher Type", "Voucher No", "Particulars", "Debit", "Credit"]}
              rows={transactions.map((t) => ({
                cells: [
                  t.date,
                  t.voucherType,
                  t.voucherNo,
                  t.particulars,
                  t.debit,
                  t.credit,
                ],
                href: t.href,
              }))}
              empty="No vouchers or invoices linked to this ledger yet."
            />
          )}

          {tab === "outstanding" && (
            <div className="max-w-lg space-y-3">
              <div className="rounded-lg border border-border/60 bg-white p-4">
                <p className="text-xs text-muted-foreground">Outstanding Amount</p>
                <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
                  {formatMoney(outstanding)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {ledgerType === "Customer"
                    ? "Open sales invoices and unreceived payments."
                    : ledgerType === "Vendor"
                      ? "Open purchase bills and unpaid amounts."
                      : "Outstanding applies mainly to customer and vendor ledgers."}
                </p>
              </div>
              {ledgerType === "Customer" && (
                <Link
                  href="/accounts/receivables/outstanding"
                  className="text-xs text-brand-600 hover:underline"
                >
                  View Customer Outstanding →
                </Link>
              )}
              {ledgerType === "Vendor" && (
                <Link
                  href="/accounts/payables/outstanding"
                  className="text-xs text-brand-600 hover:underline"
                >
                  View Vendor Outstanding →
                </Link>
              )}
            </div>
          )}

          {tab === "statement" && (
            <LedgerTable
              columns={[
                "Date",
                "Voucher Type",
                "Voucher No",
                "Particulars",
                "Debit",
                "Credit",
                "Running Balance",
              ]}
              rows={statement.map((r) => ({
                cells: [
                  r.date,
                  r.voucherType,
                  r.voucherNo,
                  r.particulars,
                  r.debit,
                  r.credit,
                  `${formatMoney(r.runningBalance)} ${r.balanceType === "Debit" ? "Dr" : "Cr"}`,
                ],
              }))}
              empty="No statement entries for this ledger."
            />
          )}
        </div>
      </div>
    </AccountsPageShell>
  );
}

function LedgerTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: { cells: (string | number)[]; href?: string }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[720px]">
        <thead className="bg-muted/20 border-b border-border/60 sticky top-0">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className={`px-3 py-2.5 font-semibold uppercase tracking-wide text-muted-foreground ${
                  c === "Debit" || c === "Credit" || c === "Running Balance" ? "text-right" : "text-left"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
              {row.cells.map((cell, j) => {
                const isMoney = j >= row.cells.length - 3 && typeof cell === "number";
                const content =
                  typeof cell === "number" ? (
                    <MoneyCell amount={cell} dashIfZero className="px-0 py-0 justify-end" />
                  ) : (
                    cell
                  );
                return (
                  <td
                    key={j}
                    className={`px-3 py-2.5 ${isMoney || (typeof cell === "string" && cell.includes("Dr")) ? "text-right" : ""}`}
                  >
                    {row.href && j === 2 ? (
                      <Link href={row.href} className="font-mono text-brand-700 hover:underline">
                        {cell}
                      </Link>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
