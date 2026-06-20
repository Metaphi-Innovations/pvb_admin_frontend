"use client";

import React, { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ArrowDownToLine,
  SlidersHorizontal,
  Columns,
  AlertCircle,
  FileX,
  ServerCrash,
  UserPlus,
  Archive,
  RefreshCw,
  RotateCcw,
  Plus,
} from "lucide-react";

export interface EnterpriseTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  render?: (value: unknown, row: T) => React.ReactNode;
}

export type EnterpriseTableState = "data" | "loading" | "empty" | "no-results" | "error";

export interface EnterpriseTableProps<T extends object = Record<string, unknown>> {
  data: T[];
  columns: EnterpriseTableColumn<T>[];
  title?: string;
  subtitle?: string;
  state?: EnterpriseTableState;
  expandable?: boolean;
  perPage?: number;
  showRowActions?: boolean;
  showBulkActions?: boolean;
  stickyHeader?: boolean;
  getRowKey?: (row: T, index: number) => string;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3">
        <div className="w-4 h-4 bg-muted animate-pulse rounded" />
      </td>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 bg-muted animate-pulse rounded ${i === 0 ? "w-36" : i % 3 === 0 ? "w-16" : "w-24"}`} />
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="w-6 h-6 bg-muted animate-pulse rounded" />
      </td>
    </tr>
  );
}

function RowActionMenu({ canApprove = false }: { canApprove?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 hover:bg-muted rounded-md transition-colors inline-flex">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2">
          <Eye className="w-3.5 h-3.5" /> View
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </DropdownMenuItem>
        {canApprove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs gap-2 text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2">
          <Download className="w-3.5 h-3.5" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2">
          <Printer className="w-3.5 h-3.5" /> Print
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export function EnterpriseTable<T extends object>({
  data,
  columns,
  title,
  subtitle,
  state = "data",
  expandable = false,
  perPage = 10,
  showRowActions = true,
  showBulkActions = true,
  stickyHeader = true,
  getRowKey,
}: EnterpriseTableProps<T>) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      search.trim()
        ? data.filter((r) =>
            Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase())),
          )
        : data,
    [data, search],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const c =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? c : -c;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  const effectiveState: EnterpriseTableState =
    state !== "data" ? state : search.trim() && filtered.length === 0 ? "no-results" : "data";

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleRow = (i: number) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const toggleAll = () =>
    setSelected(selected.size === paged.length ? new Set() : new Set(paged.map((_, i) => i)));

  const toggleExpand = (i: number) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const colSpan = columns.length + (expandable ? 3 : 2) + (showRowActions ? 0 : -1);

  const pageNumbers = useMemo(() => {
    const max = Math.min(totalPages, 5);
    if (totalPages <= 5) return Array.from({ length: max }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search…"
              className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 w-44 bg-white"
            />
          </div>
          <button
            type="button"
            className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-1.5"
          >
            <Columns className="w-3.5 h-3.5" /> Columns
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {showBulkActions && selected.size > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-brand-700">
            {selected.size} row{selected.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className={`overflow-x-auto ${stickyHeader ? "max-h-[calc(100vh-280px)] overflow-y-auto" : ""}`}>
          <table className="w-full text-sm min-w-[900px]">
            <thead className={stickyHeader ? "sticky top-0 z-10" : undefined}>
              <tr className="bg-muted/40 border-b border-border">
                <th className="w-10 px-4 py-2.5 bg-muted/40">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-600"
                    checked={selected.size === paged.length && paged.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                {expandable && <th className="w-8 px-2 py-3 bg-muted/40" />}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && toggleSort(col.key)}
                    className={`px-4 py-3 text-xs font-semibold text-foreground whitespace-nowrap group cursor-pointer select-none bg-muted/40 ${alignClass(col.align)}`}
                  >
                    <div className={`flex items-center gap-1.5 ${col.align === "right" ? "justify-end" : ""}`}>
                      {col.label}
                      {col.sortable !== false &&
                        (sortKey === col.key ? (
                          <ChevronDown
                            className={`w-3 h-3 text-brand-600 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`}
                          />
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
                        ))}
                    </div>
                  </th>
                ))}
                {showRowActions && <th className="w-12 px-4 py-2.5 bg-muted/40" />}
              </tr>
            </thead>
            <tbody>
              {effectiveState === "loading" &&
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} cols={columns.length + (expandable ? 1 : 0)} />
                ))}

              {effectiveState === "empty" && (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <FileX className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No records yet</p>
                    </div>
                  </td>
                </tr>
              )}

              {effectiveState === "no-results" && (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No results found</p>
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="px-4 py-2 border border-border text-xs rounded-lg hover:bg-muted flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Clear Search
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {effectiveState === "error" && (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                        <ServerCrash className="w-6 h-6 text-red-500" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Failed to load data</p>
                      <button
                        type="button"
                        className="px-4 py-2 border border-border text-xs rounded-lg hover:bg-muted flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {effectiveState === "data" &&
                paged.map((row, idx) => {
                  const rowKey = getRowKey?.(row, idx) ?? String(idx);
                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        className={`border-b border-border transition-colors ${selected.has(idx) ? "bg-brand-50/60" : "hover:bg-muted/20"}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={selected.has(idx)}
                            onChange={() => toggleRow(idx)}
                          />
                        </td>
                        {expandable && (
                          <td className="px-2 py-3">
                            <button
                              type="button"
                              onClick={() => toggleExpand(idx)}
                              className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                            >
                              <ChevronDown
                                className={`w-3 h-3 text-muted-foreground transition-transform ${expanded.has(idx) ? "rotate-180" : ""}`}
                              />
                            </button>
                          </td>
                        )}
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-sm text-foreground whitespace-nowrap ${alignClass(col.align)}`}
                          >
                            {col.render
                              ? col.render((row as Record<string, unknown>)[col.key], row)
                              : String((row as Record<string, unknown>)[col.key] ?? "—")}
                          </td>
                        ))}
                        {showRowActions && (
                          <td className="px-3 py-3 text-right">
                            <RowActionMenu canApprove={Boolean((row as Record<string, unknown>).canApprove)} />
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>

        {effectiveState === "data" && sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((page - 1) * perPage + 1, sorted.length)}–{Math.min(page * perPage, sorted.length)} of{" "}
              {sorted.length} records
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                    page === p ? "bg-brand-600 text-white" : "border border-border hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const STOCK_STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  Available: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Near Expiry": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  Expired: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

export function StockStatusBadge({ status }: { status: string }) {
  const cfg = STOCK_STATUS_BADGE[status] ?? STOCK_STATUS_BADGE.Available;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}
