"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PackageSearch, Download, Search, SlidersHorizontal, ChevronsUpDown, ChevronDown, X, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface StockEntry {
  id: number; productCode: string; productName: string; category: string;
  warehouse: string; openingStock: number; receipts: number; issues: number;
  closingStock: number; uom: string; reorderLevel: number; stockStatus: "normal" | "low" | "critical" | "excess";
}

const SEED: StockEntry[] = [
  { id: 1,  productCode: "PRD-001", productName: "NPK 19:19:19",        category: "NPK Fertilizers",     warehouse: "Central Warehouse", openingStock: 500, receipts: 200, issues: 250, closingStock: 450, uom: "KG",  reorderLevel: 100, stockStatus: "normal" },
  { id: 2,  productCode: "PRD-002", productName: "DAP Fertilizer",       category: "NPK Fertilizers",     warehouse: "Central Warehouse", openingStock: 400, receipts: 100, issues: 180, closingStock: 320, uom: "KG",  reorderLevel: 100, stockStatus: "normal" },
  { id: 3,  productCode: "PRD-003", productName: "Urea 46%",             category: "NPK Fertilizers",     warehouse: "Central Warehouse", openingStock: 600, receipts: 400, issues: 200, closingStock: 800, uom: "KG",  reorderLevel: 200, stockStatus: "excess" },
  { id: 4,  productCode: "PRD-004", productName: "Chlorpyrifos 20 EC",  category: "Insecticides",        warehouse: "North Zone Hub",    openingStock: 200, receipts: 50,  issues: 70,  closingStock: 180, uom: "LTR", reorderLevel: 50,  stockStatus: "normal" },
  { id: 5,  productCode: "PRD-005", productName: "Glyphosate 41% SL",   category: "Herbicides",          warehouse: "Central Warehouse", openingStock: 120, receipts: 0,   issues: 25,  closingStock: 95,  uom: "LTR", reorderLevel: 80,  stockStatus: "low" },
  { id: 6,  productCode: "PRD-006", productName: "Hybrid Tomato Seeds",  category: "Hybrid Seeds",        warehouse: "Central Warehouse", openingStock: 800, receipts: 200, issues: 400, closingStock: 600, uom: "PKT", reorderLevel: 100, stockStatus: "normal" },
  { id: 7,  productCode: "PRD-007", productName: "Hybrid Chilli Seeds",  category: "Hybrid Seeds",        warehouse: "Central Warehouse", openingStock: 500, receipts: 100, issues: 180, closingStock: 420, uom: "PKT", reorderLevel: 100, stockStatus: "normal" },
  { id: 8,  productCode: "PRD-008", productName: "Vermicompost",         category: "Organic Fertilizers", warehouse: "West Zone Hub",     openingStock: 3000,receipts: 500, issues: 1100,closingStock: 2400,uom: "KG",  reorderLevel: 500, stockStatus: "normal" },
  { id: 9,  productCode: "PRD-009", productName: "Zinc Sulphate 21%",   category: "Micronutrients",      warehouse: "Central Warehouse", openingStock: 400, receipts: 100, issues: 160, closingStock: 340, uom: "KG",  reorderLevel: 100, stockStatus: "normal" },
  { id: 10, productCode: "PRD-010", productName: "Manual Sprayer 16L",  category: "Equipment",           warehouse: "Central Warehouse", openingStock: 60,  receipts: 0,   issues: 15,  closingStock: 45,  uom: "PCS", reorderLevel: 20,  stockStatus: "normal" },
  { id: 11, productCode: "PRD-011", productName: "MOP Potash",           category: "NPK Fertilizers",     warehouse: "South Zone Depot",  openingStock: 300, receipts: 0,   issues: 80,  closingStock: 220, uom: "KG",  reorderLevel: 100, stockStatus: "normal" },
  { id: 12, productCode: "PRD-012", productName: "Mancozeb 75 WP",       category: "Pesticides",          warehouse: "Central Warehouse", openingStock: 150, receipts: 30,  issues: 50,  closingStock: 130, uom: "KG",  reorderLevel: 50,  stockStatus: "normal" },
];

const STOCK_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  normal:   { bg: "bg-emerald-50", text: "text-emerald-700", label: "Normal" },
  low:      { bg: "bg-amber-50",   text: "text-amber-700",   label: "Low Stock" },
  critical: { bg: "bg-red-50",     text: "text-red-700",     label: "Critical" },
  excess:   { bg: "bg-blue-50",    text: "text-blue-700",    label: "Excess" },
};

function SortTh({ label, colKey, sortKey, sortDir, onSort, className }: { label: string; colKey: string; sortKey: string; sortDir: string; onSort: (k: string) => void; className?: string }) {
  const active = sortKey === colKey;
  return (
    <th onClick={() => onSort(colKey)} className={cn("px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60", className)}>
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} /> : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />}
      </div>
    </th>
  );
}

export default function StockLedgerPage() {
  const [records] = useState<StockEntry[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("productName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (k: string) => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc"); } };
  const toggleStatus = (v: string) => setFilterStatus(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleWH = (v: string) => setFilterWarehouse(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const warehouses = useMemo(() => [...new Set(records.map(r => r.warehouse))].sort(), [records]);
  const activeFilters = filterStatus.length + filterWarehouse.length;

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(x => x.productName.toLowerCase().includes(q) || x.productCode.toLowerCase().includes(q) || x.category.toLowerCase().includes(q)); }
    if (filterStatus.length) r = r.filter(x => filterStatus.includes(x.stockStatus));
    if (filterWarehouse.length) r = r.filter(x => filterWarehouse.includes(x.warehouse));
    return r.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? ""); const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, search, filterStatus, filterWarehouse, sortKey, sortDir]);

  const lowStock = records.filter(r => r.stockStatus === "low" || r.stockStatus === "critical").length;
  const totalValue = records.reduce((s, r) => s + r.closingStock, 0);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Stock Ledger</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time inventory levels across all warehouses</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Export</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total SKUs", value: records.length, icon: PackageSearch, accent: true },
            { label: "Low Stock Items", value: lowStock, icon: AlertTriangle, accent: false },
            { label: "Total Stock Units", value: totalValue.toLocaleString("en-IN"), icon: TrendingUp, accent: false },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="pl-8 h-8 text-xs" />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors", activeFilters > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter {activeFilters > 0 && <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">{activeFilters}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0">
              <div className="px-3 py-2.5 border-b"><p className="text-xs font-semibold">Stock Status</p></div>
              <div className="px-3 py-2 space-y-2">
                {Object.entries(STOCK_STATUS).map(([v, cfg]) => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-brand-600" checked={filterStatus.includes(v)} onChange={() => toggleStatus(v)} /><span className="text-xs">{cfg.label}</span></label>
                ))}
              </div>
              <div className="px-3 py-2 border-t"><p className="text-xs font-semibold mb-2">Warehouse</p>
                <div className="space-y-2">{warehouses.map(w => (<label key={w} className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-brand-600" checked={filterWarehouse.includes(w)} onChange={() => toggleWH(w)} /><span className="text-xs">{w}</span></label>))}</div>
              </div>
              {activeFilters > 0 && <div className="px-3 py-2 border-t"><button onClick={() => { setFilterStatus([]); setFilterWarehouse([]); }} className="text-xs text-brand-600 hover:underline">Clear all</button></div>}
            </PopoverContent>
          </Popover>
          {filterStatus.map(v => <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">{STOCK_STATUS[v]?.label} <button onClick={() => toggleStatus(v)}><X className="w-3 h-3" /></button></span>)}
          {filterWarehouse.map(v => <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">{v} <button onClick={() => toggleWH(v)}><X className="w-3 h-3" /></button></span>)}
          <p className="ml-auto text-xs text-muted-foreground"><span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{records.length}</span></p>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="SKU"         colKey="productCode"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-24" />
                  <SortTh label="Product"       colKey="productName"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Category"      colKey="category"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Warehouse"     colKey="warehouse"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Opening</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Receipts</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Issues</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Closing</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">UOM</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(rec => (
                  <tr key={rec.id} className={cn("border-b border-border/60 hover:bg-muted/20 transition-colors", (rec.stockStatus === "low" || rec.stockStatus === "critical") && "bg-red-50/30")}>
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{rec.productCode}</span></td>
                    <td className="px-4 py-2 text-xs font-medium text-foreground">{rec.productName}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.category}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.warehouse}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.openingStock.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        {rec.receipts > 0 && <TrendingUp className="w-3 h-3" />}{rec.receipts.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                        {rec.issues > 0 && <TrendingDown className="w-3 h-3" />}{rec.issues.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs font-bold text-foreground">{rec.closingStock.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.uom}</td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium", STOCK_STATUS[rec.stockStatus]?.bg, STOCK_STATUS[rec.stockStatus]?.text)}>
                        {STOCK_STATUS[rec.stockStatus]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{records.length}</span> SKUs</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
