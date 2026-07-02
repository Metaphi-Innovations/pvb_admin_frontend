"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Truck,
  FileMinus,
  FilePlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Search,
  Calendar,
  Building2,
} from "lucide-react";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
  ACCOUNTS_ACTION_BTN_CLASS,
} from "@/components/accounts/AccountsTableActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  loadPurchaseInvoices,
  getGrnsPendingInvoice,
  type PurchaseInvoiceRecord,
} from "./purchase-invoices-data";
import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";

type Tab = "invoices" | "grn_pending";

function paymentStatus(inv: PurchaseInvoiceRecord) {
  if (inv.amountPaid >= inv.grandTotal && inv.grandTotal > 0) return "paid";
  if (inv.amountPaid > 0) return "partial";
  return "unpaid";
}

function PaymentBadge({ inv }: { inv: PurchaseInvoiceRecord }) {
  const st = paymentStatus(inv);
  if (st === "paid")
    return <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>;
  if (st === "partial")
    return <Badge className="text-[10px] h-5 bg-amber-100 text-amber-700 border-amber-200">Partial</Badge>;
  return <Badge className="text-[10px] h-5 bg-red-100 text-red-700 border-red-200">Unpaid</Badge>;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "po_invoice")
    return <Badge variant="outline" className="text-[10px] h-5 text-blue-700 border-blue-200 bg-blue-50">GRN</Badge>;
  return <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">Manual</Badge>;
}

function EstimatedValue(grn: GrnRecord) {
  // Estimate ₹1800/bag for fertilizers, ₹350/kg for seeds, ₹900/ltr for pesticides
  const est = grn.items.reduce((s, item) => {
    const u = item.unit?.toLowerCase() ?? "";
    const rate = u === "bag" ? 1800 : u === "kg" ? 350 : u === "ltr" ? 900 : 500;
    return s + item.receivedQty * rate;
  }, 0);
  return est;
}

export default function PurchaseInvoiceListClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("invoices");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const invoices = useMemo(() => loadPurchaseInvoices(), []);
  const pendingGrns = useMemo(() => getGrnsPendingInvoice(), []);

  const filtered = useMemo(() => {
    let list = invoices;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoiceNo.toLowerCase().includes(q) ||
          i.vendorInvoiceNo.toLowerCase().includes(q) ||
          i.vendorName.toLowerCase().includes(q) ||
          i.grnNo.toLowerCase().includes(q),
      );
    }
    if (dateFrom) list = list.filter((i) => i.invoiceDate >= dateFrom);
    if (dateTo) list = list.filter((i) => i.invoiceDate <= dateTo);
    return list;
  }, [invoices, search, dateFrom, dateTo]);

  const outstanding = invoices.reduce(
    (s, i) => s + Math.max(0, i.grandTotal - i.amountPaid),
    0,
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Purchase Invoices")}
      title="Purchase Invoices"
      description="Create and manage supplier purchase bills. Link to GRN or enter manually."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => router.push("/accounts/purchase-invoices/new?mode=grn")}
          >
            <Truck className="w-3.5 h-3.5" />
            From GRN
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 text-white"
            onClick={() => router.push("/accounts/purchase-invoices/new?mode=manual")}
          >
            <Plus className="w-3.5 h-3.5" />
            Manual Entry
          </Button>
        </div>
      }
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Invoices" value={String(invoices.length)} icon={FileText} color="blue" />
        <StatCard
          label="GRN Pending Invoice"
          value={String(pendingGrns.length)}
          icon={Truck}
          color={pendingGrns.length > 0 ? "amber" : "green"}
        />
        <StatCard
          label="Outstanding Payable"
          value={formatMoney(outstanding)}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          label="Paid This Month"
          value={formatMoney(invoices.reduce((s, i) => s + i.amountPaid, 0))}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border/60">
        <TabBtn active={tab === "invoices"} onClick={() => setTab("invoices")}>
          <FileText className="w-3.5 h-3.5" />
          All Invoices
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
            {invoices.length}
          </span>
        </TabBtn>
        <TabBtn active={tab === "grn_pending"} onClick={() => setTab("grn_pending")}>
          <Truck className="w-3.5 h-3.5" />
          GRN Pending Invoice
          {pendingGrns.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {pendingGrns.length}
            </span>
          )}
        </TabBtn>
      </div>

      {/* All Invoices tab */}
      {tab === "invoices" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="h-8 text-xs pl-8"
                placeholder="Search invoice, supplier, GRN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <AccountsListingDateFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No purchase invoices yet"
              desc="Create your first invoice from a GRN or enter manually."
              action={
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => router.push("/accounts/purchase-invoices/new?mode=grn")}>
                    From GRN
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={() => router.push("/accounts/purchase-invoices/new?mode=manual")}>
                    Manual Entry
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="rounded-lg border border-border/60 overflow-hidden bg-white">
              <table className="accounts-table w-full text-xs">
                <thead className="border-b border-border/60">
                  <tr>
                    <Th>Invoice No</Th>
                    <Th>Supplier Invoice</Th>
                    <Th>Supplier</Th>
                    <Th>Date</Th>
                    <Th>GRN</Th>
                    <Th>Source</Th>
                    <Th className="text-right">Grand Total</Th>
                    <Th className="text-right">Paid</Th>
                    <Th className="text-right">Outstanding</Th>
                    <Th>Status</Th>
                    <Th className={accountsActionColClass("multi")}>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filtered.map((inv) => {
                    const outstanding = Math.max(0, inv.grandTotal - inv.amountPaid);
                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-semibold text-brand-700">
                          <Link href={`/accounts/purchase-invoices/${inv.id}`} className="hover:underline">
                            {inv.invoiceNo}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{inv.vendorInvoiceNo || "—"}</td>
                        <td className="px-3 py-2.5 font-medium">{inv.vendorName}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {inv.invoiceDate}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {inv.grnNo ? (
                            <span className="font-mono text-blue-700">{inv.grnNo}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <SourceBadge source={inv.source} />
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                          {formatMoney(inv.grandTotal)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">
                          {formatMoney(inv.amountPaid)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-red-600 font-semibold">
                          {formatMoney(outstanding)}
                        </td>
                        <td className="px-3 py-2.5">
                          <PaymentBadge inv={inv} />
                        </td>
                        <td className={cn("px-3 py-2.5", accountsActionColClass("multi"))}>
                          <AccountsTableActionCell>
                            <AccountsViewAction href={`/accounts/purchase-invoices/${inv.id}`} />
                            {inv.source === "manual_entry" && (
                              <AccountsEditAction href={`/accounts/purchase-invoices/${inv.id}/edit`} />
                            )}
                            <Link
                              href={`/accounts/debit-notes/new?purchaseInvoiceId=${inv.id}`}
                              title="Debit Note"
                              className={ACCOUNTS_ACTION_BTN_CLASS}
                            >
                              <FileMinus className="w-3.5 h-3.5 text-muted-foreground" />
                            </Link>
                          </AccountsTableActionCell>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GRN Pending Invoice tab */}
      {tab === "grn_pending" && (
        <div className="space-y-3">
          {pendingGrns.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All GRNs have invoices"
              desc="Every received GRN already has a purchase invoice created."
            />
          ) : (
            <div className="rounded-lg border border-border/60 overflow-hidden bg-white">
              <div className="px-4 py-2.5 border-b border-border/40 bg-amber-50 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs text-amber-700 font-medium">
                  {pendingGrns.length} GRN{pendingGrns.length > 1 ? "s" : ""} received but invoice not yet created
                </span>
              </div>
              <table className="accounts-table w-full text-xs">
                <thead className="border-b border-border/60">
                  <tr>
                    <Th>GRN No</Th>
                    <Th>PO Number</Th>
                    <Th>Supplier</Th>
                    <Th>Warehouse</Th>
                    <Th>Receipt Date</Th>
                    <Th className="text-center">Total Qty</Th>
                    <Th className="text-right">Est. Value</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {pendingGrns.map((grn) => {
                    const estValue = EstimatedValue(grn);
                    return (
                      <tr key={grn.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-700">{grn.grnNo}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{grn.poNumber || "—"}</td>
                        <td className="px-3 py-2.5 font-medium">{grn.vendorName}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {grn.warehouse}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {grn.grnDate}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Package className="w-3 h-3 text-muted-foreground" />
                            <span className="tabular-nums">{grn.totalQty}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-muted-foreground">
                          ~{formatMoney(estValue)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-brand-600 text-white gap-1"
                            onClick={() =>
                              router.push(`/accounts/purchase-invoices/new?mode=grn&grnId=${grn.id}`)
                            }
                          >
                            <Plus className="w-3 h-3" />
                            Create Invoice
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AccountsPageShell>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: "blue" | "amber" | "green" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 opacity-70" />
        <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted/60 p-4 mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">{desc}</p>
      {action}
    </div>
  );
}
