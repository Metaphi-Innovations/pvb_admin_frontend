"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, Plus, Search, SlidersHorizontal, X, ShieldAlert,
  ChevronsUpDown, ChevronDown, Eye, Edit2, MoreVertical,
  CheckCircle2, XCircle, Ban, ChevronLeft, ChevronRight,
  UserCheck, UserX, CircleDashed, Ban as BanIcon,
  Filter,
} from "lucide-react";
import {
  type Customer,
  type CustomerStatus,
  loadCustomers,
  saveCustomers,
  todayStr,
  CUSTOMER_TYPE_LABELS,
  formatMobile,
  formatCreditLimit,
} from "./customer-data";
import { readCustomerPermissions } from "./customer-permissions";

type SortKey = "customerName" | "status" | "creditLimit";

function TableTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  filterValues,
  filterOptions,
  onFilterChange,
  className,
}: {
  label: string;
  colKey: string;
  sortKey?: SortKey;
  sortDir?: "asc" | "desc";
  onSort?: (k: SortKey) => void;
  filterValues?: string[];
  filterOptions?: string[];
  onFilterChange?: (vals: string[]) => void;
  className?: string;
}) {
  const sortable = !!onSort;
  const active = sortKey === colKey;
  const selected = filterValues?.[0] ?? "";
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(selected);

  useEffect(() => {
    if (open) setDraftValue(selected);
  }, [open, selected]);
  return (
    <th
      className={cn(
        "h-11 px-3 text-left text-[13px] font-semibold select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn("flex min-w-0 flex-1 items-center gap-1.5", sortable && "cursor-pointer")}
          onClick={() => sortable && onSort(colKey as SortKey)}
        >
          <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
          {sortable && (
            <span className="ml-auto inline-flex shrink-0 items-center gap-0.5">
              {active ? (
                <ChevronDown
                  className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")}
                />
              ) : (
                <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
              )}
            </span>
          )}
        </div>
        
        {onFilterChange && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded p-1 transition-colors hover:bg-muted",
                  selected ? "text-brand-600 bg-brand-50" : "text-muted-foreground/40 hover:text-muted-foreground/80",
                )}
              >
                <Filter className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={8}
              avoidCollisions={false}
              className="z-[9999] w-[220px] p-2.5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground">Select</div>
                <Select value={draftValue || "all"} onValueChange={(value) => setDraftValue(value === "all" ? "" : value)}>
                  <SelectTrigger className="h-9 w-full rounded-md border border-border bg-white px-2 text-xs text-foreground shadow-sm data-[state=open]:border-orange-500 data-[state=open]:ring-1 data-[state=open]:ring-orange-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    avoidCollisions={false}
                    className="z-[9999] bg-white border-border shadow-lg"
                  >
                    <SelectItem value="all" className="text-xs">
                      All
                    </SelectItem>
                    {(filterOptions ?? []).map((option) => (
                      <SelectItem key={option} value={option} className="text-xs hover:bg-orange-50 focus:bg-orange-50">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <Button type="button" variant="outline" className="h-8 px-2.5 text-[11px]" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="h-8 px-2.5 text-[11px] bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      onFilterChange(draftValue ? [draftValue] : []);
                      setOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </th>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          accent ? "bg-brand-600" : color ?? "bg-muted",
        )}
      >
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CustomerStatus }) {
  const cfg = {
    active: { className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    inactive: { className: "border-slate-200 bg-slate-100 text-slate-700" },
    draft: { className: "border-amber-200 bg-amber-50 text-amber-700" },
    blocked: { className: "border-red-200 bg-red-50 text-red-700" },
  }[status];

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", cfg.className)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function CustomersPage() {
  const [records, setRecords] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("customerName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [perms, setPerms] = useState(readCustomerPermissions);
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});

  const handleColFilter = (key: string, vals: string[]) => {
    setColFilters((prev) => {
      const next = { ...prev };
      if (!vals.length) delete next[key];
      else next[key] = vals;
      return next;
    });
    setPage(1);
  };

  useEffect(() => {
    setRecords(loadCustomers());
    setPerms(readCustomerPermissions());
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const updateStatus = (customerId: number, status: CustomerStatus, blockReason = "") => {
    const today = todayStr();
    const updated = records.map((r) => {
      if (r.id !== customerId) return r;
      return {
        ...r,
        status,
        blockReason: status === "blocked" ? blockReason : "",
        updatedBy: "Admin",
        updatedDate: today,
        lastStatusChange: today,
        statusHistory: [
          ...r.statusHistory,
          {
            date: today,
            from: r.status,
            to: status,
            by: "Admin",
            reason: status === "blocked" ? blockReason : `Status changed to ${status}`,
          },
        ],
      };
    });
    setRecords(updated);
    saveCustomers(updated);
    showToast("Status updated.");
  };

  const markDraft = (customerId: number) => updateStatus(customerId, "draft");

  const filtered = useMemo(() => {
    let data = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerCode.toLowerCase().includes(q) ||
          r.mobile.includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.gstin.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.stateName.toLowerCase().includes(q) ||
          r.districtName.toLowerCase().includes(q) ||
          r.territoryName.toLowerCase().includes(q),
      );
    }

    if (filterStatus.length) data = data.filter((r) => filterStatus.includes(r.status));
    if (filterType.length) data = data.filter((r) => filterType.includes(r.customerType));

    if (Object.keys(colFilters).length > 0) {
      data = data.filter((r) => {
        return Object.entries(colFilters).every(([key, vals]) => {
          if (!vals.length) return true;
          let rVal = "";
          if (key === "customerType") {
            rVal = CUSTOMER_TYPE_LABELS[r.customerType as keyof typeof CUSTOMER_TYPE_LABELS] ?? r.customerType;
          } else if (key === "creditLimit") {
            rVal = formatCreditLimit(r.creditLimit);
          } else if (key === "status") {
            rVal = r.status;
          } else if (key === "mobile") {
            rVal = formatMobile(r.countryCode, r.mobile);
          } else {
            rVal = String(r[key as keyof Customer] ?? "");
          }
          return vals.some((v) => v.toLowerCase() === rVal.toLowerCase());
        });
      });
    }

    data.sort((a, b) => {
      if (sortKey === "creditLimit") {
        const diff = a.creditLimit - b.creditLimit;
        return sortDir === "asc" ? diff : -diff;
      }
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return data;
  }, [records, search, filterStatus, filterType, sortKey, sortDir, colFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = search.trim() !== "" || filterStatus.length > 0 || filterType.length > 0 || Object.keys(colFilters).length > 0;
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleFilter = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
    setPage(1);
  };

  const total = records.length;
  const active = records.filter((r) => r.status === "active").length;
  const inactive = records.filter((r) => r.status === "inactive").length;
  const blocked = records.filter((r) => r.status === "blocked").length;

  const start = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filtered.length);

  if (!perms.canView) {
    return (
      <AppLayout>
        <div className="max-w-[1200px] mx-auto py-16 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center w-12 h-12 border rounded-xl bg-amber-50 border-amber-200">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            You do not have permission to view Customer Master. Ask your administrator for the View / Read permission.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Customer Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage distributors, FPOs, and retail customers
            </p>
          </div>
          {perms.canCreate && (
            <Link href="/masters/customers/new">
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
                <Plus className="w-3.5 h-3.5" /> Add Customer
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Customers" value={total} icon={Users} accent />
          <KpiCard label="Active" value={active} icon={CheckCircle2} color="bg-emerald-50" />
          <KpiCard label="Inactive" value={inactive} icon={XCircle} color="bg-slate-100" />
          <KpiCard label="Blocked" value={blocked} icon={Ban} color="bg-red-50" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, mobile, state…"
              className="h-8 text-xs pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterStatus.length + filterType.length > 0
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {filterStatus.length + filterType.length > 0 && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length + filterType.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 w-60">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter Customers</p>
              </div>
              <div className="px-3 py-3 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Status
                  </p>
                  <div className="space-y-2">
                    {(["active", "inactive", "draft", "blocked"] as CustomerStatus[]).map((v) => (
                      <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-brand-600"
                          checked={filterStatus.includes(v)}
                          onChange={() => toggleFilter(filterStatus, setFilterStatus, v)}
                        />
                        <span className="text-xs capitalize text-foreground">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Customer Type
                  </p>
                  <div className="space-y-2">
                    {Object.keys(CUSTOMER_TYPE_LABELS).map((v) => (
                      <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-brand-600"
                          checked={filterType.includes(v)}
                          onChange={() => toggleFilter(filterType, setFilterType, v)}
                        />
                        <span className="text-xs text-foreground">{CUSTOMER_TYPE_LABELS[v]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {(filterStatus.length > 0 || filterType.length > 0) && (
                <div className="px-3 py-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus([]);
                      setFilterType([]);
                      setPage(1);
                    }}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {filterStatus.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md bg-brand-50 border-brand-200 text-brand-700"
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
              <button type="button" onClick={() => toggleFilter(filterStatus, setFilterStatus, v)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="w-full max-w-full overflow-hidden bg-white border shadow-sm border-border rounded-xl">
          <div className="max-w-full overflow-x-auto overflow-y-hidden">
            <table className="w-max min-w-full border-collapse table-fixed">
              <thead>
                <tr className="border-b bg-muted/40 border-border">
                  <TableTh
                    label="Customer Name"
                    colKey="customerName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    filterValues={colFilters.customerName}
                    filterOptions={Array.from(new Set(records.map((r) => r.customerName).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("customerName", v)}
                    className="w-[190px] pl-4 py-3"
                  />
                  <TableTh
                    label="Mobile Number"
                    colKey="mobile"
                    filterValues={colFilters.mobile}
                    filterOptions={Array.from(new Set(records.map((r) => formatMobile(r.countryCode, r.mobile)).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("mobile", v)}
                    className="w-[150px]"
                  />
                  <TableTh
                    label="Email Address"
                    colKey="email"
                    filterValues={colFilters.email}
                    filterOptions={Array.from(new Set(records.map((r) => r.email).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("email", v)}
                    className="w-[190px]"
                  />
                  <TableTh
                    label="GSTIN"
                    colKey="gstin"
                    filterValues={colFilters.gstin}
                    filterOptions={Array.from(new Set(records.map((r) => r.gstin).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("gstin", v)}
                    className="w-[150px]"
                  />
                  <TableTh
                    label="Customer Type"
                    colKey="customerType"
                    filterValues={colFilters.customerType}
                    filterOptions={Array.from(new Set(records.map((r) => CUSTOMER_TYPE_LABELS[r.customerType] ?? r.customerType).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("customerType", v)}
                    className="w-[130px]"
                  />
                  <TableTh
                    label="Address"
                    colKey="address"
                    filterValues={colFilters.address}
                    filterOptions={Array.from(new Set(records.map((r) => r.address).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("address", v)}
                    className="w-[240px]"
                  />
                  <TableTh
                    label="State"
                    colKey="stateName"
                    filterValues={colFilters.stateName}
                    filterOptions={Array.from(new Set(records.map((r) => r.stateName).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("stateName", v)}
                    className="w-[130px]"
                  />
                  <TableTh
                    label="District"
                    colKey="districtName"
                    filterValues={colFilters.districtName}
                    filterOptions={Array.from(new Set(records.map((r) => r.districtName).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("districtName", v)}
                    className="w-[130px]"
                  />
                  <TableTh
                    label="Territory"
                    colKey="territoryName"
                    filterValues={colFilters.territoryName}
                    filterOptions={Array.from(new Set(records.map((r) => r.territoryName).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("territoryName", v)}
                    className="w-[130px]"
                  />
                  <TableTh
                    label="Credit Limit"
                    colKey="creditLimit"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    filterValues={colFilters.creditLimit}
                    filterOptions={Array.from(new Set(records.map((r) => formatCreditLimit(r.creditLimit)).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("creditLimit", v)}
                    className="w-[110px]"
                  />
                  <TableTh
                    label="Status"
                    colKey="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    filterValues={colFilters.status}
                    filterOptions={Array.from(new Set(records.map((r) => r.status.charAt(0).toUpperCase() + r.status.slice(1)).filter(Boolean))).sort()}
                    onFilterChange={(v) => handleColFilter("status", v)}
                    className="w-[110px] pr-4"
                  />
                  <th className="sticky right-0 z-30 w-[96px] min-w-[96px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 text-center py-14">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {hasFilters ? "No customers match your filters" : "No customers yet"}
                        </p>
                        {!hasFilters && perms.canCreate && (
                          <Link href="/masters/customers/new" className="text-xs text-brand-600 hover:underline">
                            + Add your first customer
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => (
                    <tr
                      key={r.id}
                      className="align-top transition-colors border-b border-border/60 hover:bg-muted/20"
                    >
                      <td className="py-2 pl-4 pr-3">
                        {perms.canView ? (
                          <Link href={`/masters/customers/${r.id}`} className="block group/name">
                            <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">
                              {r.customerName}
                            </p>
                            <p className="font-mono text-[10px] text-brand-700 mt-0.5 leading-3">{r.customerCode}</p>
                          </Link>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold leading-4 text-foreground">{r.customerName}</p>
                            <p className="font-mono text-[10px] text-brand-700 mt-0.5 leading-3">{r.customerCode}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground whitespace-nowrap">
                        {formatMobile(r.countryCode, r.mobile)}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">
                        {r.email || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground whitespace-nowrap">
                        {r.gstin || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">
                        {CUSTOMER_TYPE_LABELS[r.customerType] ?? r.customerType}
                      </td>
                      <td className="px-3 py-2 text-xs leading-4 text-foreground">
                        {r.address || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">
                        {r.stateName || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">
                        {r.districtName || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">
                        {r.territoryName || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-foreground whitespace-nowrap">
                        {formatCreditLimit(r.creditLimit)}
                      </td>
                      <td className="py-2 pl-3 pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="inline-flex items-center gap-1.5">
                              <StatusBadge status={r.status} />
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Status Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {r.status === "active" ? (
                              <DropdownMenuItem
                                className="gap-2 text-xs cursor-pointer"
                                onClick={() => updateStatus(r.id, "inactive")}
                              >
                                <UserX className="w-3.5 h-3.5" /> Deactivate
                              </DropdownMenuItem>
                            ) : r.status === "inactive" ? (
                              <DropdownMenuItem
                                className="gap-2 text-xs cursor-pointer"
                                onClick={() => updateStatus(r.id, "active")}
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Activate
                              </DropdownMenuItem>
                            ) : r.status === "draft" ? (
                              <DropdownMenuItem
                                className="gap-2 text-xs cursor-pointer"
                                onClick={() => updateStatus(r.id, "active")}
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Activate
                              </DropdownMenuItem>
                            ) : null}
                            {r.status !== "draft" && r.status !== "blocked" && (
                              <DropdownMenuItem
                                className="gap-2 text-xs cursor-pointer"
                                onClick={() => updateStatus(r.id, "blocked")}
                              >
                                <BanIcon className="w-3.5 h-3.5" /> Block Customer
                              </DropdownMenuItem>
                            )}
                            {r.status !== "blocked" && (
                              <DropdownMenuItem
                                className="gap-2 text-xs cursor-pointer"
                                onClick={() => markDraft(r.id)}
                              >
                                <CircleDashed className="w-3.5 h-3.5" /> Mark as Draft
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-3 py-2 pr-4 sticky right-0 z-20 w-[96px] min-w-[96px] bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center transition-colors rounded-md w-7 h-7 text-muted-foreground hover:bg-muted"
                              aria-label="Row actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {perms.canView && (
                              <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
                                <Link href={`/masters/customers/${r.id}`}>
                                  <Eye className="w-3.5 h-3.5" /> View
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {perms.canEdit && (
                              <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
                                <Link href={`/masters/customers/${r.id}/edit`}>
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
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
                  Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
                  <span className="font-medium text-foreground">{filtered.length}</span> customers
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
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center justify-center text-xs border rounded-md w-7 h-7 border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
