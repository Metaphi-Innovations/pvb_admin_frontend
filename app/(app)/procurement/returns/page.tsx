"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RotateCcw, Plus, Download, Search, MoreVertical, Eye, CheckCircle2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Return {
  id: number; returnNumber: string; poNumber: string; vendor: string;
  returnDate: string; reason: string; items: number; amount: number;
  status: "pending" | "approved" | "processed";
}

const SEED: Return[] = [
  { id: 1, returnNumber: "PR-2024-001", poNumber: "PO-2024-001", vendor: "Agro Chem Distributors",  returnDate: "2024-01-22", reason: "Damaged packaging",    items: 2, amount: 42500, status: "processed" },
  { id: 2, returnNumber: "PR-2024-002", poNumber: "PO-2024-003", vendor: "Fertilizer World",        returnDate: "2024-02-10", reason: "Quality mismatch",     items: 1, amount: 28000, status: "approved" },
  { id: 3, returnNumber: "PR-2024-003", poNumber: "PO-2024-002", vendor: "Seed Corp India Pvt Ltd", returnDate: "2024-02-18", reason: "Short expiry",         items: 3, amount: 15600, status: "pending" },
];

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400" },
  approved:  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  processed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}><span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export default function VendorReturnsPage() {
  const [records] = useState<Return[]>(SEED);
  const [search, setSearch] = useState("");

  const visible = search.trim()
    ? records.filter(r => r.returnNumber.toLowerCase().includes(search.toLowerCase()) || r.vendor.toLowerCase().includes(search.toLowerCase()))
    : records;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Supplier Returns</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage purchase return notes and debit notes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Export</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"><Plus className="w-3.5 h-3.5" /> New Return</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Returns", value: records.length, icon: RotateCcw, accent: true },
            { label: "Processed", value: records.filter(r => r.status === "processed").length, icon: CheckCircle2, accent: false },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search returns…" className="pl-8 h-8 text-xs" />
          </div>
          <p className="ml-auto text-xs text-muted-foreground"><span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{records.length}</span></p>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Return No.","PO Reference","Supplier","Return Date","Reason","Items","Amount","Status",""].map((h, i) => (
                  <th key={i} className={cn("px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap", i === 8 && "w-10")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(rec => (
                <tr key={rec.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{rec.returnNumber}</span></td>
                  <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{rec.poNumber}</span></td>
                  <td className="px-4 py-2 text-xs font-medium">{rec.vendor}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{rec.returnDate}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{rec.reason}</td>
                  <td className="px-4 py-2 text-xs font-medium">{rec.items}</td>
                  <td className="px-4 py-2 text-xs font-semibold">₹{rec.amount.toLocaleString("en-IN")}</td>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{records.length}</span> returns</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
