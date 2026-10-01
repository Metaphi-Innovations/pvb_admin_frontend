"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Plus, Download, Search, MoreVertical, Eye, ChevronsUpDown, CheckCircle2, Clock, X, SlidersHorizontal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Bill {
  id: number; billNumber: string; vendor: string; billDate: string;
  dueDate: string; amount: number; gstAmount: number; totalAmount: number;
  status: "draft" | "pending" | "approved" | "paid" | "overdue";
}

const SEED: Bill[] = [
  { id: 1, billNumber: "VB-2024-001", vendor: "Agro Chem Distributors",  billDate: "2024-01-21", dueDate: "2024-02-20", amount: 241525, gstAmount: 42975, totalAmount: 284500, status: "paid" },
  { id: 2, billNumber: "VB-2024-002", vendor: "Seed Corp India Pvt Ltd", billDate: "2024-01-26", dueDate: "2024-02-25", amount: 92400,  gstAmount: 0,      totalAmount: 92400,  status: "paid" },
  { id: 3, billNumber: "VB-2024-003", vendor: "Fertilizer World",        billDate: "2024-02-08", dueDate: "2024-03-08", amount: 322034, gstAmount: 57966, totalAmount: 380000, status: "approved" },
  { id: 4, billNumber: "VB-2024-004", vendor: "BioFert Organics",        billDate: "2024-03-02", dueDate: "2024-04-01", amount: 54000,  gstAmount: 0,      totalAmount: 54000,  status: "pending" },
  { id: 5, billNumber: "VB-2024-005", vendor: "Zinc Chem Industries",    billDate: "2024-03-09", dueDate: "2024-03-24", amount: 36271,  gstAmount: 6529,   totalAmount: 42800,  status: "overdue" },
  { id: 6, billNumber: "VB-2024-006", vendor: "Green Agri Solutions",    billDate: "2024-03-10", dueDate: "2024-04-09", amount: 165254, gstAmount: 29746, totalAmount: 195000, status: "draft" },
];

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:    { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400",   label: "Draft" },
  pending:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending" },
  approved: { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Approved" },
  paid:     { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Paid" },
  overdue:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Overdue" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}><span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />{cfg.label}</span>;
}

export default function VendorBillsPage() {
  const [records] = useState<Bill[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const toggleFilter = (v: string) => setFilterStatus(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(x => x.billNumber.toLowerCase().includes(q) || x.vendor.toLowerCase().includes(q)); }
    if (filterStatus.length) r = r.filter(x => filterStatus.includes(x.status));
    return r;
  }, [records, search, filterStatus]);

  const totalPaid = records.filter(r => r.status === "paid").reduce((s, r) => s + r.totalAmount, 0);
  const totalPending = records.filter(r => ["pending","approved"].includes(r.status)).reduce((s, r) => s + r.totalAmount, 0);
  const overdue = records.filter(r => r.status === "overdue").length;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Supplier Bills</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track supplier invoices and payment status</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Export</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"><Plus className="w-3.5 h-3.5" /> New Bill</Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Bills", value: records.length, icon: FileText, accent: true },
            { label: "Paid",        value: `₹${(totalPaid/100000).toFixed(1)}L`, icon: CheckCircle2, accent: false },
            { label: "Pending",     value: `₹${(totalPending/100000).toFixed(1)}L`, icon: Clock, accent: false },
            { label: "Overdue",     value: overdue, icon: AlertCircle, accent: false },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bill number, supplier…" className="pl-8 h-8 text-xs" />
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
                  {["Bill Number","Supplier","Bill Date","Due Date","Base Amount","GST","Total","Status",""].map((h, i) => (
                    <th key={i} className={cn("px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap", i === 8 && "w-10")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(rec => (
                  <tr key={rec.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{rec.billNumber}</span></td>
                    <td className="px-4 py-2 text-xs font-medium">{rec.vendor}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.billDate}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.dueDate}</td>
                    <td className="px-4 py-2 text-xs">₹{rec.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">₹{rec.gstAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2 text-xs font-semibold">₹{rec.totalAmount.toLocaleString("en-IN")}</td>
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
                          <DropdownMenuItem><Eye className="w-3.5 h-3.5" /> View</DropdownMenuItem>
                          {rec.status === "approved" && <DropdownMenuItem><CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{records.length}</span> bills</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
