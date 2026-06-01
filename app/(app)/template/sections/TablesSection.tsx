"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, Edit2, Trash2, MoreVertical, Download, Printer,
  CheckCircle2, XCircle, ChevronDown, ChevronsUpDown, Search,
  ArrowDownToLine, SlidersHorizontal, Columns, AlertCircle,
  FileX, ServerCrash, UserPlus, Archive, RefreshCw,
  RotateCcw, Plus,
} from "lucide-react";

// ── Status pill ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  draft:             { bg: "bg-slate-100",  text: "text-slate-700",  dot: "bg-slate-400" },
  pending:           { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-400" },
  approved:          { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500" },
  rejected:          { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
  active:            { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500" },
  inactive:          { bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400" },
  paid:              { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500" },
  unpaid:            { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-400" },
  "dispatch-pending":{ bg: "bg-sky-100",   text: "text-sky-700",    dot: "bg-sky-500" },
  completed:         { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500" },
  present:           { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500" },
  absent:            { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
  "half-day":        { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-400" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status.toLowerCase()] ?? STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium border border-transparent ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}

// ── Row action dropdown ────────────────────────────────────────────────────
function RowActionMenu({ canApprove = false }: { canApprove?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 hover:bg-muted rounded-md transition-colors inline-flex">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2">
          <Eye className="w-3.5 h-3.5" /> View
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2">
          <UserPlus className="w-3.5 h-3.5" /> Assign
        </DropdownMenuItem>
        {canApprove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs gap-2 text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2">
          <Download className="w-3.5 h-3.5" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2">
          <Printer className="w-3.5 h-3.5" /> Print
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2 text-muted-foreground">
          <Archive className="w-3.5 h-3.5" /> Archive
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Skeleton row ───────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3">
        <div className="w-4 h-4 bg-muted animate-pulse rounded" />
      </td>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 bg-muted animate-pulse rounded ${i === 0 ? "w-36" : i % 3 === 0 ? "w-16" : "w-24"}`} />
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="w-6 h-6 bg-muted animate-pulse rounded" />
      </td>
    </tr>
  );
}

// ── Enterprise Table ───────────────────────────────────────────────────────
interface Col {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (v: any, row: any) => React.ReactNode;
}

type TableState = "data" | "loading" | "empty" | "no-results" | "error";

interface ETProps {
  data: any[];
  columns: Col[];
  title?: string;
  subtitle?: string;
  state?: TableState;
  expandable?: boolean;
}

function EnterpriseTable({ data, columns, title, subtitle, state = "data", expandable = false }: ETProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = search.trim()
    ? data.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(search.toLowerCase())))
    : data;

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey], bv = b[sortKey];
    const c = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? c : -c;
  });

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const effectiveState: TableState =
    state !== "data" ? state :
    search.trim() && filtered.length === 0 ? "no-results" :
    "data";

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleRow = (i: number) =>
    setSelected(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const toggleAll = () =>
    setSelected(selected.size === paged.length ? new Set() : new Set(paged.map((_, i) => i)));

  const toggleExpand = (i: number) =>
    setExpanded(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const colSpan = columns.length + (expandable ? 3 : 2);

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search…"
              className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 w-36 bg-white"
            />
          </div>
          <button className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
          </button>
          <button className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-1.5">
            <Columns className="w-3.5 h-3.5" /> Columns
          </button>
          <button className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-1.5">
            <ArrowDownToLine className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-brand-700">
            {selected.size} row{selected.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
            <button className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button className="px-3 py-1 text-xs border border-border rounded-md hover:bg-muted flex items-center gap-1">
              <ArrowDownToLine className="w-3.5 h-3.5" /> Export
            </button>
            <button className="px-3 py-1 text-xs border border-border rounded-md hover:bg-muted flex items-center gap-1">
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-600"
                    checked={selected.size === paged.length && paged.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                {expandable && <th className="w-8 px-2 py-3" />}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && toggleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap group cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable !== false && (
                        sortKey === col.key
                          ? <ChevronDown className={`w-3 h-3 text-brand-600 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {/* ── Loading ── */}
              {effectiveState === "loading" &&
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length + (expandable ? 1 : 0)} />)
              }

              {/* ── Empty ── */}
              {effectiveState === "empty" && (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <FileX className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">No records yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Add your first entry to get started.</p>
                      </div>
                      <button className="px-4 py-2 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700 flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> Add New
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── No Results ── */}
              {effectiveState === "no-results" && (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">No results found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search ? `Nothing matched "${search}"` : "Try a different search term."}
                        </p>
                      </div>
                      <button onClick={() => setSearch("")} className="px-4 py-2 border border-border text-xs rounded-lg hover:bg-muted flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5" /> Clear Search
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── Error ── */}
              {effectiveState === "error" && (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                        <ServerCrash className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Failed to load data</p>
                        <p className="text-xs text-muted-foreground mt-1">Something went wrong while fetching records.</p>
                      </div>
                      <button className="px-4 py-2 border border-border text-xs rounded-lg hover:bg-muted flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── Data rows ── */}
              {effectiveState === "data" && paged.map((row, idx) => (
                <React.Fragment key={idx}>
                  <tr className={`border-b border-border transition-colors ${selected.has(idx) ? "bg-brand-50/60" : "hover:bg-muted/20"}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-brand-600"
                        checked={selected.has(idx)}
                        onChange={() => toggleRow(idx)}
                      />
                    </td>
                    {expandable && (
                      <td className="px-2 py-3">
                        <button
                          onClick={() => toggleExpand(idx)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expanded.has(idx) ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right">
                      <RowActionMenu canApprove={row.canApprove} />
                    </td>
                  </tr>

                  {/* Expandable detail row */}
                  {expandable && expanded.has(idx) && (
                    <tr className="bg-muted/10 border-b border-border">
                      <td /><td />
                      <td colSpan={columns.length + 1} className="px-4 py-3">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-muted-foreground font-medium mb-1">Created</p>
                            <p className="text-foreground">{row.date ?? "2024-01-22"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-medium mb-1">Last Updated</p>
                            <p className="text-foreground">2024-01-24 10:32 AM</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-medium mb-1">Notes</p>
                            <p className="text-foreground">No additional notes recorded.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {effectiveState === "data" && sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((page - 1) * PER_PAGE + 1, sorted.length)}–{Math.min(page * PER_PAGE, sorted.length)} of {sorted.length} records
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                    page === p ? "bg-brand-600 text-white" : "border border-border hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────
const SALES_ORDERS = [
  { id: "SO-2024-001", customer: "Green Valley Agro",  territory: "North Zone",   amount: "₹48,500",   status: "approved",          deliveryDate: "10 Feb 2024", date: "2024-01-15", canApprove: false },
  { id: "SO-2024-002", customer: "Sunrise Exports",    territory: "West Zone",    amount: "₹1,25,000", status: "pending",            deliveryDate: "15 Feb 2024", date: "2024-01-18", canApprove: true  },
  { id: "SO-2024-003", customer: "Metro Retail Ltd",   territory: "East Zone",    amount: "₹89,750",   status: "dispatch-pending",   deliveryDate: "12 Feb 2024", date: "2024-01-20", canApprove: false },
  { id: "SO-2024-004", customer: "Rural Co-op Soc.",   territory: "South Zone",   amount: "₹32,100",   status: "draft",              deliveryDate: "20 Feb 2024", date: "2024-01-21", canApprove: false },
  { id: "SO-2024-005", customer: "Agri Mart Chain",    territory: "North Zone",   amount: "₹67,400",   status: "approved",          deliveryDate: "08 Feb 2024", date: "2024-01-16", canApprove: false },
  { id: "SO-2024-006", customer: "FarmerFirst Pvt",    territory: "Central Zone", amount: "₹2,15,300", status: "pending",            deliveryDate: "22 Feb 2024", date: "2024-01-22", canApprove: true  },
  { id: "SO-2024-007", customer: "Krishi Bazaar",      territory: "West Zone",    amount: "₹55,800",   status: "rejected",           deliveryDate: "18 Feb 2024", date: "2024-01-19", canApprove: false },
];

const INVENTORY = [
  { product: "Urea 50kg",           sku: "FER-URP-001", warehouse: "Central WH", availableQty: 1250, reservedQty: 320, status: "active"   },
  { product: "DAP 50kg",            sku: "FER-DAP-002", warehouse: "North WH",   availableQty: 45,   reservedQty: 220, status: "pending"  },
  { product: "Hybrid Maize Seed",   sku: "SED-HYB-003", warehouse: "Central WH", availableQty: 0,    reservedQty: 150, status: "inactive" },
  { product: "Paddy Seeds IR64",    sku: "SED-PAD-004", warehouse: "South WH",   availableQty: 2350, reservedQty: 400, status: "active"   },
  { product: "NPK 10:26:26",        sku: "FER-NPK-005", warehouse: "East WH",    availableQty: 780,  reservedQty: 100, status: "active"   },
  { product: "Chlorpyrifos 20EC",   sku: "PES-CHL-006", warehouse: "Central WH", availableQty: 310,  reservedQty: 80,  status: "active"   },
  { product: "Glyphosate 41%",      sku: "PES-GLY-007", warehouse: "North WH",   availableQty: 88,   reservedQty: 90,  status: "pending"  },
];

const APPROVALS = [
  { id: "APR-001", module: "Purchase Order",  requestedBy: "Amit Patel",    date: "18 Jan 2024", status: "pending",  canApprove: true  },
  { id: "APR-002", module: "Expense Claim",   requestedBy: "Sneha Gupta",   date: "19 Jan 2024", status: "pending",  canApprove: true  },
  { id: "APR-003", module: "Leave Request",   requestedBy: "Rohan Kumar",   date: "17 Jan 2024", status: "approved", canApprove: false },
  { id: "APR-004", module: "Price Override",  requestedBy: "Priya Singh",   date: "20 Jan 2024", status: "rejected", canApprove: false },
  { id: "APR-005", module: "Credit Limit",    requestedBy: "Vikram Rao",    date: "21 Jan 2024", status: "pending",  canApprove: true  },
  { id: "APR-006", module: "Discount Approval",requestedBy: "Meena Joshi",  date: "22 Jan 2024", status: "pending",  canApprove: true  },
];

const ATTENDANCE = [
  { employee: "Rajesh Kumar",  territory: "North Zone",   checkIn: "09:15 AM", checkOut: "06:30 PM", status: "present"  },
  { employee: "Priya Singh",   territory: "West Zone",    checkIn: "09:00 AM", checkOut: "06:00 PM", status: "present"  },
  { employee: "Amit Sharma",   territory: "East Zone",    checkIn: "—",        checkOut: "—",        status: "absent"   },
  { employee: "Neha Verma",    territory: "South Zone",   checkIn: "09:45 AM", checkOut: "02:00 PM", status: "half-day" },
  { employee: "Vikram Rao",    territory: "North Zone",   checkIn: "09:05 AM", checkOut: "06:15 PM", status: "present"  },
  { employee: "Sunita Devi",   territory: "Central Zone", checkIn: "09:30 AM", checkOut: "06:45 PM", status: "present"  },
];

const FARMERS = [
  { name: "Hari Singh",      village: "Pillupur",  crop: "Wheat, Barley",       mobile: "98765 43210", status: "active"   },
  { name: "Priya Devi",      village: "Mohanpur",  crop: "Rice (Kharif)",       mobile: "98765 43211", status: "active"   },
  { name: "Rajesh Yadav",    village: "Pillupur",  crop: "Maize, Sugarcane",    mobile: "98765 43212", status: "inactive" },
  { name: "Sunita Bai",      village: "Rampur",    crop: "Soybean",             mobile: "98765 43213", status: "active"   },
  { name: "Govind Tiwari",   village: "Mohanpur",  crop: "Cotton",              mobile: "98765 43214", status: "active"   },
  { name: "Kamla Devi",      village: "Rampur",    crop: "Paddy, Pulses",       mobile: "98765 43215", status: "active"   },
];

// ── Main export ────────────────────────────────────────────────────────────
export default function TablesSection() {
  return (
    <div className="space-y-10">

      {/* ── 1. ERP Table Examples ─────────────────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">ERP Table Components</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Live enterprise tables with sticky headers, sortable columns, search, filter bar, column selector,
            row selection, bulk actions, expandable rows, action menus, and pagination.
          </p>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted/30 p-1 rounded-lg border border-border">
            <TabsTrigger value="basic"     className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Basic Table</TabsTrigger>
            <TabsTrigger value="sales"     className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Sales Orders</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Inventory</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Approvals</TabsTrigger>
            <TabsTrigger value="attendance"className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Attendance</TabsTrigger>
            <TabsTrigger value="farmers"   className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Farmer Registry</TabsTrigger>
          </TabsList>

          <div className="mt-5">
            {/* Basic Table */}
            <TabsContent value="basic">
              <EnterpriseTable
                title="Product Catalogue"
                subtitle="Standard listing — sort any column, search, select rows, expand for details"
                expandable
                data={INVENTORY}
                columns={[
                  { key: "product",  label: "Product" },
                  { key: "sku",      label: "SKU",       render: (v) => <span className="font-mono text-xs text-muted-foreground">{v}</span> },
                  { key: "warehouse",label: "Warehouse" },
                  { key: "availableQty", label: "Available Qty",
                    render: (v) => (
                      <span className={v === 0 ? "text-red-600 font-semibold" : v < 100 ? "text-amber-600 font-medium" : ""}>
                        {v.toLocaleString()}
                      </span>
                    ),
                  },
                  { key: "reservedQty", label: "Reserved Qty" },
                  { key: "status",   label: "Status",    render: (v) => <StatusPill status={v} /> },
                ]}
              />
            </TabsContent>

            {/* Sales Orders */}
            <TabsContent value="sales">
              <EnterpriseTable
                title="Sales Orders"
                subtitle="Columns: Order No · Customer · Territory · Amount · Status · Delivery Date"
                expandable
                data={SALES_ORDERS}
                columns={[
                  { key: "id",           label: "Order No",      render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{v}</span> },
                  { key: "customer",     label: "Customer" },
                  { key: "territory",    label: "Territory" },
                  { key: "amount",       label: "Amount",         render: (v) => <span className="font-semibold">{v}</span> },
                  { key: "status",       label: "Status",         render: (v) => <StatusPill status={v} /> },
                  { key: "deliveryDate", label: "Delivery Date" },
                ]}
              />
            </TabsContent>

            {/* Inventory */}
            <TabsContent value="inventory">
              <EnterpriseTable
                title="Inventory Stock"
                subtitle="Columns: Product · SKU · Warehouse · Available Qty · Reserved Qty · Status"
                data={INVENTORY}
                columns={[
                  { key: "product",      label: "Product" },
                  { key: "sku",          label: "SKU",       render: (v) => <span className="font-mono text-xs text-muted-foreground">{v}</span> },
                  { key: "warehouse",    label: "Warehouse" },
                  { key: "availableQty", label: "Available Qty",
                    render: (v) => (
                      <span className={v === 0 ? "text-red-600 font-semibold" : v < 100 ? "text-amber-600 font-medium" : ""}>
                        {v.toLocaleString()}
                      </span>
                    ),
                  },
                  { key: "reservedQty", label: "Reserved Qty" },
                  { key: "status",      label: "Status",    render: (v) => <StatusPill status={v} /> },
                ]}
              />
            </TabsContent>

            {/* Approvals */}
            <TabsContent value="approvals">
              <EnterpriseTable
                title="Pending Approvals"
                subtitle="Columns: Request ID · Module · Requested By · Date · Status · Approve / Reject"
                data={APPROVALS}
                columns={[
                  { key: "id",          label: "Request ID",   render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{v}</span> },
                  { key: "module",      label: "Module" },
                  { key: "requestedBy", label: "Requested By" },
                  { key: "date",        label: "Date" },
                  { key: "status",      label: "Status",       render: (v) => <StatusPill status={v} /> },
                  {
                    key: "canApprove",
                    label: "Action",
                    sortable: false,
                    render: (v) => v ? (
                      <div className="flex gap-1.5">
                        <button className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </button>
                        <button className="px-2.5 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>,
                  },
                ]}
              />
            </TabsContent>

            {/* Attendance */}
            <TabsContent value="attendance">
              <EnterpriseTable
                title="Attendance Register"
                subtitle="Columns: Employee · Territory · Check-In · Check-Out · Status"
                data={ATTENDANCE}
                columns={[
                  { key: "employee",  label: "Employee" },
                  { key: "territory", label: "Territory" },
                  { key: "checkIn",   label: "Check-In",  render: (v) => <span className={v === "—" ? "text-muted-foreground" : ""}>{v}</span> },
                  { key: "checkOut",  label: "Check-Out", render: (v) => <span className={v === "—" ? "text-muted-foreground" : ""}>{v}</span> },
                  { key: "status",    label: "Status",    render: (v) => <StatusPill status={v} /> },
                ]}
              />
            </TabsContent>

            {/* Farmer Registry */}
            <TabsContent value="farmers">
              <EnterpriseTable
                title="Farmer Registry"
                subtitle="Columns: Farmer Name · Village · Crop · Mobile · Status"
                data={FARMERS}
                columns={[
                  { key: "name",    label: "Farmer Name" },
                  { key: "village", label: "Village" },
                  { key: "crop",    label: "Crop" },
                  { key: "mobile",  label: "Mobile" },
                  { key: "status",  label: "Status", render: (v) => <StatusPill status={v} /> },
                ]}
              />
            </TabsContent>
          </div>
        </Tabs>
      </section>

      {/* ── 2. Table States ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Table States</h3>
          <p className="text-xs text-muted-foreground mt-1">All states a production table must handle gracefully.</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Skeleton / Loading</p>
            <EnterpriseTable
              state="loading"
              data={[]}
              columns={[
                { key: "a", label: "Product" },
                { key: "b", label: "Status" },
                { key: "c", label: "Amount" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Empty State</p>
            <EnterpriseTable
              state="empty"
              data={[]}
              columns={[
                { key: "a", label: "Product" },
                { key: "b", label: "Status" },
                { key: "c", label: "Amount" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Error State</p>
            <EnterpriseTable
              state="error"
              data={[]}
              columns={[
                { key: "a", label: "Product" },
                { key: "b", label: "Status" },
                { key: "c", label: "Amount" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">No Search Results</p>
            <EnterpriseTable
              state="data"
              data={[{ a: "Urea", b: "active", c: "₹450" }]}
              columns={[
                { key: "a", label: "Product" },
                { key: "b", label: "Status" },
                { key: "c", label: "Amount" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── 3. Status Badges ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Status Badges</h3>
          <p className="text-xs text-muted-foreground mt-1">All status pill variants used across ERP table listings.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(STATUS_CFG).map((s) => <StatusPill key={s} status={s} />)}
        </div>
      </section>

      {/* ── 4. Usage Guide ────────────────────────────────────────────── */}
      <section>
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-brand-700 mb-3">Table Patterns Guide</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-brand-800/80">
            <p>• Sticky headers keep columns visible during scroll</p>
            <p>• Sort any column — chevron shows direction</p>
            <p>• Search filters all columns simultaneously</p>
            <p>• Filter button opens contextual filter panel</p>
            <p>• Column selector hides/shows specific columns</p>
            <p>• Bulk selection for team-level operations</p>
            <p>• Row checkboxes trigger the bulk actions bar</p>
            <p>• Action menu: view, edit, assign, approve, reject, download, print, archive</p>
            <p>• Expandable rows for additional context on demand</p>
            <p>• Pagination: 5–25 rows per page based on data density</p>
            <p>• Inline Approve/Reject in approval tables</p>
            <p>• Export to CSV/PDF for finance and audit</p>
          </div>
        </div>
      </section>

    </div>
  );
}
