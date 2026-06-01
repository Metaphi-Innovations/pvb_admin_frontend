"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Users, Plus, Search, SlidersHorizontal, X, ShieldAlert,
  ChevronsUpDown, ChevronDown, Eye, Edit2,
  CheckCircle2, XCircle, Ban, ChevronLeft, ChevronRight, UserCheck, UserX,
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
import { CustomerStatusControl } from "./components/CustomerStatusControl";
import { readCustomerPermissions } from "./customer-permissions";

type SortKey = "customerName" | "status" | "creditLimit";

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
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? (
          <ChevronDown
            className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")}
          />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
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
    <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          accent ? "bg-brand-600" : color ?? "bg-muted",
        )}
      >
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [records, setRecords] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("customerName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [page, setPage] = useState(1);
  const [perms, setPerms] = useState(readCustomerPermissions);

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
          r.stateName.toLowerCase().includes(q) ||
          r.territoryName.toLowerCase().includes(q),
      );
    }
    if (filterStatus.length) data = data.filter((r) => filterStatus.includes(r.status));
    if (filterType.length) data = data.filter((r) => filterType.includes(r.customerType));

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
  }, [records, search, filterStatus, filterType, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search.trim() !== "" || filterStatus.length > 0 || filterType.length > 0;

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

  const start = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, filtered.length);

  if (!perms.canView) {
    return (
      <AppLayout>
        <div className="max-w-[1200px] mx-auto py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
          <p className="text-sm text-muted-foreground max-w-md">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              className="pl-9 h-8 text-xs"
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
            <PopoverContent align="start" className="w-60 p-0">
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
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
              <button type="button" onClick={() => toggleFilter(filterStatus, setFilterStatus, v)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh
                    label="Customer Name"
                    colKey="customerName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="min-w-[200px]"
                  />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                    Mobile
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                    State
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                    Territory
                  </th>
                  <SortTh
                    label="Credit Limit"
                    colKey="creditLimit"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[220px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
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
                      className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2">
                        {perms.canView ? (
                          <Link href={`/masters/customers/${r.id}`} className="block group/name">
                            <p className="text-xs font-semibold text-foreground group-hover/name:text-brand-700">
                              {r.customerName}
                            </p>
                            <p className="font-mono text-[11px] text-brand-700 mt-0.5">{r.customerCode}</p>
                          </Link>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold text-foreground">{r.customerName}</p>
                            <p className="font-mono text-[11px] text-brand-700 mt-0.5">{r.customerCode}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-foreground whitespace-nowrap">
                        {formatMobile(r.countryCode, r.mobile)}
                      </td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">
                        {CUSTOMER_TYPE_LABELS[r.customerType] ?? r.customerType}
                      </td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">
                        {r.stateName || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">
                        {r.territoryName || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold text-foreground whitespace-nowrap">
                        {formatCreditLimit(r.creditLimit)}
                      </td>
                      <td className="px-4 py-2">
                        <CustomerStatusControl
                          customer={r}
                          onStatusChange={updateStatus}
                          canEdit={perms.canEdit}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {perms.canView && (
                            <Link href={`/masters/customers/${r.id}`}>
                              <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 gap-1">
                                <Eye className="w-3 h-3" /> View
                              </Button>
                            </Link>
                          )}
                          {perms.canEdit && (
                            <Link href={`/masters/customers/${r.id}/edit`}>
                              <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 gap-1">
                                <Edit2 className="w-3 h-3" /> Edit
                              </Button>
                            </Link>
                          )}
                          {perms.canEdit && r.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2 gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                              onClick={() => updateStatus(r.id, "inactive")}
                            >
                              <UserX className="w-3 h-3" /> Deactivate
                            </Button>
                          ) : perms.canEdit && (r.status === "inactive" || r.status === "draft") ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => updateStatus(r.id, "active")}
                            >
                              <UserCheck className="w-3 h-3" /> Activate
                            </Button>
                          ) : null}
                        </div>
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-xs disabled:opacity-40 hover:bg-muted"
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
                className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-xs disabled:opacity-40 hover:bg-muted"
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
