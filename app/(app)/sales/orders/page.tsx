"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BarChart3, Plus, Download, Search, SlidersHorizontal, X,
  MoreVertical, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2,
  CheckCircle2, Clock, XCircle, FileText, TrendingUp, ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SalesOrder {
  id: number;
  soNumber: string;
  customer: string;
  customerCode: string;
  territory: string;
  items: number;
  amount: number;
  status: "draft" | "confirmed" | "dispatched" | "delivered" | "cancelled";
  orderDate: string;
  deliveryDate: string;
  salesperson: string;
  createdDate: string;
}

const SEED: SalesOrder[] = [
  { id: 1, soNumber: "SO-2024-001", customer: "Green Valley Agro", customerCode: "CUST-001", territory: "North Zone", items: 5, amount: 125000, status: "delivered", orderDate: "2024-01-10", deliveryDate: "2024-01-17", salesperson: "Rajesh Kumar", createdDate: "2024-01-10" },
  { id: 2, soNumber: "SO-2024-002", customer: "Kisan Fertilizers Ltd", customerCode: "CUST-002", territory: "South Zone", items: 3, amount: 78500, status: "dispatched", orderDate: "2024-01-12", deliveryDate: "2024-01-19", salesperson: "Priya Singh", createdDate: "2024-01-12" },
  { id: 3, soNumber: "SO-2024-003", customer: "Farmtech Solutions", customerCode: "CUST-003", territory: "East Zone", items: 8, amount: 234000, status: "confirmed", orderDate: "2024-01-14", deliveryDate: "2024-01-21", salesperson: "Amit Sharma", createdDate: "2024-01-14" },
  { id: 4, soNumber: "SO-2024-004", customer: "AgroPlus Distributors", customerCode: "CUST-004", territory: "West Zone", items: 2, amount: 45000, status: "draft", orderDate: "2024-01-15", deliveryDate: "2024-01-22", salesperson: "Neha Patel", createdDate: "2024-01-15" },
  { id: 5, soNumber: "SO-2024-005", customer: "Sunrise Crops", customerCode: "CUST-005", territory: "North Zone", items: 6, amount: 189000, status: "delivered", orderDate: "2024-01-08", deliveryDate: "2024-01-15", salesperson: "Rajesh Kumar", createdDate: "2024-01-08" },
  { id: 6, soNumber: "SO-2024-006", customer: "Rural Inputs Co.", customerCode: "CUST-006", territory: "Central Zone", items: 4, amount: 92000, status: "cancelled", orderDate: "2024-01-09", deliveryDate: "2024-01-16", salesperson: "Vikram Das", createdDate: "2024-01-09" },
  { id: 7, soNumber: "SO-2024-007", customer: "BioGrow Agro", customerCode: "CUST-007", territory: "South Zone", items: 7, amount: 310000, status: "confirmed", orderDate: "2024-01-16", deliveryDate: "2024-01-23", salesperson: "Priya Singh", createdDate: "2024-01-16" },
  { id: 8, soNumber: "SO-2024-008", customer: "Fertile Lands Ltd", customerCode: "CUST-008", territory: "East Zone", items: 3, amount: 67500, status: "dispatched", orderDate: "2024-01-17", deliveryDate: "2024-01-24", salesperson: "Amit Sharma", createdDate: "2024-01-17" },
  { id: 9, soNumber: "SO-2024-009", customer: "CropCare India", customerCode: "CUST-009", territory: "West Zone", items: 9, amount: 445000, status: "delivered", orderDate: "2024-01-05", deliveryDate: "2024-01-12", salesperson: "Neha Patel", createdDate: "2024-01-05" },
  { id: 10, soNumber: "SO-2024-010", customer: "Seeds & More", customerCode: "CUST-010", territory: "North Zone", items: 2, amount: 28000, status: "draft", orderDate: "2024-01-18", deliveryDate: "2024-01-25", salesperson: "Rajesh Kumar", createdDate: "2024-01-18" },
];

const STATUS_CFG = {
  draft:      { bg: "bg-slate-100",    text: "text-slate-600",   dot: "bg-slate-400"   },
  confirmed:  { bg: "bg-blue-50",      text: "text-blue-700",    dot: "bg-blue-500"    },
  dispatched: { bg: "bg-amber-50",     text: "text-amber-700",   dot: "bg-amber-400"   },
  delivered:  { bg: "bg-emerald-50",   text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled:  { bg: "bg-red-50",       text: "text-red-700",     dot: "bg-red-400"     },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
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

export default function SalesOrdersPage() {
  const [orders] = useState<SalesOrder[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState("orderDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleStatus = (s: string) =>
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const filtered = useMemo(() => {
    let d = orders.filter(o => {
      const q = search.toLowerCase();
      return !q || o.soNumber.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.territory.toLowerCase().includes(q);
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
    totalValue: orders.reduce((s, o) => s + o.amount, 0),
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Sales Orders</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage customer orders and fulfillment</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Order
            </button>
          </div>
        </div>

        {/* KPI */}
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

        {/* Toolbar */}
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
                  {Object.keys(STATUS_CFG).map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                        checked={filterStatus.includes(s)} onChange={() => toggleStatus(s)} />
                      <span className="text-xs capitalize">{s}</span>
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
              {s} <button onClick={() => toggleStatus(s)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <p className="text-xs text-muted-foreground ml-auto">{filtered.length} of {orders.length} orders</p>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="SO Number" colKey="soNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Customer" colKey="customer" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Territory" colKey="territory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Items" colKey="items" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Amount" colKey="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
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
                ) : filtered.map(order => (
                  <tr key={order.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs font-semibold text-brand-700">{order.soNumber}</span>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-semibold text-foreground">{order.customer}</p>
                      <p className="text-[11px] text-muted-foreground">{order.customerCode}</p>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{order.territory}</td>
                    <td className="px-4 py-2 text-xs text-foreground text-center">{order.items}</td>
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">₹{order.amount.toLocaleString()}</td>
                    <td className="px-4 py-2"><StatusPill status={order.status} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{order.orderDate}</td>
                    <td className="px-4 py-2">
                      <div className="relative flex justify-end">
                        <button
                          onClick={() => setOpenMenu(openMenu === order.id ? null : order.id)}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === order.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-40 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" /> View Details
                            </button>
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                              <Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                            </button>
                            <div className="border-t border-border my-1" />
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
    </AppLayout>
  );
}
