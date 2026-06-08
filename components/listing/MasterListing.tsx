"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, SlidersHorizontal, Plus, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ColumnConfig, FilterState, SortState, MasterListingProps } from "./types";
import { FilterPopover } from "./FilterPopover";
import { DateRangeFilter } from "./DateRangeFilter";
import { ActionMenu } from "./ActionMenu";
import { Pagination } from "./Pagination";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

export function MasterListing<T = any>({
  columns,
  data,
  loading = false,
  totalRecords,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFilterChange,
  actions,
  rowKey = (row: any) => row.id || JSON.stringify(row),
  emptyMessage = "records",
  onAdd,
  addLabel = "Add New",
  searchPlaceholder = "Search...",
  currentFilters,
  currentSort,
}: MasterListingProps<T>) {
  // Sort State
  const [sortState, setSortState] = useState<SortState>({
    key: "",
    direction: "none",
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({});

  // Sync with currentProps if provided
  useEffect(() => {
    if (currentSort) setSortState(currentSort);
  }, [currentSort]);

  useEffect(() => {
    if (currentFilters) setFilters(currentFilters);
  }, [currentFilters]);

  // Handle Sort Click
  const handleSort = (key: string) => {
    let nextDirection: "asc" | "desc" | "none" = "asc";
    if (sortState.key === key) {
      if (sortState.direction === "asc") nextDirection = "desc";
      else if (sortState.direction === "desc") nextDirection = "none";
    }
    
    const nextState: SortState = {
      key: nextDirection === "none" ? "" : key,
      direction: nextDirection,
    };
    
    setSortState(nextState);
    onSortChange(nextState);
  };

  // Handle Individual Filter Change
  const handleFilterItemChange = (key: string, value: any) => {
    const nextFilters = { ...filters };
    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete nextFilters[key];
    } else {
      nextFilters[key] = value;
    }
    setFilters(nextFilters);
    onFilterChange(nextFilters);
  };

  // Clear All Filters
  const handleClearAllFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  // Check if any filter is active
  const isFiltered = Object.keys(filters).length > 0;

  // Filterable columns
  const filterableColumns = useMemo(() => {
    return columns.filter((col) => col.filterable);
  }, [columns]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar / Tool Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Global Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
          <Input
            value={(filters.search as string) || ""}
            onChange={(e) => handleFilterItemChange("search", e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs rounded-lg"
          />
        </div>

        {/* Clear Filters Button */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllFilters}
            className="h-8 text-xs text-brand-600 hover:text-brand-700 hover:bg-brand-50 gap-1.5 font-medium rounded-lg"
          >
            <X className="w-3.5 h-3.5" /> Clear All Filters
          </Button>
        )}

        {/* Right aligned actions (Add, Export) */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-border text-muted-foreground hover:bg-muted font-medium rounded-lg"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          {onAdd && (
            <Button
              size="sm"
              onClick={onAdd}
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5 font-medium rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {columns.map((col) => {
                  const isSorted = sortState.key === col.key;
                  const isSticky = col.sticky;
                  
                  return (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && handleSort(col.key)}
                      style={{ width: col.width }}
                      className={cn(
                        "px-4 py-2.5 text-xs font-semibold text-foreground select-none whitespace-nowrap",
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                        col.sortable && "cursor-pointer hover:bg-muted/60 transition-colors",
                        isSorted && "bg-brand-50/60 text-brand-700",
                        isSticky && "sticky right-0 bg-white z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1.5",
                          col.align === "center" && "justify-center",
                          col.align === "right" && "justify-end"
                        )}
                      >
                        <span className={cn(isSorted ? "text-brand-700 font-bold" : "text-foreground")}>
                          {col.header}
                        </span>
                        {col.sortable && (
                          <span className="flex-shrink-0">
                            {isSorted ? (
                              sortState.direction === "asc" ? (
                                <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                            )}
                          </span>
                        )}
                        {/* Filter Trigger Button */}
                        {col.filterable && (
                          <span 
                            className="flex-shrink-0 ml-1" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            {col.filterType === "date" ? (
                              <DateRangeFilter
                                header={col.header}
                                value={filters[col.key] as any}
                                onChange={(val) => handleFilterItemChange(col.key, val)}
                              />
                            ) : (
                              <FilterPopover
                                column={col}
                                value={filters[col.key]}
                                onChange={(val) => handleFilterItemChange(col.key, val)}
                              />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {actions && actions.length > 0 && (
                  <th className="w-16 px-4 py-2.5 text-center text-xs font-semibold text-foreground sticky right-0 bg-white z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingState cols={columns.length + (actions && actions.length > 0 ? 1 : 0)} />
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (actions && actions.length > 0 ? 1 : 0)}
                    className="p-0 border-none"
                  >
                    <EmptyState
                      isSearch={isFiltered}
                      onClearFilters={handleClearAllFilters}
                      emptyMessage={emptyMessage}
                      onAdd={onAdd}
                    />
                  </td>
                </tr>
              ) : (
                data.map((row, index) => {
                  const key = rowKey(row);
                  return (
                    <tr
                      key={key}
                      className="border-b border-border/60 hover:bg-[#fbfaf7] transition-colors group"
                    >
                      {columns.map((col) => {
                        const cellVal = (row as any)[col.key];
                        const isSticky = col.sticky;
                        
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "px-4 py-2.5 text-xs text-foreground",
                              col.align === "center" && "text-center",
                              col.align === "right" && "text-right",
                              isSticky && "sticky right-0 bg-white group-hover:bg-[#fbfaf7] z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border"
                            )}
                          >
                            {col.render ? (
                              col.render(cellVal, row, index)
                            ) : (
                              <span className={cn(col.key === "code" && "font-mono font-semibold text-brand-700")}>
                                {cellVal !== undefined && cellVal !== null ? String(cellVal) : "—"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {actions && actions.length > 0 && (
                        <td className="px-4 py-2.5 text-center sticky right-0 bg-white group-hover:bg-[#fbfaf7] z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border">
                          <ActionMenu actions={actions} row={row} />
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
        <Pagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
