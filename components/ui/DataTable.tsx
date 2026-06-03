"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search, Filter, Download, Plus, ChevronUp, ChevronDown,
  ChevronsUpDown, MoreHorizontal, ChevronLeft, ChevronRight,
  Columns3, X, Check, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptySearch, EmptyModuleState } from "@/components/ui/EmptyState";
import { SkeletonRow } from "@/components/ui/Loaders";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Column<T = Record<string, unknown>> {
  key:      string;
  header:   string;
  sortable?: boolean;
  hideable?: boolean;
  width?:   string;
  align?:   "left" | "center" | "right";
  render?:  (value: unknown, row: T, idx: number) => React.ReactNode;
}

interface ActionItem {
  label:     string;
  icon?:     LucideIcon;
  onClick:   (row: unknown) => void;
  variant?:  "default" | "destructive";
  disabled?: (row: unknown) => boolean;
}

interface DataTableProps<T = Record<string, unknown>> {
  title?:         string;
  description?:   string;
  columns:        Column<T>[];
  data:           T[];
  loading?:       boolean;
  totalCount?:    number;
  page?:          number;
  pageSize?:      number;
  onPageChange?:  (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  searchValue?:   string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  onAdd?:         () => void;
  addLabel?:      string;
  actions?:       ActionItem[];
  filterSlot?:    React.ReactNode;
  bulkActions?:   { label: string; icon?: LucideIcon; onClick: (rows: T[]) => void }[];
  rowKey?:        (row: T) => string;
  onRowClick?:    (row: T) => void;
  emptyModule?:   string;
  className?:     string;
}

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable<T = Record<string, unknown>>({
  title, description, columns, data, loading = false,
  totalCount, page = 1, pageSize = 20,
  onPageChange, onPageSizeChange,
  searchValue = "", onSearchChange,
  searchPlaceholder = "Search…",
  onAdd, addLabel = "Add New",
  actions, filterSlot, bulkActions,
  rowKey = (r: T) => JSON.stringify(r),
  onRowClick, emptyModule, className,
}: DataTableProps<T>) {
  const [sortKey,     setSortKey]     = useState<string | null>(null);
  const [sortDir,     setSortDir]     = useState<"asc" | "desc">("asc");
  const [hiddenCols,  setHiddenCols]  = useState<Set<string>>(new Set());
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  const visibleColumns = columns.filter(c => !hiddenCols.has(c.key));

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleHidden = (key: string) => {
    setHiddenCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allSelected  = data.length > 0 && data.every(r => selected.has(rowKey(r)));
  const someSelected = data.some(r => selected.has(rowKey(r)));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(data.map(rowKey)));
  };

  const toggleRow = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectedRows = data.filter(r => selected.has(rowKey(r)));
  const totalPages   = Math.ceil((totalCount ?? data.length) / pageSize);
  const startItem    = (page - 1) * pageSize + 1;
  const endItem      = Math.min(page * pageSize, totalCount ?? data.length);

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-brand-600" />
      : <ChevronDown className="w-3 h-3 text-brand-600" />;
  };

  return (
    <div className={cn("page-shell overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-8 text-xs rounded-input"
          />
          {searchValue && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => onSearchChange?.("")}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Filter slot */}
        {filterSlot}

        {/* Bulk actions */}
        {bulkActions && selected.size > 0 && (
          <div className="flex items-center gap-2 ml-1">
            <Badge variant="secondary" className="text-xs">
              {selected.size} selected
            </Badge>
            {bulkActions.map((ba, i) => (
              <Button
                key={i}
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => ba.onClick(selectedRows)}
              >
                {ba.icon && <ba.icon className="w-3 h-3 mr-1" />}
                {ba.label}
              </Button>
            ))}
          </div>
        )}

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Columns3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {columns.filter(c => c.hideable !== false).map(col => (
                <div
                  key={col.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleHidden(col.key)}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center",
                    !hiddenCols.has(col.key) ? "bg-brand-500 border-brand-500" : "border-border",
                  )}>
                    {!hiddenCols.has(col.key) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-xs">{col.header}</span>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Add */}
          {onAdd && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
              onClick={onAdd}
            >
              <Plus className="w-3.5 h-3.5" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--border))]">
            <tr className="border-b border-border/80">
              {bulkActions && (
                <th className="w-10 px-4 py-2.5">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    className="border-border"
                    aria-label="Select all"
                  />
                </th>
              )}
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
              {actions && (
                <th className="w-12 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} cols={visibleColumns.length + (actions ? 1 : 0)} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (actions ? 1 : 0) + (bulkActions ? 1 : 0)}
                  className="py-0"
                >
                  {searchValue
                    ? <EmptySearch onClear={() => onSearchChange?.("")} />
                    : <EmptyModuleState module={emptyModule ?? "records"} onAdd={onAdd} />
                  }
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const key      = rowKey(row);
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b border-border/50 transition-colors duration-100",
                      isSelected ? "bg-brand-50/60" : "hover:bg-muted/30",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {bulkActions && (
                      <td
                        className="w-10 px-4 py-3"
                        onClick={e => { e.stopPropagation(); toggleRow(key); }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(key)}
                          className="border-border"
                        />
                      </td>
                    )}
                    {visibleColumns.map(col => {
                      const val = (row as Record<string, unknown>)[col.key];
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-3 text-table text-foreground",
                            col.align === "center" && "text-center",
                            col.align === "right" && "text-right",
                          )}
                        >
                          {col.render ? col.render(val, row, idx) : String(val ?? "—")}
                        </td>
                      );
                    })}
                    {actions && (
                      <td
                        className="px-4 py-3 text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {actions.map((action, ai) => (
                              <React.Fragment key={ai}>
                                {ai > 0 && action.variant === "destructive" && (
                                  <DropdownMenuSeparator />
                                )}
                                <DropdownMenuItem
                                  className={cn(
                                    "text-xs gap-2 cursor-pointer",
                                    action.variant === "destructive" &&
                                      "text-red-500 focus:text-red-500 focus:bg-red-50",
                                  )}
                                  disabled={action.disabled?.(row)}
                                  onClick={() => action.onClick(row)}
                                >
                                  {action.icon && <action.icon className="w-3.5 h-3.5" />}
                                  {action.label}
                                </DropdownMenuItem>
                              </React.Fragment>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      {!loading && data.length > 0 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-helper text-muted-foreground whitespace-nowrap">
              Showing{" "}
              <span className="font-medium text-foreground">{startItem}–{endItem}</span>
              {" "}of{" "}
              <span className="font-medium text-foreground">{totalCount ?? data.length}</span>
              {" "}results
            </p>
            <Select
              value={String(pageSize)}
              onValueChange={v => onPageSizeChange?.(Number(v))}
            >
              <SelectTrigger className="h-7 w-16 text-xs rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-7 w-7 text-xs",
                    p === page && "bg-brand-500 hover:bg-brand-600 text-white border-brand-500",
                  )}
                  onClick={() => onPageChange?.(p)}
                >
                  {p}
                </Button>
              );
            })}
            {totalPages > 5 && (
              <span className="text-xs text-muted-foreground px-1">…</span>
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
