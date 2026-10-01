"use client";

import React from "react";
import {
  Search,
  SlidersHorizontal,
  Download,
  Columns3,
  Rows3,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { HrIconActionButton } from "./HrIconActionButton";

export type HrDensity = "compact" | "comfortable";
export type HrStatusFilter = "all" | "active" | "inactive";

export interface HrColumnOption {
  id: string;
  label: string;
}

export function HrListingToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  statusFilter,
  onStatusFilterChange,
  density,
  onDensityChange,
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  onExport,
  onRefresh,
  selectedCount = 0,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  statusFilter: HrStatusFilter;
  onStatusFilterChange: (v: HrStatusFilter) => void;
  density: HrDensity;
  onDensityChange: (v: HrDensity) => void;
  columns: HrColumnOption[];
  visibleColumns: string[];
  onVisibleColumnsChange: (ids: string[]) => void;
  onExport: () => void;
  onRefresh: () => void;
  selectedCount?: number;
}) {
  const filterActive = statusFilter !== "all";

  const toggleColumn = (id: string) => {
    if (visibleColumns.includes(id)) {
      if (visibleColumns.length <= 1) return;
      onVisibleColumnsChange(visibleColumns.filter((c) => c !== id));
    } else {
      onVisibleColumnsChange([...visibleColumns, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-[10px] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-2.5 text-xs border rounded-[10px] inline-flex items-center gap-1.5 font-medium transition-colors",
                filterActive
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {filterActive && (
                <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                  1
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-0">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Status</p>
            </div>
            <div className="px-3 py-2.5 space-y-1.5">
              {(
                [
                  ["all", "All"],
                  ["active", "Active"],
                  ["inactive", "Inactive"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hr-org-status-filter"
                    className="accent-brand-600"
                    checked={statusFilter === value}
                    onChange={() => onStatusFilterChange(value)}
                  />
                  <span className="text-xs text-foreground">{label}</span>
                </label>
              ))}
            </div>
            {filterActive && (
              <div className="px-3 py-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => onStatusFilterChange("all")}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-8 px-2.5 text-xs border border-border rounded-[10px] inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted"
            >
              <Columns3 className="w-3.5 h-3.5" />
              Columns
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-0">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Visible columns</p>
            </div>
            <div className="px-3 py-2.5 space-y-1.5 max-h-56 overflow-y-auto">
              {columns.map((col) => (
                <label key={col.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded accent-brand-600"
                    checked={visibleColumns.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                  />
                  <span className="text-xs text-foreground">{col.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() =>
            onDensityChange(density === "compact" ? "comfortable" : "compact")
          }
          className="h-8 px-2.5 text-xs border border-border rounded-[10px] inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted"
          title="Toggle row density"
        >
          <Rows3 className="w-3.5 h-3.5" />
          {density === "compact" ? "Compact" : "Comfortable"}
        </button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs rounded-[10px] gap-1.5"
          onClick={onExport}
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>

        <HrIconActionButton label="Refresh" onClick={onRefresh} className="border-border">
          <RefreshCw />
        </HrIconActionButton>
      </div>

      {(filterActive || search || selectedCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              Search: {search}
              <button type="button" onClick={() => onSearchChange("")} aria-label="Clear search">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterActive && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium capitalize">
              {statusFilter}
              <button
                type="button"
                onClick={() => onStatusFilterChange("all")}
                aria-label="Clear status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {selectedCount} selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}
