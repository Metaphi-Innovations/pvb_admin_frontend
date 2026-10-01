"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout, PageShell } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Truck, Plus, Download, Search, SlidersHorizontal, MoreVertical, Eye, Edit2, X } from "lucide-react";
import { KpiCard, SortTh, StatusPill, Toast } from "../../components/ProcurementUI";
import SupplierSheet, { type SupplierFormState } from "./components/SupplierSheet";
import SupplierDetailSheet from "./components/SupplierDetailSheet";
import {
  type Supplier,
  loadSuppliers,
  saveSuppliers,
  generateSupplierCode,
  nextId,
  todayStr,
  SUPPLIER_TYPE_LABELS,
} from "./supplier-data";
import { CURRENT_USER } from "@/lib/procurement/config";

const STATUS_CFG = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
};

export default function SuppliersPage() {
  const [records, setRecords] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("supplierName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [viewTarget, setViewTarget] = useState<Supplier | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => setRecords(loadSuppliers()), []);

  const persist = useCallback((list: Supplier[]) => {
    saveSuppliers(list);
    setRecords(list);
  }, []);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (s) =>
          s.supplierName.toLowerCase().includes(q) ||
          s.supplierCode.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      );
    }
    if (filterStatus.length) r = r.filter((s) => filterStatus.includes(s.status));
    return r.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, search, filterStatus, sortKey, sortDir]);

  const onSave = (form: SupplierFormState) => {
    const today = todayStr();
    const list = loadSuppliers();
    if (editTarget) {
      const updated = list.map((s) =>
        s.id === editTarget.id
          ? {
              ...s,
              ...form,
              updatedBy: CURRENT_USER,
              updatedDate: today,
            }
          : s,
      );
      persist(updated);
      setToast({ msg: "Supplier updated.", type: "success" });
    } else {
      const row: Supplier = {
        id: nextId(list),
        supplierCode: generateSupplierCode(list),
        ...form,
        createdBy: CURRENT_USER,
        createdDate: today,
        updatedBy: CURRENT_USER,
        updatedDate: today,
      };
      persist([...list, row]);
      setToast({ msg: "Supplier created.", type: "success" });
    }
    setSheetOpen(false);
    setEditTarget(null);
  };

  const toggleStatus = (s: Supplier) => {
    const list = loadSuppliers().map((x) =>
      x.id === s.id
        ? { ...x, status: x.status === "active" ? ("inactive" as const) : ("active" as const), updatedBy: CURRENT_USER, updatedDate: todayStr() }
        : x,
    );
    persist(list);
  };

  const active = records.filter((r) => r.status === "active").length;

  return (
    <AppLayout>
      <PageShell className="max-w-none space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Procurement → Masters</p>
            <h1 className="text-xl font-bold text-foreground">Supplier Master</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Export</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={() => { setEditTarget(null); setSheetOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Add Supplier
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Suppliers" value={records.length} icon={Truck} accent />
          <KpiCard label="Active" value={active} icon={Truck} />
          <KpiCard label="Inactive" value={records.length - active} icon={Truck} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, code, email…" className="pl-8 h-8 text-xs" />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5", filterStatus.length ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3 space-y-2">
              {(["active", "inactive"] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={filterStatus.includes(v)} onChange={() => setFilterStatus((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))} className="accent-brand-600" />
                  {STATUS_CFG[v].label}
                </label>
              ))}
            </PopoverContent>
          </Popover>
          {filterStatus.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md">
              {STATUS_CFG[v as keyof typeof STATUS_CFG].label}
              <button type="button" onClick={() => setFilterStatus((p) => p.filter((x) => x !== v))}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <p className="ml-auto text-xs text-muted-foreground">{visible.length} of {records.length}</p>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Supplier Name" colKey="supplierName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold">Type</th>
                  <SortTh label="Contact" colKey="contactPerson" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Created By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Updated By</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.map((rec) => (
                  <tr key={rec.id} className="border-b border-border/60 hover:bg-muted/20 group">
                    <td className="px-4 py-2">
                      <button type="button" className="text-xs font-semibold text-brand-700 hover:underline text-left" onClick={() => { setViewTarget(rec); setDetailOpen(true); }}>
                        {rec.supplierName}
                      </button>
                      <p className="text-[10px] text-muted-foreground font-mono">{rec.supplierCode}</p>
                    </td>
                    <td className="px-4 py-2 text-xs">{SUPPLIER_TYPE_LABELS[rec.supplierType] ?? rec.supplierType}</td>
                    <td className="px-4 py-2 text-xs">{rec.contactPerson}</td>
                    <td className="px-4 py-2 text-xs">{rec.mobile || rec.phone}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.email}</td>
                    <td className="px-4 py-2">
                      <Switch checked={rec.status === "active"} onCheckedChange={() => toggleStatus(rec)} />
                    </td>
                    <td className="px-4 py-2 text-[11px] text-muted-foreground">{rec.createdBy}</td>
                    <td className="px-4 py-2 text-[11px] text-muted-foreground">{rec.updatedBy}</td>
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100"><MoreVertical className="w-4 h-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { setViewTarget(rec); setDetailOpen(true); }}><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditTarget(rec); setSheetOpen(true); }}><Edit2 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          <Link href="/procurement/purchase-orders" className="text-brand-600 hover:underline">Purchase Orders</Link>
          {" · "}
          <Link href="/procurement/purchase-requests" className="text-brand-600 hover:underline">Purchase Requests</Link>
        </p>
      </PageShell>

      <SupplierSheet open={sheetOpen} onClose={() => { setSheetOpen(false); setEditTarget(null); }} onSave={onSave} supplier={editTarget} />
      <SupplierDetailSheet open={detailOpen} onClose={() => setDetailOpen(false)} supplier={viewTarget} />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
