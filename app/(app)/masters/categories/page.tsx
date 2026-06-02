"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Tag, Plus, Download, Search, SlidersHorizontal,
  MoreVertical, Eye, Edit2, Trash2, ChevronsUpDown, ChevronDown,
  CheckCircle2, XCircle, X, Check, AlertTriangle,
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
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Category {
  id: number;
  code: string;
  name: string;
  description: string;
  parentId: number | null;
  parentName: string;
  status: "active" | "inactive" | "archived";
  productCount: number;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  lastStatusChange: string;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED: Category[] = [
  { id: 1, code: "CAT-001", name: "Fertilizers", description: "Chemical and organic fertilizers", parentId: null, parentName: "", status: "active", productCount: 42, createdBy: "Admin", createdDate: "2024-01-10", updatedBy: "Admin", updatedDate: "2024-01-10", lastStatusChange: "2024-01-10" },
  { id: 2, code: "CAT-002", name: "Pesticides", description: "Insecticides, fungicides and herbicides", parentId: null, parentName: "", status: "active", productCount: 35, createdBy: "Admin", createdDate: "2024-01-12", updatedBy: "Admin", updatedDate: "2024-01-12", lastStatusChange: "2024-01-12" },
  { id: 3, code: "CAT-003", name: "Seeds", description: "Crop seeds and planting material", parentId: null, parentName: "", status: "active", productCount: 28, createdBy: "Admin", createdDate: "2024-01-15", updatedBy: "Admin", updatedDate: "2024-01-15", lastStatusChange: "2024-01-15" },
  { id: 4, code: "CAT-004", name: "NPK Fertilizers", description: "Nitrogen, Phosphorus and Potassium blends", parentId: 1, parentName: "Fertilizers", status: "active", productCount: 18, createdBy: "Admin", createdDate: "2024-01-18", updatedBy: "Admin", updatedDate: "2024-01-18", lastStatusChange: "2024-01-18" },
  { id: 5, code: "CAT-005", name: "Organic Fertilizers", description: "Bio-based organic soil amendments", parentId: 1, parentName: "Fertilizers", status: "active", productCount: 12, createdBy: "Admin", createdDate: "2024-02-01", updatedBy: "Admin", updatedDate: "2024-02-01", lastStatusChange: "2024-02-01" },
  { id: 6, code: "CAT-006", name: "Herbicides", description: "Weed control chemicals", parentId: 2, parentName: "Pesticides", status: "active", productCount: 15, createdBy: "Admin", createdDate: "2024-02-05", updatedBy: "Admin", updatedDate: "2024-02-05", lastStatusChange: "2024-02-05" },
  { id: 7, code: "CAT-007", name: "Insecticides", description: "Pest and insect control", parentId: 2, parentName: "Pesticides", status: "active", productCount: 20, createdBy: "Admin", createdDate: "2024-02-08", updatedBy: "Admin", updatedDate: "2024-02-08", lastStatusChange: "2024-02-08" },
  { id: 8, code: "CAT-008", name: "Hybrid Seeds", description: "High-yield hybrid crop varieties", parentId: 3, parentName: "Seeds", status: "active", productCount: 14, createdBy: "Admin", createdDate: "2024-02-10", updatedBy: "Admin", updatedDate: "2024-02-10", lastStatusChange: "2024-02-10" },
  { id: 9, code: "CAT-009", name: "Equipment", description: "Farm tools and equipment", parentId: null, parentName: "", status: "inactive", productCount: 8, createdBy: "Admin", createdDate: "2024-02-15", updatedBy: "Admin", updatedDate: "2024-03-01", lastStatusChange: "2024-03-01" },
  { id: 10, code: "CAT-010", name: "Micronutrients", description: "Trace element fertilizers", parentId: 1, parentName: "Fertilizers", status: "active", productCount: 9, createdBy: "Admin", createdDate: "2024-03-05", updatedBy: "Admin", updatedDate: "2024-03-05", lastStatusChange: "2024-03-05" },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

const STATUS_CFG = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  archived: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
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

// ── Sheet Form ─────────────────────────────────────────────────────────────────
interface FormState { name: string; code: string; description: string; parentId: string; status: "active" | "inactive"; }
interface FormErrors { name?: string; code?: string; }

function CategorySheet({ open, mode, category, categories, onClose, onSave }: {
  open: boolean; mode: "add" | "edit"; category: Category | null;
  categories: Category[]; onClose: () => void;
  onSave: (f: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>({ name: "", code: "", description: "", parentId: "", status: "active" });
  const [errors, setErrors] = useState<FormErrors>({});

  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && category) {
        setForm({ name: category.name, code: category.code, description: category.description, parentId: String(category.parentId ?? ""), status: category.status === "inactive" ? "inactive" : "active" });
      } else {
        setForm({ name: "", code: "", description: "", parentId: "", status: "active" });
      }
      setErrors({});
    }
  }, [open, mode, category]);

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Category name is required";
    if (!form.code.trim()) e.code = "Category code is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const topLevel = categories.filter(c => c.parentId === null && c.status !== "archived" && c.id !== category?.id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <SheetTitle>{mode === "add" ? "Add Category" : "Edit Category"}</SheetTitle>
              <SheetDescription>{mode === "add" ? "Create a new product category" : "Update category details"}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Category Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Fertilizers" className={cn("h-9 text-sm", errors.name && "border-red-400")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Code */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Category Code <span className="text-red-500">*</span></Label>
            <Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
              placeholder="e.g. CAT-001" className={cn("h-9 text-sm font-mono", errors.code && "border-red-400")} />
            {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
          </div>

          {/* Parent */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Parent Category</Label>
            <select value={form.parentId} onChange={e => set("parentId", e.target.value)}
              className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-300">
              <option value="">— Top Level —</option>
              {topLevel.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Brief description of this category…" rows={3} className="text-sm resize-none" />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium text-foreground">Status</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {form.status === "active" ? "Active and visible in product lists" : "Inactive and hidden"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn("text-xs font-medium", form.status === "active" ? "text-emerald-600" : "text-muted-foreground")}>
                {form.status === "active" ? "Active" : "Inactive"}
              </span>
              <Switch checked={form.status === "active"} onCheckedChange={v => set("status", v ? "active" : "inactive")} />
            </div>
          </div>

          {/* Audit info (edit mode) */}
          {mode === "edit" && category && (
            <div className="bg-muted/30 rounded-xl p-3.5 space-y-2 text-[11px]">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Record Info</p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div><span className="text-muted-foreground">Created By</span><p className="font-medium">{category.createdBy}</p></div>
                <div><span className="text-muted-foreground">Created Date</span><p className="font-medium">{category.createdDate}</p></div>
                <div><span className="text-muted-foreground">Updated By</span><p className="font-medium">{category.updatedBy}</p></div>
                <div><span className="text-muted-foreground">Updated Date</span><p className="font-medium">{category.updatedDate}</p></div>
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => { if (validate()) onSave(form); }}>
            <Check className="w-3.5 h-3.5" />
            {mode === "add" ? "Create Category" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [records, setRecords] = useState<Category[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null);
  const [activeRec, setActiveRec] = useState<Category | null>(null);
  const [confirm, setConfirm] = useState<{ type: string; rec: Category } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const visible = useMemo(() => {
    let r = records.filter(c => c.status !== "archived");
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (filterStatus.length) r = r.filter(c => filterStatus.includes(c.status));
    r = [...r].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return r;
  }, [records, search, filterStatus, sortKey, sortDir]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const toggleFilter = (v: string) => setFilterStatus(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const total = records.filter(c => c.status !== "archived").length;
  const active = records.filter(c => c.status === "active").length;
  const inactive = records.filter(c => c.status === "inactive").length;

  const nextCode = () => {
    const nums = records.map(r => parseInt(r.code.replace("CAT-", "")) || 0);
    return `CAT-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
  };

  const handleSave = (form: FormState) => {
    if (sheetMode === "add") {
      const newRec: Category = {
        id: Date.now(), code: form.code || nextCode(), name: form.name,
        description: form.description, parentId: form.parentId ? Number(form.parentId) : null,
        parentName: form.parentId ? (records.find(r => r.id === Number(form.parentId))?.name ?? "") : "",
        status: form.status, productCount: 0,
        createdBy: "Admin", createdDate: todayStr(), updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr(),
      };
      setRecords(p => [...p, newRec]);
      showToast("Category created successfully");
    } else if (activeRec) {
      setRecords(p => p.map(r => r.id === activeRec.id
        ? {
          ...r, name: form.name, code: form.code, description: form.description,
          parentId: form.parentId ? Number(form.parentId) : null,
          parentName: form.parentId ? (records.find(x => x.id === Number(form.parentId))?.name ?? "") : "",
          status: form.status, updatedBy: "Admin", updatedDate: todayStr()
        }
        : r));
      showToast("Category updated successfully");
    }
    setSheetMode(null);
    setActiveRec(null);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    const { type, rec } = confirm;
    if (type === "delete") {
      setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "archived", updatedBy: "Admin", updatedDate: todayStr() } : r));
      showToast("Category archived");
    } else if (type === "deactivate") {
      setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "inactive", updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() } : r));
      showToast("Category deactivated");
    } else if (type === "activate") {
      setRecords(p => p.map(r => r.id === rec.id ? { ...r, status: "active", updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() } : r));
      showToast("Category activated");
    }
    setConfirm(null);
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Categories</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage product categories and subcategories</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => { setActiveRec(null); setSheetMode("add"); }}>
              <Plus className="w-3.5 h-3.5" /> Add Category
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Categories", value: total, icon: Tag, accent: true },
            { label: "Active", value: active, icon: CheckCircle2, accent: false },
            { label: "Inactive", value: inactive, icon: XCircle, accent: false },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}>
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search categories…" className="pl-8 h-8 text-xs" />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                filterStatus.length > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                {filterStatus.length > 0 && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-0">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter by Status</p>
              </div>
              <div className="px-3 py-2.5 space-y-2">
                {["active", "inactive"].map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                      checked={filterStatus.includes(v)} onChange={() => toggleFilter(v)} />
                    <span className="text-xs capitalize text-foreground">{v}</span>
                  </label>
                ))}
              </div>
              {filterStatus.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button onClick={() => setFilterStatus([])} className="text-xs text-brand-600 hover:underline">Clear filter</button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {filterStatus.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v.charAt(0).toUpperCase() + v.slice(1)}
              <button onClick={() => toggleFilter(v)}><X className="w-3 h-3" /></button>
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
                  <SortTh label="Code" colKey="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
                  <SortTh label="Name" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Parent</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Products</th>
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Tag className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {search || filterStatus.length ? "No categories match your filters" : "No categories yet"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {search || filterStatus.length
                            ? <button onClick={() => { setSearch(""); setFilterStatus([]); }} className="text-brand-600 hover:underline">Clear filters</button>
                            : <button onClick={() => setSheetMode("add")} className="text-brand-600 hover:underline">+ Add Category</button>}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : visible.map(rec => (
                  <tr key={rec.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs font-semibold text-brand-700">{rec.code}</span>
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => { setActiveRec(rec); setSheetMode("edit"); }}
                        className="text-xs font-semibold text-foreground hover:text-brand-600 transition-colors text-left">
                        {rec.name}
                      </button>
                      {rec.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[240px]">{rec.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {rec.parentName || <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs font-medium text-foreground">{rec.productCount}</td>
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
                          <DropdownMenuItem onClick={() => { setActiveRec(rec); setSheetMode("edit"); }}>
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
              <span className="font-medium text-foreground">{total}</span> categories
            </p>
          </div>
        </div>
      </div>

      {/* Sheet */}
      <CategorySheet open={!!sheetMode} mode={sheetMode ?? "add"} category={activeRec}
        categories={records} onClose={() => { setSheetMode(null); setActiveRec(null); }} onSave={handleSave} />

      {/* Confirm Dialog */}
      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                confirm?.type === "delete" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200")}>
                <AlertTriangle className={cn("w-4 h-4", confirm?.type === "delete" ? "text-red-500" : "text-amber-500")} />
              </div>
              {confirm?.type === "delete" ? "Archive Category" : confirm?.type === "deactivate" ? "Deactivate Category" : "Activate Category"}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {confirm?.type === "delete"
                ? `Archive "${confirm.rec.name}"? It will no longer appear in product lists.`
                : confirm?.type === "deactivate"
                  ? `Deactivate "${confirm?.rec.name}"? It will be hidden from product forms.`
                  : `Activate "${confirm?.rec.name}"? It will be available in product forms.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button size="sm" onClick={handleConfirm}
              className={cn("h-8 text-xs gap-1.5", confirm?.type === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-brand-600 hover:bg-brand-700 text-white")}>
              {confirm?.type === "delete" ? "Archive" : confirm?.type === "deactivate" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast */}
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
