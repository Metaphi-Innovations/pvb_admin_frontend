"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Warehouse as WarehouseIcon,
  CheckCircle2,
  XCircle,
  Wrench,
  Lock,
  Plus,
  Download,
  Eye,
  Edit2,
  MoreVertical,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  Check,
  Search,
} from "lucide-react";
import {
  type WarehouseMaster,
  type WarehouseStatus,
  loadWarehouses,
  saveWarehouses,
  todayStr,
  formatStatus,
  WAREHOUSE_TYPES,
  OPERATED_BY_OPTIONS,
  STATE_OPTIONS,
  MANAGER_OPTIONS,
} from "./warehouse-data";

type SortKey = "warehouseCode" | "warehouseName" | "warehouseType" | "state" | "city" | "status";

function StatusBadge({ status }: { status: WarehouseStatus }) {
  const cfg = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border-slate-200 bg-slate-100 text-slate-700",
    under_maintenance: "border-amber-200 bg-amber-50 text-amber-700",
    closed: "border-red-200 bg-red-50 text-red-700",
  }[status];

  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center justify-center whitespace-nowrap", cfg)}>
      {formatStatus(status)}
    </span>
  );
}

export default function WarehouseListPage() {
  const router = useRouter();
  const [records, setRecords] = useState<WarehouseMaster[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterOperatedBy, setFilterOperatedBy] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("warehouseCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [confirmDialog, setConfirmDialog] = useState<{
    action: string;
    record: WarehouseMaster;
  } | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    setRecords(loadWarehouses());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Filtering & Sorting ──────────────────────────
  const filtered = useMemo(() => {
    return records
      .filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.warehouseName.toLowerCase().includes(q) ||
          r.warehouseCode.toLowerCase().includes(q) ||
          r.gstNumber.toLowerCase().includes(q) ||
          r.contactPerson.toLowerCase().includes(q) ||
          r.mobileNumber.includes(q) ||
          r.city.toLowerCase().includes(q)
        );
      })
      .filter(r => filterStatus.length === 0 || filterStatus.includes(r.status))
      .filter(r => filterType.length === 0 || filterType.includes(r.warehouseType))
      .filter(r => filterState.length === 0 || filterState.includes(r.state))
      .filter(r => filterOperatedBy.length === 0 || filterOperatedBy.includes(r.operatedBy))
      .sort((a, b) => {
        let aVal: string = String(a[sortKey] ?? "").toLowerCase();
        let bVal: string = String(b[sortKey] ?? "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, search, filterStatus, filterType, filterState, filterOperatedBy, sortKey, sortDir]);

  // ── Counts ────────────────────────────────────────
  const totalCount = records.length;
  const activeCount = records.filter(r => r.status === "active").length;
  const inactiveCount = records.filter(r => r.status === "inactive").length;
  const maintenanceCount = records.filter(r => r.status === "under_maintenance").length;

  // ── Status update ─────────────────────────────────
  const handleStatusAction = (record: WarehouseMaster, action: string) => {
    setConfirmDialog({ action, record });
  };

  const confirmStatusChange = () => {
    if (!confirmDialog) return;
    const { action, record } = confirmDialog;
    let newStatus: WarehouseStatus = "active";
    if (action === "deactivate") newStatus = "inactive";
    else if (action === "activate") newStatus = "active";
    else if (action === "under_maintenance") newStatus = "under_maintenance";
    else if (action === "closed") newStatus = "closed";

    const updated = records.map(r =>
      r.id === record.id
        ? { ...r, status: newStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : r
    ) as WarehouseMaster[];
    setRecords(updated);
    saveWarehouses(updated);
    setToast({ msg: `Warehouse status updated to ${formatStatus(newStatus)} successfully`, type: "success" });
    setConfirmDialog(null);
  };

  // ── Export ─────────────────────────────────────────
  const handleExport = () => {
    const headers = [
      "Warehouse Code", "Warehouse Name", "Warehouse Type", "GST Number",
      "Contact Person", "Mobile Number", "Email Address", "Address",
      "State", "District", "City", "Pincode", "Capacity",
      "Manager", "Operated By", "Status",
    ];
    const rows = filtered.map(r => [
      r.warehouseCode, r.warehouseName, r.warehouseType, r.gstNumber,
      r.contactPerson, r.mobileNumber, r.emailAddress, `"${r.address}"`,
      r.state, r.district, r.city, r.pincode, String(r.capacity),
      r.manager, r.operatedBy, formatStatus(r.status),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouse_master_${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ msg: "Warehouse data exported successfully", type: "success" });
  };

  // ── Helpers ────────────────────────────────────────
  const activeFilterCount = filterStatus.length + filterType.length + filterState.length + filterOperatedBy.length;

  const toggleFilter = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Warehouse Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage warehouse locations, capacity, and operations
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 border border-border bg-white text-foreground hover:bg-muted"
              variant="outline"
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => router.push("/masters/warehouse/add")}
            >
              <Plus className="w-3.5 h-3.5" /> Add Warehouse
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <WarehouseIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{totalCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total Warehouses</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{activeCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Active</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{inactiveCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Inactive</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{maintenanceCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Under Maintenance</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, code, GST, contact, mobile, city..."
              className="h-8 text-xs pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  activeFilterCount > 0
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-0 bg-white border border-border shadow-lg">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter Warehouses</p>
              </div>
              <div className="p-3 space-y-3 max-h-[340px] overflow-y-auto">
                {/* Status Filter */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  {(["active", "inactive", "under_maintenance", "closed"] as WarehouseStatus[]).map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterStatus.includes(v)}
                        onChange={() => toggleFilter(filterStatus, setFilterStatus, v)}
                      />
                      <span className="text-xs text-foreground">{formatStatus(v)}</span>
                    </label>
                  ))}
                </div>

                {/* Type Filter */}
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Warehouse Type</p>
                  {WAREHOUSE_TYPES.map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterType.includes(v)}
                        onChange={() => toggleFilter(filterType, setFilterType, v)}
                      />
                      <span className="text-xs text-foreground">{v}</span>
                    </label>
                  ))}
                </div>

                {/* State Filter */}
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">State</p>
                  {[...new Set(records.map(r => r.state))].sort().map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterState.includes(v)}
                        onChange={() => toggleFilter(filterState, setFilterState, v)}
                      />
                      <span className="text-xs text-foreground">{v}</span>
                    </label>
                  ))}
                </div>

                {/* Operated By Filter */}
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operated By</p>
                  {OPERATED_BY_OPTIONS.map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterOperatedBy.includes(v)}
                        onChange={() => toggleFilter(filterOperatedBy, setFilterOperatedBy, v)}
                      />
                      <span className="text-xs text-foreground">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="px-3 py-2 border-t border-border bg-muted/10">
                  <button
                    onClick={() => {
                      setFilterStatus([]);
                      setFilterType([]);
                      setFilterState([]);
                      setFilterOperatedBy([]);
                    }}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Active filter chips */}
          {filterStatus.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {formatStatus(v as WarehouseStatus)}
              <button onClick={() => toggleFilter(filterStatus, setFilterStatus, v)} className="hover:text-brand-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filterType.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v}
              <button onClick={() => toggleFilter(filterType, setFilterType, v)} className="hover:text-brand-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filterState.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v}
              <button onClick={() => toggleFilter(filterState, setFilterState, v)} className="hover:text-brand-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filterOperatedBy.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v}
              <button onClick={() => toggleFilter(filterOperatedBy, setFilterOperatedBy, v)} className="hover:text-brand-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-max min-w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="WH Code" colKey="warehouseCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[120px] pl-4 py-3" />
                  <SortTh label="Warehouse Name" colKey="warehouseName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[200px]" />
                  <SortTh label="Type" colKey="warehouseType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[170px]" />
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[150px]">GST Number</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[140px]">Contact Person</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[130px]">Mobile</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[180px]">Email</th>
                  <SortTh label="State" colKey="state" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[130px]" />
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[130px]">District</th>
                  <SortTh label="City" colKey="city" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[120px]" />
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[90px]">Pincode</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[100px]">Capacity</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[130px]">Manager</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[110px]">Operated By</th>
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[160px]" />
                  <th className="sticky right-0 z-30 w-[80px] min-w-[80px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <WarehouseIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          No warehouses found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {search || activeFilterCount > 0
                            ? "Try adjusting your search or filters"
                            : "Add your first warehouse to get started"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(record => (
                    <tr
                      key={record.id}
                      className="border-b border-border/60 hover:bg-muted/20 transition-colors group align-top"
                    >
                      <td className="px-4 py-2.5 text-xs font-semibold font-mono text-brand-700 whitespace-nowrap">
                        {record.warehouseCode}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/masters/warehouse/${record.id}`} className="block group/name">
                          <p className="text-xs font-semibold text-foreground group-hover/name:text-brand-700 leading-4">
                            {record.warehouseName}
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground text-[11px] font-medium">
                          {record.warehouseType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-foreground whitespace-nowrap">
                        {record.gstNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {record.contactPerson || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-foreground whitespace-nowrap">
                        {record.mobileNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {record.emailAddress || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {record.state || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {record.district || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {record.city || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-foreground whitespace-nowrap">
                        {record.pincode || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {record.capacity ? record.capacity.toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {record.manager || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {record.operatedBy || "—"}
                      </td>
                      {/* Status dropdown */}
                      <td className="px-3 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="inline-flex items-center gap-1.5 focus:outline-none pt-0.5">
                              <StatusBadge status={record.status} />
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56 bg-white border border-border shadow-lg">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Status Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {record.status === "active" && (
                              <>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-slate-700 hover:text-slate-900"
                                  onClick={() => handleStatusAction(record, "deactivate")}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Deactivate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                                  onClick={() => handleStatusAction(record, "under_maintenance")}
                                >
                                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-red-700 hover:text-red-900"
                                  onClick={() => handleStatusAction(record, "closed")}
                                >
                                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                                </DropdownMenuItem>
                              </>
                            )}
                            {record.status === "inactive" && (
                              <>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                                  onClick={() => handleStatusAction(record, "activate")}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                                  onClick={() => handleStatusAction(record, "under_maintenance")}
                                >
                                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-red-700 hover:text-red-900"
                                  onClick={() => handleStatusAction(record, "closed")}
                                >
                                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                                </DropdownMenuItem>
                              </>
                            )}
                            {record.status === "under_maintenance" && (
                              <>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                                  onClick={() => handleStatusAction(record, "activate")}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-slate-700 hover:text-slate-900"
                                  onClick={() => handleStatusAction(record, "deactivate")}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Deactivate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-red-700 hover:text-red-900"
                                  onClick={() => handleStatusAction(record, "closed")}
                                >
                                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                                </DropdownMenuItem>
                              </>
                            )}
                            {record.status === "closed" && (
                              <>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                                  onClick={() => handleStatusAction(record, "activate")}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                                  onClick={() => handleStatusAction(record, "under_maintenance")}
                                >
                                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      {/* Actions */}
                      <td className="sticky right-0 z-20 w-[80px] min-w-[80px] px-3 py-2.5 bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex items-center justify-center transition-colors rounded-md w-7 h-7 text-muted-foreground hover:bg-muted focus:outline-none">
                              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-white border border-border shadow-lg">
                            <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
                              <Link href={`/masters/warehouse/${record.id}`}>
                                <Eye className="w-3.5 h-3.5" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
                              <Link href={`/masters/warehouse/${record.id}/edit`}>
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </Link>
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
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> warehouses
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <Dialog
          open={true}
          onOpenChange={open => {
            if (!open) setConfirmDialog(null);
          }}
        >
          <DialogContent className="max-w-sm bg-white border border-border shadow-xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border bg-amber-50 border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                {confirmDialog.action === "activate"
                  ? "Activate"
                  : confirmDialog.action === "deactivate"
                  ? "Deactivate"
                  : confirmDialog.action === "under_maintenance"
                  ? "Under Maintenance"
                  : "Close"}{" "}
                Warehouse?
              </DialogTitle>
              <DialogDescription className="pt-1">
                Are you sure you want to{" "}
                {confirmDialog.action === "activate"
                  ? "activate"
                  : confirmDialog.action === "deactivate"
                  ? "deactivate"
                  : confirmDialog.action === "under_maintenance"
                  ? "mark as under maintenance"
                  : "close"}{" "}
                &quot;{confirmDialog.record.warehouseName}&quot;?
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={confirmStatusChange}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-top-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          )}
        >
          <Check className="w-4 h-4 flex-shrink-0" />
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}

// ── SortTh Component ──────────────────────────────
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
  sortKey: string;
  sortDir: string;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-3 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>
          {label}
        </span>
        {active ? (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-brand-600 transition-transform",
              sortDir === "desc" && "rotate-180"
            )}
          />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
    </th>
  );
}
