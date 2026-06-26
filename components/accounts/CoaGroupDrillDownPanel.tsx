"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import type { CoaGroupContext, CoaGroupContextKind, CoaPostingRow, GenericAccountingGroupContext } from "@/lib/accounts/coa-group-drilldown";
import { CoaGroupAccountingFooter } from "@/components/accounts/CoaGroupAccountingFooter";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";

function PostingEntriesTable({ rows, emptyLabel }: { rows: CoaPostingRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center px-6">{emptyLabel}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
        <tr>
          {["Date", "Voucher", "Reference", "Particulars", "Debit", "Credit"].map((h) => (
            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.voucherNo}-${i}`} className="border-b border-border/30 hover:bg-orange-50/20">
            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.date}</td>
            <td className="px-4 py-2.5 text-xs font-medium">{r.voucherNo}</td>
            <td className="px-4 py-2.5 text-xs">{r.reference}</td>
            <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{r.particulars}</td>
            <td className="px-4 py-2.5 text-xs text-right tabular-nums">
              {r.debit > 0 ? <MoneyCell amount={r.debit} /> : "—"}
            </td>
            <td className="px-4 py-2.5 text-xs text-right tabular-nums">
              {r.credit > 0 ? <MoneyCell amount={r.credit} /> : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DashboardShell({
  title,
  summary,
  actions,
  children,
}: {
  title: string;
  summary: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 border-t border-border/40">
      <div className="flex-shrink-0 px-6 py-4 bg-brand-50/20 border-b border-border/40">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800 mb-3">{title}</p>
        {summary}
        {actions && <div className="flex flex-wrap gap-2 mt-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function LedgerBalanceTable({
  rows,
  onSelect,
}: {
  rows: { id: number; name: string; balance: number }[];
  onSelect?: (id: number) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No ledgers under this group yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
        <tr>
          {["Ledger", "Balance"].map((h) => (
            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
            onClick={() => onSelect?.(r.id)}
          >
            <td className="px-4 py-2.5 text-xs font-medium">{r.name}</td>
            <MoneyCell amount={r.balance} className="px-4 py-2.5" />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SummaryField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function LedgerList({
  ledgers,
  onSelect,
}: {
  ledgers: ChartOfAccount[];
  onSelect?: (ledger: ChartOfAccount) => void;
}) {
  const router = useRouter();
  if (ledgers.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No ledgers under this group yet.</p>;
  }
  return (
    <div className="divide-y divide-border/30">
      {ledgers.map((l) => {
        const bal = computeLedgerCurrentBalance(l);
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => (onSelect ? onSelect(l) : router.push(`/accounts/masters/ledgers/${l.id}`))}
            className="w-full flex items-center justify-between gap-4 px-6 py-3 text-left hover:bg-orange-50/30 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{l.accountName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{l.accountCode}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <MoneyAmount amount={bal.amount} side={bal.balanceType} className="text-[13px]" />
              <StatusBadge status={l.status} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function isNamedAccountingGroup(ctx: CoaGroupContext): ctx is GenericAccountingGroupContext {
  if (!ctx) return false;
  return "accounting" in ctx && "highlights" in ctx && "entryNote" in ctx;
}

const GENERIC_KINDS = new Set<CoaGroupContextKind>([
  "generic_accounting",
  "capital_account",
  "loans_borrowings",
  "provisions",
  "direct_income",
  "indirect_income",
  "direct_expenses",
  "salary_payable",
  "expenses_payable",
  "customer_advances",
  "cogs",
  "selling_expenses",
  "finance_costs",
  "legal_professional",
  "statutory_compliance",
  "depreciation",
  "miscellaneous_expenses",
]);

function defaultTabForKind(kind: CoaGroupContextKind): string {
  switch (kind) {
    case "sales":
    case "purchases":
    case "gst_payable":
    case "gst_output":
      return "postings";
    case "trade_receivables":
    case "trade_payables":
      return "outstanding";
    case "bank_accounts":
    case "accrued_income":
    case "cash_in_hand":
    case "deposits":
    case "loans_advances":
    case "other_current_assets":
    case "prepaid_expenses":
      return "register";
    case "inventory":
      return "valuation";
    default:
      return "ledgers";
  }
}

export function CoaGroupDrillDownPanel({
  context,
  onSelectLedger,
  onSelectLedgerById,
  onViewLedgerStatement,
}: {
  context: CoaGroupContext;
  onSelectLedger?: (ledger: ChartOfAccount) => void;
  onSelectLedgerById?: (ledgerId: number) => void;
  onViewLedgerStatement?: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const groupKind = context?.kind;
  const groupNodeId = context?.nodeId;
  useEffect(() => {
    if (!groupKind) return;
    setTab(defaultTabForKind(groupKind));
  }, [groupKind, groupNodeId]);
  if (!context) return null;

  if (context.kind === "inventory") {
    return (
      <DashboardShell
        title="Inventory / Stock-in-Hand"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Inventory Value" value={formatMoney(context.inventoryValue)} />
            <SummaryField label="Available Quantity" value={context.availableQuantity.toLocaleString()} />
            <SummaryField label="Near Expiry Value" value={formatMoney(context.nearExpiryValue)} />
            <SummaryField label="Expired Stock Value" value={formatMoney(context.expiredValue)} />
          </div>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/warehouse/batch-register">Stock Ledger</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/warehouse/batch-register">Batch Register</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/reports/stock-valuation">Stock Valuation</Link>
            </Button>
            <Button asChild size="sm" className="h-8 text-xs bg-brand-600 text-white">
              <Link href="/masters/products">Open Product Master</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
              <tr>
                {["Product", "Available Qty", "UOM", "CP", "Value"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {context.productRows.map((r) => (
                <tr key={r.sku} className="border-b border-border/30 hover:bg-orange-50/20">
                  <td className="px-4 py-2.5 text-xs font-medium">{r.product}</td>
                  <td className="px-4 py-2.5 text-xs tabular-nums">{r.availableQty.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs">{r.uom || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {r.cpMissing ? (
                      <span className="text-amber-700">CP missing</span>
                    ) : (
                      <MoneyCell amount={r.costPrice} />
                    )}
                  </td>
                  <MoneyCell amount={r.inventoryValue} className="px-4 py-2.5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "trade_receivables") {
    const pickCustomer = (ledgerId: number) => {
      const ledger = context.customerLedgers.find((l) => l.id === ledgerId);
      if (ledger) onSelectLedger?.(ledger);
      else onSelectLedgerById?.(ledgerId);
    };
    return (
      <DashboardShell
        title="Trade Receivables / Sundry Debtors"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Total Customers" value={context.totalCustomers} />
            <SummaryField label="Total Outstanding" value={formatMoney(context.totalOutstanding)} />
            <SummaryField label="Overdue Amount" value={formatMoney(context.overdueAmount)} />
            <SummaryField label="Not Due Amount" value={formatMoney(context.notDueAmount)} />
          </div>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/receivables/outstanding">Customer Ledger</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/receivables/outstanding">Outstanding Report</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/receivables/ageing">Aging Report</Link>
            </Button>
            <Button asChild size="sm" className="h-8 text-xs bg-brand-600 text-white">
              <Link href="/masters/customers">Open Customer Master</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
              <tr>
                {["Customer", "Outstanding", "Aging Days"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {context.outstandingRows.map((r) => (
                <tr
                  key={r.ledgerId}
                  className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
                  onClick={() => pickCustomer(r.ledgerId)}
                >
                  <td className="px-4 py-2.5 text-xs font-medium">{r.customerName}</td>
                  <MoneyCell amount={r.outstanding} className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-xs tabular-nums">{r.agingDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "trade_payables") {
    return (
      <div className="flex flex-col flex-1 min-h-0 border-t border-border/40 overflow-auto">
        <DashboardShell
          title="Trade Payables / Sundry Creditors"
          summary={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryField label="Total Suppliers" value={context.totalVendors} />
              <SummaryField label="Total Outstanding" value={formatMoney(context.totalPayable)} />
              <SummaryField label="Due This Week" value={formatMoney(context.dueThisWeek)} />
              <SummaryField label="Overdue Payable" value={formatMoney(context.overdueBills)} />
            </div>
          }
          actions={
            <>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link href="/accounts/payables/outstanding">View Supplier Ledger</Link>
              </Button>
              <Button asChild size="sm" className="h-8 text-xs bg-brand-600 text-white">
                <Link href="/masters/vendors">Open Supplier Master</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link href="/accounts/vouchers/payment/new">Create Payment</Link>
              </Button>
            </>
          }
        >
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
              <tr>
                {["Supplier", "Outstanding", "Last Bill", "Due Date", "Aging"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {context.outstandingRows.map((r) => (
                <tr
                  key={r.ledgerId}
                  className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
                  onClick={() => onSelectLedgerById?.(r.ledgerId)}
                >
                  <td className="px-4 py-2.5 text-xs font-medium">{r.vendorName}</td>
                  <MoneyCell amount={r.outstanding} className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-xs">{r.lastBill}</td>
                  <td className="px-4 py-2.5 text-xs">{r.dueDate}</td>
                  <td className="px-4 py-2.5 text-xs tabular-nums">{r.agingDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardShell>
        <CoaGroupAccountingFooter
          accounting={context.accounting}
          onSelectLedger={onSelectLedgerById}
          hideLedgerList
        />
      </div>
    );
  }

  if (context.kind === "bank_accounts") {
    return (
      <DashboardShell
        title="Bank Accounts"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Total Bank Accounts" value={context.totalBankAccounts} />
            <SummaryField label="Total Bank Balance" value={formatMoney(context.totalBankBalance)} />
            <SummaryField label="Today's Receipts" value={formatMoney(context.todaysReceipts)} />
            <SummaryField label="Today's Payments" value={formatMoney(context.todaysPayments)} />
          </div>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/reports/bank-book">View Ledger</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/reports/bank-book">View Transactions</Link>
            </Button>
            <Button asChild size="sm" className="h-8 text-xs bg-brand-600 text-white">
              <Link href="/accounts/banking/bank-accounts">Open Banking Module</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
              <tr>
                {["Bank Name", "Account No", "Opening Balance", "Current Balance"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {context.bankList.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
                  onClick={() => router.push(b.bankingHref)}
                >
                  <td className="px-4 py-2.5 text-xs font-medium">{b.name}</td>
                  <td className="px-4 py-2.5 text-xs font-mono">{b.accountNumber}</td>
                  <MoneyCell amount={b.openingBalance} className="px-4 py-2.5" />
                  <MoneyCell amount={b.currentBalance} className="px-4 py-2.5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "sales") {
    return (
      <div className="flex flex-col flex-1 min-h-0 border-t border-border/40">
        <div className="flex-shrink-0 px-6 py-4 bg-brand-50/20 border-b border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800 mb-3">Sales</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Total Sales" value={formatMoney(context.totalSales)} />
            <SummaryField label="Taxable Sales" value={formatMoney(context.taxableSales)} />
            <SummaryField label="GST Output" value={formatMoney(context.gstOutput)} />
            <SummaryField label="Pending Tax Invoices" value={context.pendingTaxInvoices} />
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 px-6 border-b border-border/40">
            <TabsList className="bg-transparent p-0 h-auto border-0 gap-4">
              <TabsTrigger value="postings" className="text-sm data-[state=active]:text-orange-700">Posted Entries</TabsTrigger>
              <TabsTrigger value="ledgers" className="text-sm data-[state=active]:text-orange-700">Sales Ledgers</TabsTrigger>
              <TabsTrigger value="register" className="text-sm data-[state=active]:text-orange-700">Sales Register</TabsTrigger>
              <TabsTrigger value="invoices" className="text-sm data-[state=active]:text-orange-700">Sales Invoices</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="postings" className="flex-1 overflow-auto m-0">
            <PostingEntriesTable rows={context.postedEntries} emptyLabel="No posted sales entries yet." />
          </TabsContent>
          <TabsContent value="ledgers" className="flex-1 overflow-auto m-0">
            <LedgerList ledgers={context.salesLedgers} onSelect={onSelectLedger} />
          </TabsContent>
          <TabsContent value="register" className="flex-1 overflow-auto m-0 p-6">
            <Button asChild size="sm" className="h-8 text-xs bg-brand-600 text-white">
              <Link href="/accounts/reports/sales-register">Sales Register</Link>
            </Button>
          </TabsContent>
          <TabsContent value="invoices" className="flex-1 overflow-auto m-0 p-6">
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link href="/accounts/transactions/invoices">Sales Invoices</Link>
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (context.kind === "purchases") {
    return (
      <div className="flex flex-col flex-1 min-h-0 border-t border-border/40">
        <div className="flex-shrink-0 px-6 py-4 bg-brand-50/20 border-b border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800 mb-3">Purchases</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Total Purchases" value={formatMoney(context.totalPurchases)} />
            <SummaryField label="Taxable Purchases" value={formatMoney(context.taxablePurchases)} />
            <SummaryField label="GST Input" value={formatMoney(context.gstInput)} />
            <SummaryField label="Pending Supplier Bills" value={context.pendingVendorBills} />
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 px-6 border-b border-border/40">
            <TabsList className="bg-transparent p-0 h-auto border-0 gap-4">
              <TabsTrigger value="postings" className="text-sm data-[state=active]:text-orange-700">Posted Entries</TabsTrigger>
              <TabsTrigger value="ledgers" className="text-sm data-[state=active]:text-orange-700">Purchase Ledgers</TabsTrigger>
              <TabsTrigger value="register" className="text-sm data-[state=active]:text-orange-700">Purchase Register</TabsTrigger>
              <TabsTrigger value="invoices" className="text-sm data-[state=active]:text-orange-700">Purchase Invoices</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="postings" className="flex-1 overflow-auto m-0">
            <PostingEntriesTable rows={context.postedEntries} emptyLabel="No posted purchase entries yet." />
          </TabsContent>
          <TabsContent value="ledgers" className="flex-1 overflow-auto m-0">
            <LedgerList ledgers={context.purchaseLedgers} onSelect={onSelectLedger} />
          </TabsContent>
          <TabsContent value="register" className="flex-1 overflow-auto m-0 p-6">
            <Button asChild size="sm" className="h-8 text-xs bg-brand-600 text-white">
              <Link href="/accounts/reports/purchase-register">Purchase Register</Link>
            </Button>
          </TabsContent>
          <TabsContent value="invoices" className="flex-1 overflow-auto m-0 p-6">
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link href="/accounts/transactions/purchase">Purchase Invoices</Link>
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (context.kind === "gst_payable" || context.kind === "gst_output") {
    const title = context.kind === "gst_output" ? "Output GST" : "GST Input";
    return (
      <div className="flex flex-col flex-1 min-h-0 border-t border-border/40">
        <div className="flex-shrink-0 px-6 py-4 bg-brand-50/20 border-b border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800 mb-3">{title}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <SummaryField label="Balance" value={formatMoney(context.totalGstPayable)} />
            <SummaryField label="Output GST" value={formatMoney(context.outputGst)} />
            <SummaryField label="Input GST" value={formatMoney(context.inputGstCredit)} />
            <SummaryField label="Net" value={formatMoney(context.netPayable)} />
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link href="/accounts/reports/gst">GST Summary Report</Link>
          </Button>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 px-6 border-b border-border/40">
            <TabsList className="bg-transparent p-0 h-auto border-0 gap-4">
              <TabsTrigger value="postings" className="text-sm data-[state=active]:text-orange-700">GST Postings</TabsTrigger>
              <TabsTrigger value="ledgers" className="text-sm data-[state=active]:text-orange-700">GST Ledgers</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="postings" className="flex-1 overflow-auto m-0">
            <PostingEntriesTable rows={context.postedEntries} emptyLabel="No GST postings yet." />
          </TabsContent>
          <TabsContent value="ledgers" className="flex-1 overflow-auto m-0">
            <LedgerList ledgers={context.gstLedgers} onSelect={onSelectLedger} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (context.kind === "employee_costs" || context.kind === "admin_expenses") {
    const title = context.kind === "employee_costs" ? "Employee Costs" : "Administrative Expenses";
    return (
      <div className="flex flex-col flex-1 min-h-0 border-t border-border/40">
        <div className="flex-shrink-0 px-6 py-4 bg-brand-50/20 border-b border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800 mb-3">{title}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryField label="Total Expense" value={formatMoney(context.totalExpense)} />
            <SummaryField label="Ledgers" value={context.ledgerCount} />
            <SummaryField label="Transactions" value={context.transactionCount} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <LedgerList ledgers={context.expenseLedgers} onSelect={onSelectLedger} />
        </div>
      </div>
    );
  }

  if (context.kind === "accrued_income") {
    return (
      <DashboardShell
        title="Accrued Income"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Total Accrued Income" value={formatMoney(context.totalAccruedIncome)} />
            <SummaryField label="Current Month Accrued" value={formatMoney(context.currentMonthAccrued)} />
            <SummaryField label="Pending Recognition" value={formatMoney(context.pendingRecognition)} />
            <SummaryField label="Recognized This Month" value={formatMoney(context.recognizedThisMonth)} />
          </div>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onViewLedgerStatement}>
              View Ledger
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/vouchers">View Transactions</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/vouchers/journal">Journal Entries</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <LedgerBalanceTable
            rows={context.ledgerRows}
            onSelect={(id) => onSelectLedgerById?.(id)}
          />
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "cash_in_hand") {
    return (
      <DashboardShell
        title="Cash-in-Hand"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Main Cash Balance" value={formatMoney(context.mainCashBalance)} />
            <SummaryField label="Petty Cash Balance" value={formatMoney(context.pettyCashBalance)} />
            <SummaryField label="Branch Cash Balance" value={formatMoney(context.branchCashBalance)} />
            <SummaryField label="Total Cash" value={formatMoney(context.totalCash)} />
          </div>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onViewLedgerStatement}>
              View Cash Ledger
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/vouchers">Cash Transactions</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/reports/cash-book">Cash Book</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <LedgerBalanceTable rows={context.ledgerRows} onSelect={(id) => onSelectLedgerById?.(id)} />
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "deposits") {
    return (
      <DashboardShell
        title="Deposits"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Total Deposits" value={formatMoney(context.totalDeposits)} />
            <SummaryField label="Security Deposits" value={formatMoney(context.securityDeposits)} />
            <SummaryField label="Rental Deposits" value={formatMoney(context.rentalDeposits)} />
            <SummaryField label="Other Deposits" value={formatMoney(context.otherDeposits)} />
          </div>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onViewLedgerStatement}>
              View Ledger
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/reports/ledger">Deposit Register</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
              <tr>
                {["Deposit Name", "Amount", "Due Date"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {context.registerRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
                  onClick={() => onSelectLedgerById?.(r.id)}
                >
                  <td className="px-4 py-2.5 text-xs font-medium">{r.name}</td>
                  <MoneyCell amount={r.amount} className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-xs">{r.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "loans_advances") {
    return (
      <DashboardShell
        title="Loans & Advances Given"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryField label="Total Outstanding" value={formatMoney(context.totalOutstanding)} />
            <SummaryField label="Employee Advances" value={formatMoney(context.employeeAdvances)} />
            <SummaryField label="Supplier Advances" value={formatMoney(context.vendorAdvances)} />
            <SummaryField label="Other Advances" value={formatMoney(context.otherAdvances)} />
          </div>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onViewLedgerStatement}>
              View Ledger
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/reports/ledger">Recovery Tracking</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
              <tr>
                {["Party", "Type", "Outstanding"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {context.outstandingRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
                  onClick={() => onSelectLedgerById?.(r.id)}
                >
                  <td className="px-4 py-2.5 text-xs font-medium">{r.party}</td>
                  <td className="px-4 py-2.5 text-xs">{r.type}</td>
                  <MoneyCell amount={r.outstanding} className="px-4 py-2.5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "other_current_assets") {
    return (
      <DashboardShell
        title="Other Current Assets"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryField label="Total Balance" value={formatMoney(context.totalBalance)} />
            <SummaryField label="Active Ledgers" value={context.activeLedgers} />
            <SummaryField label="Current Month Movement" value={formatMoney(context.currentMonthMovement)} />
          </div>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/reports/ledger">Ledger Statement</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/vouchers">Transactions</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <LedgerBalanceTable rows={context.ledgerRows} onSelect={(id) => onSelectLedgerById?.(id)} />
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "prepaid_expenses") {
    return (
      <DashboardShell
        title="Prepaid Expenses"
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryField label="Total Prepaid Expenses" value={formatMoney(context.totalPrepaid)} />
            <SummaryField label="Current Month Amortization" value={formatMoney(context.currentMonthAmortization)} />
            <SummaryField label="Remaining Balance" value={formatMoney(context.remainingBalance)} />
          </div>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onViewLedgerStatement}>
              View Ledger
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/accounts/reports/ledger">Amortization Schedule</Link>
            </Button>
          </>
        }
      >
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
              <tr>
                {["Expense", "Original Amount", "Balance Remaining"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {context.scheduleRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
                  onClick={() => onSelectLedgerById?.(r.id)}
                >
                  <td className="px-4 py-2.5 text-xs font-medium">{r.expense}</td>
                  <MoneyCell amount={r.originalAmount} className="px-4 py-2.5" />
                  <MoneyCell amount={r.balanceRemaining} className="px-4 py-2.5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "customer_ledger") {
    return (
      <DashboardShell
        title={context.nodeName}
        summary={
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <SummaryField label="Opening Balance" value={formatMoney(context.openingBalance)} />
            <SummaryField label="Current Outstanding" value={formatMoney(context.outstanding)} />
          </div>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onViewLedgerStatement}>
              View Ledger
            </Button>
            {context.customerMasterHref && (
              <Button asChild size="sm" className="h-8 text-xs bg-brand-600 text-white">
                <Link href={context.customerMasterHref}>Open Customer Master</Link>
              </Button>
            )}
          </>
        }
      >
        <div className="flex-1 overflow-auto px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Recent Invoices
            </p>
            {context.recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b">
                  <tr>
                    {["Date", "Invoice", "Amount"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {context.recentInvoices.map((inv) => (
                    <tr key={inv.invoiceNo} className="border-b border-border/30">
                      <td className="px-3 py-2 text-xs">{inv.date}</td>
                      <td className="px-3 py-2 text-xs">{inv.invoiceNo}</td>
                      <MoneyCell amount={inv.amount} className="px-3 py-2" />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Recent Receipts
            </p>
            {context.recentReceipts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No receipts yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b">
                  <tr>
                    {["Date", "Voucher", "Amount"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {context.recentReceipts.map((r) => (
                    <tr key={r.voucher} className="border-b border-border/30">
                      <td className="px-3 py-2 text-xs">{r.date}</td>
                      <td className="px-3 py-2 text-xs">{r.voucher}</td>
                      <MoneyCell amount={r.amount} className="px-3 py-2" />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (context.kind === "vendor_ledger") {
    return (
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/40 bg-brand-50/20">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800 mb-3">
          Supplier Ledger — {context.nodeName}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryField label="Outstanding" value={formatMoney(context.outstanding)} />
          <SummaryField label="Bills" value={context.billCount} />
          <SummaryField label="Payments" value={context.paymentCount} />
          <div className="flex items-end">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs w-full">
              <Link href="/accounts/payables/ageing">Ageing</Link>
            </Button>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs w-full" onClick={onViewLedgerStatement}>
              Ledger Statement
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isNamedAccountingGroup(context) && GENERIC_KINDS.has(context.kind)) {
    return (
      <div className="flex flex-col flex-1 min-h-0 border-t border-border/40 overflow-auto">
        <DashboardShell
          title={context.nodeName}
          summary={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {context.highlights.map((h) => (
                <SummaryField
                  key={h.label}
                  label={h.label}
                  value={typeof h.value === "number" && h.label.toLowerCase().includes("ledger") || h.label.includes("Count") || h.label.includes("Invoices") || h.label.includes("Bills") || h.label.includes("Ledgers") || h.label.includes("Vendors") || h.label.includes("Employees")
                    ? h.value
                    : formatMoney(h.value)}
                />
              ))}
            </div>
          }
        >
          <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border/30">
            Entry: {context.entryNote}
          </p>
        </DashboardShell>
        <CoaGroupAccountingFooter
          accounting={context.accounting}
          onSelectLedger={onSelectLedgerById}
        />
      </div>
    );
  }

  return null;
}
