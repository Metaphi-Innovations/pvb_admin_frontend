"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClipboardList, Plus, Download, Search, MoreVertical, Eye, ChevronsUpDown, ChevronDown, CheckCircle2, Clock, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface GRN {
  id: number; grnNumber: string; poNumber: string; vendor: string;
  receivedDate: string; warehouse: string; totalItems: number;
  totalValue: number; status: "pending" | "verified" | "partial";
  receivedBy: string;
}

const SEED: GRN[] = [
  { id: 1, grnNumber: "GRN-2024-001", poNumber: "PO-2024-001", vendor: "Agro Chem Distributors",  receivedDate: "2024-01-20", warehouse: "Central Warehouse", totalItems: 8,  totalValue: 284500, status: "verified", receivedBy: "Suresh M." },
  { id: 2, grnNumber: "GRN-2024-002", poNumber: "PO-2024-002", vendor: "Seed Corp India Pvt Ltd", receivedDate: "2024-01-25", warehouse: "North Zone Hub",    totalItems: 5,  totalValue: 92400,  status: "verified", receivedBy: "Priya K." },
  { id: 3, grnNumber: "GRN-2024-003", poNumber: "PO-2024-003", vendor: "Fertilizer World",        receivedDate: "2024-02-06", warehouse: "Central Warehouse", totalItems: 10, totalValue: 380000, status: "partial",  receivedBy: "Admin" },
  { id: 4, grnNumber: "GRN-2024-004", poNumber: "PO-2024-007", vendor: "BioFert Organics",        receivedDate: "2024-03-01", warehouse: "South Zone Depot",  totalItems: 3,  totalValue: 54000,  status: "pending",  receivedBy: "Raju B." },
  { id: 5, grnNumber: "GRN-2024-005", poNumber: "PO-2024-009", vendor: "Zinc Chem Industries",    receivedDate: "2024-03-08", warehouse: "West Zone Hub",     totalItems: 2,  totalValue: 42800,  status: "verified", receivedBy: "Mohan S." },
];

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending Verification" },
  verified: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Verified" },
  partial:  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Partial" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}><span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />{cfg.label}</span>;
}

export default function GRNPage() {
  const [records] = useState<GRN[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const toggleFilter = (v: string) => setFilterStatus(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(x => x.grnNumber.toLowerCase().includes(q) || x.poNumber.toLowerCase().includes(q) || x.vendor.toLowerCase().includes(q)); }
    if (filterStatus.length) r = r.filter(x => filterStatus.includes(x.status));
    return r;
  }, [records, search, filterStatus]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Goods Receipt Notes</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track and verify incoming stock receipts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Export</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"><Plus className="w-3.5 h-3.5" /> New GRN</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total GRNs", value: records.length, icon: ClipboardList, accent: true },
            { label: "Verified", value: records.filter(r => r.status === "verified").length, icon: CheckCircle2, accent: false },
            { label: "Pending", value: records.filter(r => r.status === "pending").length, icon: Clock, accent: false },
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

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search GRN, PO, vendor…" className="pl-8 h-8 text-xs" />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors", filterStatus.length > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter {filterStatus.length > 0 && <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">{filterStatus.length}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-0">
              <div className="px-3 py-2.5 border-b border-border"><p className="text-xs font-semibold">Status</p></div>
              <div className="px-3 py-2.5 space-y-2">
                {Object.entries(STATUS_CFG).map(([v, cfg]) => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={filterStatus.includes(v)} onChange={() => toggleFilter(v)} />
                    <span className="text-xs">{cfg.label}</span>
                  </label>
                ))}
              </div>
              {filterStatus.length > 0 && <div className="px-3 py-2 border-t"><button onClick={() => setFilterStatus([])} className="text-xs text-brand-600 hover:underline">Clear</button></div>}
            </PopoverContent>
          </Popover>
          {filterStatus.map(v => <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">{STATUS_CFG[v]?.label} <button onClick={() => toggleFilter(v)}><X className="w-3 h-3" /></button></span>)}
          <p className="ml-auto text-xs text-muted-foreground"><span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{records.length}</span></p>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["GRN Number","PO Reference","Vendor","Received Date","Warehouse","Items","Value","Status",""].map((h, i) => (
                    <th key={i} className={cn("px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap", i === 8 && "w-10")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(rec => (
                  <tr key={rec.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{rec.grnNumber}</span></td>
                    <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{rec.poNumber}</span></td>
                    <td className="px-4 py-2 text-xs font-medium text-foreground">{rec.vendor}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.receivedDate}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.warehouse}</td>
                    <td className="px-4 py-2 text-xs font-medium">{rec.totalItems}</td>
                    <td className="px-4 py-2 text-xs font-semibold">₹{rec.totalValue.toLocaleString("en-IN")}</td>
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
                          <DropdownMenuItem><Eye className="w-3.5 h-3.5" /> View Details</DropdownMenuItem>
                          {rec.status === "pending" && <DropdownMenuItem><CheckCircle2 className="w-3.5 h-3.5" /> Verify Receipt</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{records.length}</span> GRNs</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
