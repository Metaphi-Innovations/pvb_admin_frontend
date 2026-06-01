"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Package, Plus, Download, Search, SlidersHorizontal,
  MoreVertical, Edit2, Trash2, ChevronsUpDown, ChevronDown,
  CheckCircle2, XCircle, X, Check, AlertTriangle, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  code: string;
  name: string;
  categoryName: string;
  uom: string;
  hsnCode: string;
  gstRate: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  status: "active" | "inactive" | "archived";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

// ── Seed ──────────────────────────────────────────────────────────────────────
const SEED: Product[] = [
  { id: 1,  code: "PRD-001", name: "NPK 19:19:19",         categoryName: "NPK Fertilizers",     uom: "KG",  hsnCode: "3105",  gstRate: "5%",  mrp: 1200, sellingPrice: 1050, stock: 450,  status: "active",   createdBy: "Admin", createdDate: "2024-01-10", updatedBy: "Admin", updatedDate: "2024-01-10" },
  { id: 2,  code: "PRD-002", name: "DAP Fertilizer",        categoryName: "NPK Fertilizers",     uom: "KG",  hsnCode: "3105",  gstRate: "5%",  mrp: 1400, sellingPrice: 1250, stock: 320,  status: "active",   createdBy: "Admin", createdDate: "2024-01-12", updatedBy: "Admin", updatedDate: "2024-01-12" },
  { id: 3,  code: "PRD-003", name: "Urea 46%",              categoryName: "NPK Fertilizers",     uom: "KG",  hsnCode: "3102",  gstRate: "5%",  mrp: 950,  sellingPrice: 820,  stock: 800,  status: "active",   createdBy: "Admin", createdDate: "2024-01-15", updatedBy: "Admin", updatedDate: "2024-01-15" },
  { id: 4,  code: "PRD-004", name: "Chlorpyrifos 20 EC",    categoryName: "Insecticides",        uom: "LTR", hsnCode: "3808",  gstRate: "18%", mrp: 380,  sellingPrice: 320,  stock: 180,  status: "active",   createdBy: "Admin", createdDate: "2024-01-18", updatedBy: "Admin", updatedDate: "2024-01-18" },
  { id: 5,  code: "PRD-005", name: "Glyphosate 41% SL",     categoryName: "Herbicides",          uom: "LTR", hsnCode: "3808",  gstRate: "18%", mrp: 450,  sellingPrice: 390,  stock: 95,   status: "active",   createdBy: "Admin", createdDate: "2024-01-20", updatedBy: "Admin", updatedDate: "2024-01-20" },
  { id: 6,  code: "PRD-006", name: "Hybrid Tomato Seeds",   categoryName: "Hybrid Seeds",        uom: "PKT", hsnCode: "1209",  gstRate: "0%",  mrp: 120,  sellingPrice: 95,   stock: 600,  status: "active",   createdBy: "Admin", createdDate: "2024-02-01", updatedBy: "Admin", updatedDate: "2024-02-01" },
  { id: 7,  code: "PRD-007", name: "Hybrid Chilli Seeds",   categoryName: "Hybrid Seeds",        uom: "PKT", hsnCode: "1209",  gstRate: "0%",  mrp: 85,   sellingPrice: 70,   stock: 420,  status: "active",   createdBy: "Admin", createdDate: "2024-02-05", updatedBy: "Admin", updatedDate: "2024-02-05" },
  { id: 8,  code: "PRD-008", name: "Vermicompost",          categoryName: "Organic Fertilizers", uom: "KG",  hsnCode: "3101",  gstRate: "0%",  mrp: 18,   sellingPrice: 14,   stock: 2400, status: "active",   createdBy: "Admin", createdDate: "2024-02-08", updatedBy: "Admin", updatedDate: "2024-02-08" },
  { id: 9,  code: "PRD-009", name: "Zinc Sulphate 21%",     categoryName: "Micronutrients",      uom: "KG",  hsnCode: "3105",  gstRate: "5%",  mrp: 85,   sellingPrice: 72,   stock: 340,  status: "active",   createdBy: "Admin", createdDate: "2024-02-10", updatedBy: "Admin", updatedDate: "2024-02-10" },
  { id: 10, code: "PRD-010", name: "Manual Sprayer 16L",    categoryName: "Equipment",           uom: "PCS", hsnCode: "8424",  gstRate: "12%", mrp: 550,  sellingPrice: 480,  stock: 45,   status: "inactive", createdBy: "Admin", createdDate: "2024-02-15", updatedBy: "Admin", updatedDate: "2024-03-01" },
  { id: 11, code: "PRD-011", name: "MOP Potash",            categoryName: "NPK Fertilizers",     uom: "KG",  hsnCode: "3104",  gstRate: "5%",  mrp: 780,  sellingPrice: 680,  stock: 220,  status: "active",   createdBy: "Admin", createdDate: "2024-03-05", updatedBy: "Admin", updatedDate: "2024-03-05" },
  { id: 12, code: "PRD-012", name: "Mancozeb 75 WP",        categoryName: "Pesticides",          uom: "KG",  hsnCode: "3808",  gstRate: "18%", mrp: 280,  sellingPrice: 235,  stock: 130,  status: "active",   createdBy: "Admin", createdDate: "2024-03-10", updatedBy: "Admin", updatedDate: "2024-03-10" },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

const STATUS_CFG = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"  },
  archived: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"    },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.inactive;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SortTh({ label, colKey, sortKey, sortDir, onSort, className }: {
  label: string; colKey: string; sortKey: string; sortDir: string;
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
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />}
      </div>
    </th>
  );
}

export default function ProductsPage() {
  const [records, setRecords] = useState<Product[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [confirm, setConfirm] = useState<{ type: string; rec: Product } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const categories = useMemo(() => [...new Set(records.map(r => r.categoryName))].sort(), [records]);

  const visible = useMemo(() => {
    let r = records.filter(p => p.status !== "archived");
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.hsnCode.includes(q) || p.categoryName.toLowerCase().includes(q));
    }
    if (filterStatus.length) r = r.filter(p => filterStatus.includes(p.status));
    if (filterCategory.length) r = r.filter(p => filterCategory.includes(p.categoryName));
    r = [...r].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return r;
  }, [records, search, filterStatus, filterCategory, sortKey, sortDir]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const toggleStatus = (v: string) => setFilterStatus(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleCategory = (v: string) => setFilterCategory(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const total = records.filter(p => p.status !== "archived").length;
  const active = records.filter(p => p.status === "active").length;
  const inactive = records.filter(p => p.status === "inactive").length;
  const activeFilters = filterStatus.length + filterCategory.length;

  const handleConfirm = () => {
    if (!confirm) return;
    const { type, rec } = confirm;
    if (type === "delete") {
      setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "archived", updatedDate: todayStr() } : r));
      showToast("Product archived");
    } else if (type === "deactivate") {
      setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "inactive", updatedDate: todayStr() } : r));
      showToast("Product deactivated");
    } else if (type === "activate") {
      setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "active", updatedDate: todayStr() } : r));
      showToast("Product activated");
    }
    setConfirm(null);
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Products</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage product catalogue and pricing</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
              <Plus className="w-3.5 h-3.5" /> Add Product
            </Button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Products", value: total, icon: Package, accent: true },
            { label: "Active", value: active, icon: CheckCircle2, accent: false },
            { label: "Inactive", value: inactive, icon: XCircle, accent: false },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="pl-8 h-8 text-xs" />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                activeFilters > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                {activeFilters > 0 && <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">{activeFilters}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-0">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter by Status</p>
              </div>
              <div className="px-3 py-2 space-y-2">
                {["active", "inactive"].map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                      checked={filterStatus.includes(v)} onChange={() => toggleStatus(v)} />
                    <span className="text-xs capitalize">{v}</span>
                  </label>
                ))}
              </div>
              <div className="px-3 py-2.5 border-t border-border">
                <p className="text-xs font-semibold text-foreground mb-2">Category</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categories.map(c => (
                    <label key={c} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                        checked={filterCategory.includes(c)} onChange={() => toggleCategory(c)} />
                      <span className="text-xs">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              {activeFilters > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button onClick={() => { setFilterStatus([]); setFilterCategory([]); }} className="text-xs text-brand-600 hover:underline">Clear all</button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {filterStatus.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v} <button onClick={() => toggleStatus(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {filterCategory.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v} <button onClick={() => toggleCategory(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}

          <p className="ml-auto text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{total}</span>
          </p>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Code"     colKey="code"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
                  <SortTh label="Product"  colKey="name"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Category" colKey="categoryName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">UOM</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">HSN</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">GST</th>
                  <SortTh label="MRP (₹)"  colKey="mrp"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Stock</th>
                  <SortTh label="Status"   colKey="status"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {search || activeFilters ? "No products match your filters" : "No products yet"}
                        </p>
                        {(search || activeFilters > 0) && (
                          <button onClick={() => { setSearch(""); setFilterStatus([]); setFilterCategory([]); }}
                            className="text-xs text-brand-600 hover:underline">Clear filters</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : visible.map(rec => (
                  <tr key={rec.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{rec.code}</span></td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-semibold text-foreground">{rec.name}</p>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.categoryName}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.uom}</td>
                    <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{rec.hsnCode}</span></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.gstRate}</td>
                    <td className="px-4 py-2 text-xs font-medium text-foreground">₹{rec.mrp.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">
                      <span className={cn("text-xs font-medium", rec.stock < 50 ? "text-red-600" : rec.stock < 200 ? "text-amber-600" : "text-foreground")}>
                        {rec.stock.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-2"><StatusPill status={rec.status} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </DropdownMenuItem>
                          {rec.status === "active"
                            ? <DropdownMenuItem onClick={() => setConfirm({ type: "deactivate", rec })}>
                                <XCircle className="w-3.5 h-3.5" /> Deactivate
                              </DropdownMenuItem>
                            : <DropdownMenuItem onClick={() => setConfirm({ type: "activate", rec })}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                              </DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setConfirm({ type: "delete", rec })}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{visible.length}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> products
            </p>
          </div>
        </div>
      </div>

      {/* Confirm */}
      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                confirm?.type === "delete" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200")}>
                <AlertTriangle className={cn("w-4 h-4", confirm?.type === "delete" ? "text-red-500" : "text-amber-500")} />
              </div>
              {confirm?.type === "delete" ? "Archive Product" : confirm?.type === "deactivate" ? "Deactivate Product" : "Activate Product"}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {confirm?.type === "delete"
                ? `Archive "${confirm.rec.name}"? It will be hidden from all forms.`
                : confirm?.type === "deactivate"
                ? `Deactivate "${confirm?.rec.name}"?`
                : `Activate "${confirm?.rec.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button size="sm" onClick={handleConfirm}
              className={cn("h-8 text-xs", confirm?.type === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-brand-600 hover:bg-brand-700 text-white")}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className={cn("fixed bottom-5 right-5 z-[400] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
          "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
          toast.type === "success" ? "bg-emerald-600" : "bg-red-600")}>
          <Check className="w-4 h-4 flex-shrink-0" />
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
