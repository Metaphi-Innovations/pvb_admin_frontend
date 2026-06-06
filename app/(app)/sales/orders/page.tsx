"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3, Plus, Download, Search, SlidersHorizontal, X,
  MoreVertical, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2,
  CheckCircle2, TrendingUp, ShoppingBag, Split, FileText, Package, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CancelOrderDialog from "./components/CancelOrderDialog";
import PackingListDialog from "./components/PackingListDialog";
import { downloadProformaInvoice } from "./pi-document";
import {
  type SalesOrder,
  type OrderStatus,
  loadOrders,
  formatOrderStatus,
  ORDER_STATUS_OPTIONS,
  canEditOrder,
  canSplitOrder,
  canCancelOrder,
  canDownloadPI,
  canGeneratePackingList,
  hydrateOrderLineItems,
} from "./orders-data";

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  draft:              { bg: "bg-slate-100",    text: "text-slate-600",   dot: "bg-slate-400"   },
  pending_approval:   { bg: "bg-amber-50",     text: "text-amber-700",   dot: "bg-amber-400"   },
  approved:           { bg: "bg-emerald-50",   text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected:           { bg: "bg-red-50",       text: "text-red-700",     dot: "bg-red-400"     },
  confirmed:          { bg: "bg-blue-50",      text: "text-blue-700",    dot: "bg-blue-500"    },
  dispatched:         { bg: "bg-amber-50",     text: "text-amber-700",   dot: "bg-amber-400"   },
  delivered:          { bg: "bg-emerald-50",   text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled:          { bg: "bg-red-50",       text: "text-red-700",     dot: "bg-red-400"     },
};

const FILTER_STATUSES: OrderStatus[] = [
  ...ORDER_STATUS_OPTIONS.map(o => o.value),
  "dispatched",
  "delivered",
];

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {formatOrderStatus(status as OrderStatus)}
    </span>
  );
}

function SortTh({ label, colKey, sortKey, sortDir, onSort, className }: {
  label: string; colKey: string; sortKey: string; sortDir: "asc" | "desc";
  onSort: (k: string) => void; className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th onClick={() => onSort(colKey)}
      className={cn("px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60", className)}>
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active
          ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />}
      </div>
    </th>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  destructive,
  disabled,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
        disabled
          ? "text-muted-foreground/50 cursor-not-allowed"
          : destructive
            ? "text-red-600 hover:bg-red-50"
            : "text-foreground hover:bg-muted/60",
      )}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState("orderDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [cancelOrder, setCancelOrder] = useState<SalesOrder | null>(null);
  const [packingOrder, setPackingOrder] = useState<SalesOrder | null>(null);

  const refreshOrders = () => setOrders(loadOrders());

  useEffect(() => {
    refreshOrders();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleStatus = (s: string) =>
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const filtered = useMemo(() => {
    let d = orders.filter(o => {
      const q = search.toLowerCase();
      return !q || o.soNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.territory.toLowerCase().includes(q);
    });
    if (filterStatus.length) d = d.filter(o => filterStatus.includes(o.status));
    d = [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return d;
  }, [orders, search, filterStatus, sortKey, sortDir]);

  const kpi = {
    total: orders.length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    dispatched: orders.filter(o => o.status === "dispatched").length,
    delivered: orders.filter(o => o.status === "delivered").length,
    totalValue: orders.reduce((s, o) => s + o.totalAmount, 0),
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Sales Orders</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage customer orders and fulfillment</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <Link
              href="/sales/orders/add"
              className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Order
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Orders", value: kpi.total, icon: ShoppingBag, accent: true },
            { label: "Confirmed", value: kpi.confirmed, icon: CheckCircle2 },
            { label: "Dispatched", value: kpi.dispatched, icon: TrendingUp },
            { label: "Delivered", value: kpi.delivered, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}>
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search orders, customers…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="relative">
            <button onClick={() => setFilterOpen(p => !p)}
              className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                filterStatus.length ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
              {filterStatus.length > 0 && <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">{filterStatus.length}</span>}
            </button>
            {filterOpen && (
              <div className="absolute top-9 left-0 z-50 bg-white border border-border rounded-xl shadow-lg w-52 p-0">
                <div className="px-3 py-2.5 border-b border-border"><p className="text-xs font-semibold">Filter by Status</p></div>
                <div className="px-3 py-2.5 space-y-2">
                  {[...new Set(FILTER_STATUSES)].map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                        checked={filterStatus.includes(s)} onChange={() => toggleStatus(s)} />
                      <span className="text-xs">{formatOrderStatus(s)}</span>
                    </label>
                  ))}
                </div>
                {filterStatus.length > 0 && (
                  <div className="px-3 py-2 border-t border-border">
                    <button onClick={() => setFilterStatus([])} className="text-xs text-brand-600 hover:underline">Clear filter</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {filterStatus.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {formatOrderStatus(s as OrderStatus)} <button onClick={() => toggleStatus(s)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <p className="text-xs text-muted-foreground ml-auto">{filtered.length} of {orders.length} orders</p>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="SO Number" colKey="soNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Customer" colKey="customerName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Territory" colKey="territory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Items" colKey="items" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Amount" colKey="totalAmount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Order Date" colKey="orderDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="flex flex-col items-center gap-2 py-16">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No orders found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your search or filters.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(order => {
                  const hydrated = hydrateOrderLineItems(order);
                  const editable = canEditOrder(hydrated);
                  const splittable = canSplitOrder(hydrated);
                  const cancellable = canCancelOrder(hydrated);
                  const piAllowed = canDownloadPI(hydrated);
                  const packingAllowed = canGeneratePackingList(hydrated);

                  return (
                    <tr key={order.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs font-semibold text-brand-700">{order.soNumber}</span>
                        {order.parentOrderNumber && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">Split from {order.parentOrderNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <p className="text-xs font-semibold text-foreground">{order.customerName}</p>
                        <p className="text-[11px] text-muted-foreground">{order.customerCode}</p>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{order.territory}</td>
                      <td className="px-4 py-2 text-xs text-foreground text-center">{order.items}</td>
                      <td className="px-4 py-2 text-xs font-semibold text-foreground">₹{order.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <StatusPill status={order.status} />
                        {order.packingListNumber && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{order.packingListNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{order.orderDate}</td>
                      <td className="px-4 py-2.5 text-right flex-shrink-0 w-12">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <ActionButton
                              icon={Eye}
                              label="View"
                              onClick={() => router.push(`/sales/orders/${order.id}`)}
                            />
                            <ActionButton
                              icon={Edit}
                              label="Edit"
                              disabled={!editable}
                              onClick={() => router.push(`/sales/orders/${order.id}/edit`)}
                            />
                            <ActionButton
                              icon={Split}
                              label="Split Order"
                              disabled={!splittable}
                              onClick={() => router.push(`/sales/orders/${order.id}/split`)}
                            />
                            <ActionButton
                              icon={FileText}
                              label="Download PI"
                              disabled={!piAllowed}
                              onClick={() => downloadProformaInvoice(hydrated)}
                            />
                            <ActionButton
                              icon={Package}
                              label="Generate Packing List"
                              disabled={!packingAllowed}
                              onClick={() => setPackingOrder(hydrated)}
                            />
                            <DropdownMenuSeparator />
                            <ActionButton
                              icon={Trash2}
                              label="Cancel Order"
                              destructive
                              disabled={!cancellable}
                              onClick={() => setCancelOrder(hydrated)}
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{orders.length}</span> orders
            </p>
            <p className="text-[11px] text-muted-foreground">
              Total Value: <span className="font-semibold text-foreground">₹{kpi.totalValue.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      <CancelOrderDialog
        order={cancelOrder}
        open={!!cancelOrder}
        onClose={() => setCancelOrder(null)}
        onSuccess={() => {
          refreshOrders();
          showToast("Sales order cancelled successfully.");
        }}
      />

      <PackingListDialog
        order={packingOrder}
        open={!!packingOrder}
        onClose={() => setPackingOrder(null)}
        onSuccess={(updatedOrder, list) => {
          refreshOrders();
          showToast(`Packing list ${list.packingListNumber} generated for ${updatedOrder.soNumber}.`);
        }}
      />

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
