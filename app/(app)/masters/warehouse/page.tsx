"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Warehouse, Plus, Download, Search, SlidersHorizontal,
  MoreVertical, Edit2, Trash2, ChevronsUpDown, ChevronDown,
  CheckCircle2, XCircle, X, Check, AlertTriangle, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface WH {
  id: number; code: string; name: string; type: string;
  address: string; city: string; state: string; pincode: string;
  manager: string; capacity: number; utilized: number;
  status: "active" | "inactive" | "archived";
  createdBy: string; createdDate: string; updatedBy: string; updatedDate: string;
}

const SEED: WH[] = [
  { id: 1, code: "WH-001", name: "Central Warehouse",     type: "Primary",   address: "Plot 12, MIDC",          city: "Pune",       state: "Maharashtra", pincode: "411019", manager: "Suresh M.",  capacity: 50000, utilized: 32400, status: "active",   createdBy: "Admin", createdDate: "2024-01-10", updatedBy: "Admin", updatedDate: "2024-01-10" },
  { id: 2, code: "WH-002", name: "North Zone Hub",        type: "Regional",  address: "Sector 22, Industrial",  city: "Nagpur",     state: "Maharashtra", pincode: "440018", manager: "Priya K.",  capacity: 20000, utilized: 14200, status: "active",   createdBy: "Admin", createdDate: "2024-01-15", updatedBy: "Admin", updatedDate: "2024-01-15" },
  { id: 3, code: "WH-003", name: "South Zone Depot",      type: "Regional",  address: "NH-44 Bypass",           city: "Hyderabad",  state: "Telangana",   pincode: "500032", manager: "Raju B.",   capacity: 15000, utilized: 8900,  status: "active",   createdBy: "Admin", createdDate: "2024-02-01", updatedBy: "Admin", updatedDate: "2024-02-01" },
  { id: 4, code: "WH-004", name: "East Zone Depot",       type: "Regional",  address: "Near Bhubaneswar Ring",  city: "Bhubaneswar",state: "Odisha",       pincode: "751002", manager: "Anil P.",   capacity: 12000, utilized: 5600,  status: "active",   createdBy: "Admin", createdDate: "2024-02-05", updatedBy: "Admin", updatedDate: "2024-02-05" },
  { id: 5, code: "WH-005", name: "West Zone Hub",         type: "Regional",  address: "GIDC Estate",            city: "Ahmedabad",  state: "Gujarat",     pincode: "382330", manager: "Mohan S.",  capacity: 18000, utilized: 11200, status: "active",   createdBy: "Admin", createdDate: "2024-02-10", updatedBy: "Admin", updatedDate: "2024-02-10" },
  { id: 6, code: "WH-006", name: "Mumbai Transit Point", type: "Transit",   address: "Bhiwandi Complex",       city: "Mumbai",     state: "Maharashtra", pincode: "421302", manager: "Kavya R.",  capacity: 8000,  utilized: 4200,  status: "active",   createdBy: "Admin", createdDate: "2024-02-15", updatedBy: "Admin", updatedDate: "2024-02-15" },
  { id: 7, code: "WH-007", name: "Chennai Cold Store",    type: "Cold",      address: "Ambattur IE",            city: "Chennai",    state: "Tamil Nadu",  pincode: "600058", manager: "Ramesh T.", capacity: 5000,  utilized: 2100,  status: "inactive", createdBy: "Admin", createdDate: "2024-03-01", updatedBy: "Admin", updatedDate: "2024-03-15" },
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
function SortTh({ label, colKey, sortKey, sortDir, onSort, className }: { label: string; colKey: string; sortKey: string; sortDir: string; onSort: (k: string) => void; className?: string; }) {
  const active = sortKey === colKey;
  return (
    <th onClick={() => onSort(colKey)} className={cn("px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60", className)}>
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} /> : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />}
      </div>
    </th>
  );
}

interface FormState { name: string; code: string; type: string; address: string; city: string; state: string; pincode: string; manager: string; capacity: string; status: "active" | "inactive"; }

function WHSheet({ open, mode, wh, onClose, onSave }: { open: boolean; mode: "add" | "edit"; wh: WH | null; onClose: () => void; onSave: (f: FormState) => void; }) {
  const [form, setForm] = useState<FormState>({ name: "", code: "", type: "Primary", address: "", city: "", state: "", pincode: "", manager: "", capacity: "", status: "active" });
  const [errors, setErrors] = useState<Partial<FormState>>({});

  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && wh) {
        setForm({ name: wh.name, code: wh.code, type: wh.type, address: wh.address, city: wh.city, state: wh.state, pincode: wh.pincode, manager: wh.manager, capacity: String(wh.capacity), status: wh.status === "inactive" ? "inactive" : "active" });
      } else {
        setForm({ name: "", code: "", type: "Primary", address: "", city: "", state: "", pincode: "", manager: "", capacity: "", status: "active" });
      }
      setErrors({});
    }
  }, [open, mode, wh]);

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));
  const validate = () => {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.code.trim()) e.code = "Required";
    if (!form.city.trim()) e.city = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Warehouse className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <SheetTitle>{mode === "add" ? "Add Warehouse" : "Edit Warehouse"}</SheetTitle>
              <SheetDescription>{mode === "add" ? "Register a new warehouse location" : "Update warehouse details"}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Warehouse name" className={cn("h-9 text-sm", errors.name && "border-red-400")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Code <span className="text-red-500">*</span></Label>
              <Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="WH-001" className={cn("h-9 text-sm font-mono", errors.code && "border-red-400")} />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-brand-300">
                {["Primary","Regional","Transit","Cold","Bonded"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Capacity (sq.ft)</Label>
              <Input value={form.capacity} onChange={e => set("capacity", e.target.value)} placeholder="e.g. 20000" type="number" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Address</Label>
            <Textarea value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street address…" rows={2} className="text-sm resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">City <span className="text-red-500">*</span></Label>
              <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" className={cn("h-9 text-sm", errors.city && "border-red-400")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">State</Label>
              <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="State" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Pincode</Label>
              <Input value={form.pincode} onChange={e => set("pincode", e.target.value)} placeholder="6-digit" maxLength={6} className="h-9 text-sm font-mono" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Manager</Label>
            <Input value={form.manager} onChange={e => set("manager", e.target.value)} placeholder="Manager name" className="h-9 text-sm" />
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium">Status</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{form.status === "active" ? "Operational" : "Inactive"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", form.status === "active" ? "text-emerald-600" : "text-muted-foreground")}>
                {form.status === "active" ? "Active" : "Inactive"}
              </span>
              <Switch checked={form.status === "active"} onCheckedChange={v => set("status", v ? "active" : "inactive")} />
            </div>
          </div>
          {mode === "edit" && wh && (
            <div className="bg-muted/30 rounded-xl p-3.5 text-[11px] space-y-2">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Record Info</p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div><span className="text-muted-foreground">Created By</span><p className="font-medium">{wh.createdBy}</p></div>
                <div><span className="text-muted-foreground">Created Date</span><p className="font-medium">{wh.createdDate}</p></div>
                <div><span className="text-muted-foreground">Updated By</span><p className="font-medium">{wh.updatedBy}</p></div>
                <div><span className="text-muted-foreground">Updated Date</span><p className="font-medium">{wh.updatedDate}</p></div>
              </div>
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => { if (validate()) onSave(form); }}>
            <Check className="w-3.5 h-3.5" /> {mode === "add" ? "Create Warehouse" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function WarehousePage() {
  const [records, setRecords] = useState<WH[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null);
  const [activeRec, setActiveRec] = useState<WH | null>(null);
  const [confirm, setConfirm] = useState<{ type: string; rec: WH } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string) => { setToast({ msg, type: "success" }); setTimeout(() => setToast(null), 3200); };
  const types = useMemo(() => [...new Set(records.map(r => r.type))].sort(), [records]);
  const total = records.filter(r => r.status !== "archived").length;
  const active = records.filter(r => r.status === "active").length;
  const totalCap = records.filter(r => r.status === "active").reduce((s, r) => s + r.capacity, 0);
  const activeFilters = filterStatus.length + filterType.length;

  const visible = useMemo(() => {
    let r = records.filter(w => w.status !== "archived");
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(w => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q) || w.city.toLowerCase().includes(q)); }
    if (filterStatus.length) r = r.filter(w => filterStatus.includes(w.status));
    if (filterType.length) r = r.filter(w => filterType.includes(w.type));
    return [...r].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? ""); const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, search, filterStatus, filterType, sortKey, sortDir]);

  const handleSort = (k: string) => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc"); } };
  const toggleStatus = (v: string) => setFilterStatus(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleType = (v: string) => setFilterType(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const handleSave = (form: FormState) => {
    if (sheetMode === "add") {
      setRecords(p => [...p, { id: Date.now(), code: form.code, name: form.name, type: form.type, address: form.address, city: form.city, state: form.state, pincode: form.pincode, manager: form.manager, capacity: Number(form.capacity) || 0, utilized: 0, status: form.status, createdBy: "Admin", createdDate: todayStr(), updatedBy: "Admin", updatedDate: todayStr() }]);
      showToast("Warehouse created");
    } else if (activeRec) {
      setRecords(p => p.map(r => r.id === activeRec.id ? { ...r, ...form, capacity: Number(form.capacity) || r.capacity, updatedBy: "Admin", updatedDate: todayStr() } : r));
      showToast("Warehouse updated");
    }
    setSheetMode(null); setActiveRec(null);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    const { type, rec } = confirm;
    if (type === "delete") { setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "archived" } : r)); showToast("Archived"); }
    else if (type === "deactivate") { setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "inactive" } : r)); showToast("Deactivated"); }
    else if (type === "activate") { setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "active" } : r)); showToast("Activated"); }
    setConfirm(null);
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Warehouses</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage warehouse locations and capacity</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Export</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => { setActiveRec(null); setSheetMode("add"); }}>
              <Plus className="w-3.5 h-3.5" /> Add Warehouse
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Warehouses", value: total, icon: Warehouse, accent: true },
            { label: "Operational", value: active, icon: CheckCircle2, accent: false },
            { label: "Total Capacity", value: `${(totalCap / 1000).toFixed(0)}K sq.ft`, icon: MapPin, accent: false },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search warehouses…" className="pl-8 h-8 text-xs" />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                activeFilters > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                {activeFilters > 0 && <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">{activeFilters}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-0">
              <div className="px-3 py-2.5 border-b border-border"><p className="text-xs font-semibold">Status</p></div>
              <div className="px-3 py-2 space-y-2">
                {["active","inactive"].map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={filterStatus.includes(v)} onChange={() => toggleStatus(v)} />
                    <span className="text-xs capitalize">{v}</span>
                  </label>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-border"><p className="text-xs font-semibold mb-2">Type</p>
                <div className="space-y-2">{types.map(t => (
                  <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={filterType.includes(t)} onChange={() => toggleType(t)} />
                    <span className="text-xs">{t}</span>
                  </label>
                ))}</div>
              </div>
              {activeFilters > 0 && <div className="px-3 py-2 border-t border-border"><button onClick={() => { setFilterStatus([]); setFilterType([]); }} className="text-xs text-brand-600 hover:underline">Clear all</button></div>}
            </PopoverContent>
          </Popover>
          {filterStatus.map(v => <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">{v} <button onClick={() => toggleStatus(v)}><X className="w-3 h-3" /></button></span>)}
          {filterType.map(v => <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">{v} <button onClick={() => toggleType(v)}><X className="w-3 h-3" /></button></span>)}
          <p className="ml-auto text-xs text-muted-foreground"><span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{total}</span></p>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Code"     colKey="code"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-24" />
                  <SortTh label="Name"     colKey="name"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Type"     colKey="type"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Location</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Manager</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Capacity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Utilized</th>
                  <SortTh label="Status"   colKey="status"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><Warehouse className="w-5 h-5 text-muted-foreground" /></div>
                      <p className="text-sm font-medium text-foreground">{search || activeFilters ? "No warehouses match your filters" : "No warehouses yet"}</p>
                      {(search || activeFilters > 0) && <button onClick={() => { setSearch(""); setFilterStatus([]); setFilterType([]); }} className="text-xs text-brand-600 hover:underline">Clear filters</button>}
                    </div>
                  </td></tr>
                ) : visible.map(rec => {
                  const pct = rec.capacity > 0 ? Math.round((rec.utilized / rec.capacity) * 100) : 0;
                  return (
                    <tr key={rec.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{rec.code}</span></td>
                      <td className="px-4 py-2">
                        <button onClick={() => { setActiveRec(rec); setSheetMode("edit"); }} className="text-xs font-semibold text-foreground hover:text-brand-600 transition-colors text-left">{rec.name}</button>
                      </td>
                      <td className="px-4 py-2"><span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{rec.type}</span></td>
                      <td className="px-4 py-2">
                        <p className="text-xs font-medium text-foreground">{rec.city}</p>
                        <p className="text-[11px] text-muted-foreground">{rec.state}</p>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{rec.manager || "—"}</td>
                      <td className="px-4 py-2 text-xs text-foreground">{rec.capacity.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
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
                            <DropdownMenuItem onClick={() => { setActiveRec(rec); setSheetMode("edit"); }}><Edit2 className="w-3.5 h-3.5" /> Edit</DropdownMenuItem>
                            {rec.status === "active"
                              ? <DropdownMenuItem onClick={() => setConfirm({ type: "deactivate", rec })}><XCircle className="w-3.5 h-3.5" /> Deactivate</DropdownMenuItem>
                              : <DropdownMenuItem onClick={() => setConfirm({ type: "activate", rec })}><CheckCircle2 className="w-3.5 h-3.5" /> Activate</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setConfirm({ type: "delete", rec })} className="text-red-600 focus:text-red-600 focus:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Delete</DropdownMenuItem>
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
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{visible.length}</span> of <span className="font-medium text-foreground">{total}</span> warehouses</p>
          </div>
        </div>
      </div>

      <WHSheet open={!!sheetMode} mode={sheetMode ?? "add"} wh={activeRec} onClose={() => { setSheetMode(null); setActiveRec(null); }} onSave={handleSave} />

      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", confirm?.type === "delete" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200")}>
                <AlertTriangle className={cn("w-4 h-4", confirm?.type === "delete" ? "text-red-500" : "text-amber-500")} />
              </div>
              {confirm?.type === "delete" ? "Archive Warehouse" : confirm?.type === "deactivate" ? "Deactivate" : "Activate"} Warehouse
            </DialogTitle>
            <DialogDescription className="pt-1">{confirm?.rec.name}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button size="sm" onClick={handleConfirm} className={cn("h-8 text-xs", confirm?.type === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-brand-600 hover:bg-brand-700 text-white")}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[400] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
          <Check className="w-4 h-4 flex-shrink-0" /> {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
