"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  Edit2,
  MoreVertical,
  SlidersHorizontal,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronDown,
  Code2,
  Eye,
  Trash2,
} from "lucide-react";
import {
  HSNMaster,
  loadHSNMasters,
  saveHSNMasters,
  todayStr,
  nextHSNId,
  generateHSNCode,
} from "./hsn-data";
import { loadGSTMasters } from "../gst/gst-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterViewRow } from "@/components/masters/MasterModule";

type SortKey = "hsnId" | "hsnCode" | "hsnDescription" | "gstRate" | "applicableCategory" | "status";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function StatusToggle({ record, onToggle }: { record: HSNMaster; onToggle: (item: HSNMaster) => void }) {
  const active = record.status === "active";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(record);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

function SortTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  colKey: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn("px-3 py-3 text-left text-[13px] font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60", className)}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? (
          <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
        )}
      </div>
    </th>
  );
}

export default function HSNPage() {
  const [records, setRecords] = useState<HSNMaster[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterGstRate, setFilterGstRate] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("hsnId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<HSNMaster | null>(null);
  const [form, setForm] = useState({
    hsnId: "",
    hsnCode: "",
    hsnDescription: "",
    gstRate: "",
    applicableCategory: "Seeds" as "Seeds" | "Fertilizers" | "Pesticides" | "Bio Products" | "Equipment",
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<HSNMaster | null>(null);

  useEffect(() => {
    setRecords(loadHSNMasters());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const gstRatesList = useMemo(() => {
    try {
      const list = loadGSTMasters();
      if (list && list.length > 0) {
        const sorted = [...list].sort((a, b) => a.gstPercentage - b.gstPercentage);
        return Array.from(new Set(sorted.map((g) => `${g.gstPercentage}%`)));
      }
    } catch {
      // ignore
    }
    return ["0%", "5%", "12%", "18%", "28%"];
  }, []);

  useEffect(() => {
    if (gstRatesList.length > 0 && !form.gstRate) {
      setForm((prev) => ({ ...prev, gstRate: gstRatesList[0] }));
    }
  }, [gstRatesList, form.gstRate]);

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        const q = search.toLowerCase();
        return (
          r.hsnCode.toLowerCase().includes(q) ||
          r.hsnDescription.toLowerCase().includes(q) ||
          r.applicableCategory.toLowerCase().includes(q) ||
          r.hsnId.toLowerCase().includes(q)
        );
      })
      .filter((r) => (filterStatus.length ? filterStatus.includes(r.status) : true))
      .filter((r) => (filterCategory.length ? filterCategory.includes(r.applicableCategory) : true))
      .filter((r) => (filterGstRate.length ? filterGstRate.includes(r.gstRate) : true))
      .sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, search, filterStatus, filterCategory, filterGstRate, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleFilterStatus = (status: string) => {
    setFilterStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const toggleFilterCategory = (cat: string) => {
    setFilterCategory((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleFilterGstRate = (rate: string) => {
    setFilterGstRate((prev) =>
      prev.includes(rate) ? prev.filter((r) => r !== rate) : [...prev, rate],
    );
  };

  const toggleStatus = (record: HSNMaster) => {
    const newStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((r) =>
      r.id === record.id
        ? {
            ...r,
            status: newStatus as "active" | "inactive",
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : r,
    );
    setRecords(updated);
    saveHSNMasters(updated);
    setToast({
      msg: `HSN status updated to ${newStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const openAdd = () => {
    const nextIdVal = nextHSNId(records);
    const code = generateHSNCode(nextIdVal);
    setForm({
      hsnId: code,
      hsnCode: "",
      hsnDescription: "",
      gstRate: gstRatesList[0] || "18%",
      applicableCategory: "Seeds",
      status: "active",
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: HSNMaster) => {
    setForm({
      hsnId: row.hsnId,
      hsnCode: row.hsnCode,
      hsnDescription: row.hsnDescription,
      gstRate: row.gstRate,
      applicableCategory: row.applicableCategory,
      status: row.status,
    });
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: HSNMaster) => {
    setActive(row);
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
  };

  const setFormField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.hsnCode.trim()) e.hsnCode = "HSN Code is required";
    if (!form.hsnDescription.trim()) e.hsnDescription = "HSN Description is required";
    if (!form.gstRate) e.gstRate = "GST Rate is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const persist = () => {
    if (!validate()) return;
    const list = loadHSNMasters();
    let updatedList: HSNMaster[];
    if (sheetMode === "add") {
      const id = nextHSNId(list);
      const newRecord: HSNMaster = {
        id,
        hsnId: form.hsnId,
        hsnCode: form.hsnCode,
        hsnDescription: form.hsnDescription,
        gstRate: form.gstRate,
        applicableCategory: form.applicableCategory,
        status: form.status,
        createdBy: "Admin",
        createdDate: todayStr(),
        updatedBy: "Admin",
        updatedDate: todayStr(),
      };
      updatedList = [...list, newRecord];
      setToast({ msg: "HSN added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id
          ? {
              ...r,
              hsnCode: form.hsnCode,
              hsnDescription: form.hsnDescription,
              gstRate: form.gstRate,
              applicableCategory: form.applicableCategory,
              status: form.status,
              updatedBy: "Admin",
              updatedDate: todayStr(),
            }
          : r,
      );
      setToast({ msg: "HSN updated successfully", type: "success" });
    } else {
      return;
    }
    saveHSNMasters(updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadHSNMasters().filter((r) => r.id !== deleteTarget.id);
    saveHSNMasters(list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "HSN deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "HSN ID", "HSN Code", "HSN Description", "GST Rate", "Applicable Category", "Status", "Created By", "Created Date", "Updated By", "Updated Date"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.hsnId.replace(/"/g, '""')}"`,
          `"${r.hsnCode.replace(/"/g, '""')}"`,
          `"${r.hsnDescription.replace(/"/g, '""')}"`,
          r.gstRate,
          r.applicableCategory,
          r.status,
          r.createdBy,
          r.createdDate,
          r.updatedBy,
          r.updatedDate,
        ];
        csvRows.push(row.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `hsn_export_${todayStr()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "HSN configs exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export HSN configs", type: "error" });
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const start = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filtered.length);

  const sheetTitle =
    sheetMode === "add"
      ? "Add HSN"
      : sheetMode === "edit"
      ? "Edit HSN"
      : "View HSN";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">HSN Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage Harmonized System of Nomenclature codes and GST configurations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-border bg-white text-xs text-foreground hover:bg-muted"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
              onClick={openAdd}
            >
              <Plus className="h-3.5 w-3.5" /> Add HSN
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total HSN Codes" value={records.length} icon={Code2} accent={true} />
          <MiniKPICard
            label="Active"
            value={records.filter((r) => r.status === "active").length}
            icon={CheckCircle2}
            accent={false}
          />
          <MiniKPICard
            label="Inactive"
            value={records.filter((r) => r.status === "inactive").length}
            icon={XCircle}
            accent={false}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search HSN code, description..."
              className="h-8 pl-9 text-xs"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterStatus.length > 0 || filterCategory.length > 0 || filterGstRate.length > 0
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {(filterStatus.length > 0 || filterCategory.length > 0 || filterGstRate.length > 0) && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length + filterCategory.length + filterGstRate.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0 bg-white border shadow-lg border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter HSN</p>
              </div>
              <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GST Rate</p>
                  {gstRatesList.map((rate) => (
                    <label key={rate} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterGstRate.includes(rate)}
                        onChange={() => toggleFilterGstRate(rate)}
                      />
                      <span className="text-xs text-foreground">{rate}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Applicable Category</p>
                  {["Seeds", "Fertilizers", "Pesticides", "Bio Products", "Equipment"].map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterCategory.includes(cat)}
                        onChange={() => toggleFilterCategory(cat)}
                      />
                      <span className="text-xs text-foreground">{cat}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  {["active", "inactive"].map((v) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterStatus.includes(v)}
                        onChange={() => toggleFilterStatus(v)}
                      />
                      <span className="text-xs capitalize text-foreground">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              {(filterStatus.length > 0 || filterCategory.length > 0 || filterGstRate.length > 0) && (
                <div className="px-3 py-2 border-t border-border bg-muted/10">
                  <button
                    onClick={() => {
                      setFilterStatus([]);
                      setFilterCategory([]);
                      setFilterGstRate([]);
                    }}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed w-max">
              <thead>
                <tr className="border-b bg-muted/40 border-border">
                  <SortTh label="HSN ID" colKey="hsnId" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[120px] pl-4 py-3" />
                  <SortTh label="HSN Code" colKey="hsnCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[140px]" />
                  <SortTh label="HSN Description" colKey="hsnDescription" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[320px]" />
                  <SortTh label="GST Rate" colKey="gstRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[120px]" />
                  <SortTh label="Applicable Category" colKey="applicableCategory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[180px]" />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[130px]" />
                  <th className="sticky right-0 z-30 w-[80px] min-w-[80px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => openView(row)}
                      className="align-top transition-colors border-b border-border/60 hover:bg-muted/20 group cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-xs font-semibold font-mono text-brand-700 whitespace-nowrap">
                        {row.hsnId}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-foreground font-mono">
                        {row.hsnCode}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-medium">
                        {row.hsnDescription}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">
                        {row.gstRate}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">
                        {row.applicableCategory}
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <StatusToggle record={row} onToggle={toggleStatus} />
                      </td>
                      <td
                        className="sticky right-0 z-20 w-[80px] min-w-[80px] px-3 py-2.5 bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-white border shadow-lg border-border">
                            <DropdownMenuItem
                              onClick={() => openView(row)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEdit(row)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(row)}
                              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              {filtered.length === 0 ? (
                "No records"
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{start}-{end}</span> of{" "}
                  <span className="font-medium text-foreground">{filtered.length}</span> HSN configs
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 text-xs bg-white border rounded-md h-7 border-border text-foreground"
              >
                {[10, 25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value} / page
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="flex items-center justify-center text-xs border rounded-md w-7 h-7 border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-2 min-w-[48px] text-center">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="flex items-center justify-center text-xs border rounded-md w-7 h-7 border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-start gap-3 pr-8">
              <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
                <SheetDescription className="text-xs">
                  {sheetMode === "view" ? "Read-only details" : "Compact HSN form"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody>
            {sheetMode === "view" && active ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
                  <MasterViewRow label="HSN Code" value={<span className="font-mono">{active.hsnCode}</span>} />
                  <MasterViewRow label="HSN ID" value={<span className="font-mono">{active.hsnId}</span>} />
                  <MasterViewRow label="HSN Description" value={active.hsnDescription} />
                  <MasterViewRow label="GST Rate" value={active.gstRate} />
                  <MasterViewRow label="Applicable Category" value={active.applicableCategory} />
                  <MasterViewRow label="Status" value={active.status === "active" ? "Active" : "Inactive"} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Created By</p>
                    <p className="font-medium">{active.createdBy}</p>
                    <p className="text-muted-foreground">{active.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Updated By</p>
                    <p className="font-medium">{active.updatedBy}</p>
                    <p className="text-muted-foreground">{active.updatedDate}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">HSN ID (Auto)</Label>
                    <Input
                      value={form.hsnId}
                      disabled
                      className="h-8 text-xs cursor-not-allowed bg-muted/30 text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      HSN Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.hsnCode}
                      onChange={(e) => setFormField("hsnCode", e.target.value)}
                      placeholder="e.g., 120991"
                      className={cn("h-8 text-xs", errors.hsnCode && "border-red-400 focus-visible:ring-red-300")}
                    />
                    {errors.hsnCode && <p className="text-[11px] text-red-500">{errors.hsnCode}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      GST Rate <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={form.gstRate}
                      onChange={(e) => setFormField("gstRate", e.target.value)}
                      className="w-full h-8 px-2 text-xs border border-border rounded-lg bg-background"
                    >
                      {gstRatesList.map((rate) => (
                        <option key={rate} value={rate}>{rate}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Applicable Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={form.applicableCategory}
                      onChange={(e) => setFormField("applicableCategory", e.target.value)}
                      className="w-full h-8 px-2 text-xs border border-border rounded-lg bg-background"
                    >
                      {["Seeds", "Fertilizers", "Pesticides", "Bio Products", "Equipment"].map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-medium">
                      HSN Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      value={form.hsnDescription}
                      onChange={(e) => setFormField("hsnDescription", e.target.value)}
                      placeholder="Describe this HSN code..."
                      rows={3}
                      className={cn("text-xs rounded-lg resize-none min-h-[72px]", errors.hsnDescription && "border-red-400 focus-visible:ring-red-300")}
                    />
                    {errors.hsnDescription && <p className="text-[11px] text-red-500">{errors.hsnDescription}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 mt-4">
                  <div>
                    <p className="text-xs font-medium">Status</p>
                    <p className="text-[11px] text-muted-foreground">{form.status === "active" ? "Active" : "Inactive"}</p>
                  </div>
                  <Switch
                    checked={form.status === "active"}
                    onCheckedChange={(checked) =>
                      setFormField("status", checked ? "active" : "inactive")
                    }
                  />
                </div>
              </div>
            )}
          </SheetBody>

          <SheetFooter>
            {sheetMode === "view" ? (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeSheet}>
                  Back
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={() => active && openEdit(active)}
                >
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeSheet}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={persist}
                >
                  Save
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete record?</DialogTitle>
            <DialogDescription className="text-xs">
              This action cannot be undone. The record will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
