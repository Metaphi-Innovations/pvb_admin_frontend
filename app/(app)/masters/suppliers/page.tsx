"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
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
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Edit2,
  Eye,
  Filter,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import {
  getPaymentTermLabel,
  loadSuppliers,
  saveSuppliers,
  type Supplier,
  type SupplierStatus,
} from "./supplier-data";

type SortKey = "supplierName" | "status";

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
  onSort?: (key: SortKey) => void;
  filterValues?: string[];
  filterOptions?: string[];
  onFilterChange?: (vals: string[]) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  const sortable = !!onSort;
  const selected = filterValues?.[0] ?? "";
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(selected);

  useEffect(() => {
    if (open) setDraftValue(selected);
  }, [open, selected]);

  return (
    <th className={cn("h-11 px-3 text-left text-[13px] font-semibold select-none group whitespace-nowrap", active && "bg-brand-50/60", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", sortable && "cursor-pointer")} onClick={() => sortable && onSort(colKey as SortKey)}>
          <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
          {sortable &&
            <span className="ml-auto inline-flex shrink-0 items-center gap-0.5">
              {active ? (
                <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
              ) : (
                <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
              )}
            </span>
          }
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
            <PopoverContent align="start" className="z-50 w-[220px] p-2.5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground">Select</div>
                <Select value={draftValue || "all"} onValueChange={(value) => setDraftValue(value === "all" ? "" : value)}>
                  <SelectTrigger className="h-9 w-full rounded-md border border-border bg-white px-2 text-xs text-foreground shadow-sm data-[state=open]:border-orange-500 data-[state=open]:ring-1 data-[state=open]:ring-orange-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white border-border shadow-lg">
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
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2.5 text-[11px]"
                    onClick={() => setOpen(false)}
                  >
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
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : color ?? "bg-muted")}>
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SupplierStatus }) {
  const cfg = status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", cfg)}>
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );
}

export default function SuppliersPage() {
  const [records, setRecords] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("supplierName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setRecords(loadSuppliers());
  }, []);

  const handleColFilter = (key: string, vals: string[]) => {
    setColFilters((prev) => {
      const next = { ...prev };
      if (!vals.length) delete next[key];
      else next[key] = vals;
      return next;
    });
    setPage(1);
  };

  const updateStatus = (supplierId: number, status: SupplierStatus) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = records.map((item) =>
      item.id === supplierId ? { ...item, status, updatedBy: "Admin", updatedDate: today } : item,
    );
    setRecords(updated);
    saveSuppliers(updated);
    setToast("Status updated.");
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = useMemo(() => {
    let data = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((item) =>
        item.supplierName.toLowerCase().includes(q) ||
        item.supplierCode.toLowerCase().includes(q) ||
        item.mobile.includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.gstin.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.cibRegn.toLowerCase().includes(q) ||
        item.fcoRegn.toLowerCase().includes(q),
      );
    }

    if (filterStatus.length) data = data.filter((item) => filterStatus.includes(item.status));

    if (Object.keys(colFilters).length > 0) {
      data = data.filter((item) =>
        Object.entries(colFilters).every(([key, values]) => {
          if (!values.length) return true;
          let rowValue = "";
          if (key === "paymentTerms") rowValue = getPaymentTermLabel(item.paymentTerms);
          else if (key === "status") rowValue = item.status === "active" ? "Active" : "Inactive";
          else rowValue = String(item[key as keyof Supplier] ?? "");
          return values.some((value) => value.toLowerCase() === rowValue.toLowerCase());
        }),
      );
    }

    data.sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return data;
  }, [records, search, filterStatus, sortKey, sortDir, colFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = search.trim() !== "" || filterStatus.length > 0 || Object.keys(colFilters).length > 0;
  const total = records.length;
  const active = records.filter((item) => item.status === "active").length;
  const inactive = records.filter((item) => item.status === "inactive").length;
  const start = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filtered.length);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleStatusFilter = (value: string) => {
    setFilterStatus((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    setPage(1);
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Supplier Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage supplier records, payment terms, and compliance details</p>
          </div>
          <Link href="/masters/suppliers/add">
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
              <Plus className="w-3.5 h-3.5" /> Add Supplier
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Total Suppliers" value={total} icon={Building2} accent />
          <KpiCard label="Active" value={active} icon={CheckCircle2} color="bg-emerald-50" />
          <KpiCard label="Inactive" value={inactive} icon={XCircle} color="bg-slate-100" />
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
              placeholder="Search supplier, GSTIN, mobile..."
              className="h-8 text-xs pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterStatus.length > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {filterStatus.length > 0 && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 w-56">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter Suppliers</p>
              </div>
              <div className="px-3 py-3 space-y-2">
                {(["active", "inactive"] as SupplierStatus[]).map((value) => (
                  <label key={value} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-brand-600"
                      checked={filterStatus.includes(value)}
                      onChange={() => toggleStatusFilter(value)}
                    />
                    <span className="text-xs capitalize text-foreground">{value}</span>
                  </label>
                ))}
              </div>
              {filterStatus.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus([]);
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

          {filterStatus.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md bg-brand-50 border-brand-200 text-brand-700">
              {value.charAt(0).toUpperCase() + value.slice(1)}
              <button type="button" onClick={() => toggleStatusFilter(value)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="w-full max-w-full overflow-hidden bg-white border rounded-xl border-border shadow-sm">
          <div className="max-w-full overflow-x-auto overflow-y-hidden">
            <table className="w-max min-w-full border-collapse table-fixed">
              <thead>
                <tr className="border-b bg-muted/40 border-border">
                  <TableTh
                    label="Supplier Name"
                    colKey="supplierName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    filterValues={colFilters.supplierName}
                    filterOptions={Array.from(new Set(records.map((item) => item.supplierName).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("supplierName", value)}
                    className="w-[190px] pl-4 py-3"
                  />
                  <TableTh
                    label="Mobile Number"
                    colKey="mobile"
                    filterValues={colFilters.mobile}
                    filterOptions={Array.from(new Set(records.map((item) => item.mobile).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("mobile", value)}
                    className="w-[130px]"
                  />
                  <TableTh
                    label="Email Address"
                    colKey="email"
                    filterValues={colFilters.email}
                    filterOptions={Array.from(new Set(records.map((item) => item.email).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("email", value)}
                    className="w-[190px]"
                  />
                  <TableTh
                    label="GSTIN"
                    colKey="gstin"
                    filterValues={colFilters.gstin}
                    filterOptions={Array.from(new Set(records.map((item) => item.gstin).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("gstin", value)}
                    className="w-[150px]"
                  />
                  <TableTh
                    label="Address"
                    colKey="address"
                    filterValues={colFilters.address}
                    filterOptions={Array.from(new Set(records.map((item) => item.address).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("address", value)}
                    className="w-[240px]"
                  />
                  <TableTh
                    label="Payment Terms"
                    colKey="paymentTerms"
                    filterValues={colFilters.paymentTerms}
                    filterOptions={Array.from(new Set(records.map((item) => getPaymentTermLabel(item.paymentTerms)).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("paymentTerms", value)}
                    className="w-[130px]"
                  />
                  <TableTh
                    label="Status"
                    colKey="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    filterValues={colFilters.status}
                    filterOptions={["Active", "Inactive"]}
                    onFilterChange={(value) => handleColFilter("status", value)}
                    className="w-[110px]"
                  />
                  <TableTh
                    label="CIB Regn #"
                    colKey="cibRegn"
                    filterValues={colFilters.cibRegn}
                    filterOptions={Array.from(new Set(records.map((item) => item.cibRegn).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("cibRegn", value)}
                    className="w-[140px]"
                  />
                  <TableTh
                    label="CIB Regn Expiry"
                    colKey="cibRegnExpiry"
                    filterValues={colFilters.cibRegnExpiry}
                    filterOptions={Array.from(new Set(records.map((item) => item.cibRegnExpiry).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("cibRegnExpiry", value)}
                    className="w-[130px]"
                  />
                  <TableTh
                    label="FCO Regn #"
                    colKey="fcoRegn"
                    filterValues={colFilters.fcoRegn}
                    filterOptions={Array.from(new Set(records.map((item) => item.fcoRegn).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("fcoRegn", value)}
                    className="w-[140px]"
                  />
                  <TableTh
                    label="FCO Regn Expiry"
                    colKey="fcoRegnExpiry"
                    filterValues={colFilters.fcoRegnExpiry}
                    filterOptions={Array.from(new Set(records.map((item) => item.fcoRegnExpiry).filter(Boolean))).sort()}
                    onFilterChange={(value) => handleColFilter("fcoRegnExpiry", value)}
                    className="w-[130px] pr-4"
                  />
                  <th className="sticky right-0 z-30 w-[96px] min-w-[96px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {hasFilters ? "No suppliers match your filters" : "No suppliers yet"}
                        </p>
                        {!hasFilters && (
                          <Link href="/masters/suppliers/add" className="text-xs text-brand-600 hover:underline">
                            + Add your first supplier
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((item) => (
                    <tr key={item.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors align-top">
                      <td className="px-4 py-2">
                        <Link href={`/masters/suppliers/${item.id}`} className="block group/name">
                          <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">
                            {item.supplierName}
                          </p>
                          <p className="font-mono text-[10px] text-brand-700 mt-0.5 leading-3">{item.supplierCode}</p>
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground whitespace-nowrap">{item.mobile}</td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{item.email || "-"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground whitespace-nowrap">{item.gstin || "-"}</td>
                      <td className="px-3 py-2 text-xs leading-4 text-foreground">{item.address || "-"}</td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{getPaymentTermLabel(item.paymentTerms)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(item.id, item.status === "active" ? "inactive" : "active")}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-0.5 py-0.5 transition-opacity",
                            item.status === "active" ? "hover:opacity-90" : "hover:opacity-90",
                          )}
                          title="Click to toggle status"
                        >
                          <StatusBadge status={item.status} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{item.cibRegn || "-"}</td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{item.cibRegnExpiry || "-"}</td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{item.fcoRegn || "-"}</td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{item.fcoRegnExpiry || "-"}</td>
                      <td className="sticky right-0 z-20 w-[96px] min-w-[96px] px-3 py-2 pr-4 bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
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
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
                              <Link href={`/masters/suppliers/${item.id}`}>
                                <Eye className="w-3.5 h-3.5" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
                              <Link href={`/masters/suppliers/${item.id}/edit`}>
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
              {filtered.length === 0 ? (
                "No records"
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
                  <span className="font-medium text-foreground">{filtered.length}</span> suppliers
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <AutocompleteSelect
                options={[10, 25, 50, 100].map((value) => ({
                  value: String(value),
                  label: `${value} / page`,
                }))}
                value={String(pageSize)}
                onChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
                placeholder="Page size…"
                className="h-7 text-xs w-28"
              />
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

      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium bg-emerald-600">
          {toast}
        </div>
      )}
    </AppLayout>
  );
}
