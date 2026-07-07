"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, SlidersHorizontal, Plus, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ColumnConfig, FilterState, SortState, MasterListingProps } from "./types";
import { FilterPopover } from "./FilterPopover";
import { DateRangeFilter } from "./DateRangeFilter";
import { AuditFilterPopover } from "./AuditFilterPopover";
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
  onExport,
  searchPlaceholder = "Search...",
  hideSearch = false,
  currentFilters,
  currentSort,
  onOpenFilter,
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
        {!hideSearch && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <Input
              value={(filters.search as string) || ""}
              onChange={(e) => handleFilterItemChange("search", e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>
        )}

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
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-8 text-xs gap-1.5 border-border text-muted-foreground hover:bg-muted font-medium rounded-lg"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          )}
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
      <div className="master-listing-table-shell">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="master-listing-thead-row">
                {columns.map((col) => {
                  const isSorted = sortState.key === col.key;
                  const isSticky = col.sticky;
                  
                  return (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && handleSort(col.key)}
                      style={{ width: col.width }}
                      className={cn(
                        "px-4 py-2.5 text-xs font-semibold text-foreground select-none whitespace-nowrap master-listing-th",
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                        col.sortable && "cursor-pointer hover:bg-muted/60 transition-colors",
                        isSorted && "master-listing-th-sorted",
                        isSticky && (isSorted ? "master-listing-th-sticky-sorted" : "master-listing-th-sticky"),
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
                            ) : col.filterType === "audit" ? (
                              <AuditFilterPopover
                                header={col.header}
                                value={filters[col.key] as any}
                                onChange={(val) => handleFilterItemChange(col.key, val)}
                                userOptions={col.auditUserOptions}
                              />
                            ) : (
                              <FilterPopover
                                column={col}
                                value={filters[col.key]}
                                onChange={(val) => handleFilterItemChange(col.key, val)}
                                onOpen={onOpenFilter ? () => onOpenFilter(col.key) : undefined}
                              />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {actions && actions.length > 0 && (
                  <th
                    aria-label="Actions"
                    className="master-listing-th-sticky w-11 min-w-[2.75rem] max-w-[2.75rem] px-2 py-2.5 text-center text-xs font-semibold text-foreground"
                  >
                    <span className="sr-only">Actions</span>
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
                      className="master-listing-row group"
                    >
                      {columns.map((col) => {
                        const cellVal = (row as any)[col.key];
                        const isSticky = col.sticky;
                        
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "px-4 py-2.5 text-xs text-foreground whitespace-nowrap",
                              col.align === "center" && "text-center",
                              col.align === "right" && "text-right",
                              isSticky && "master-listing-td-sticky",
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
                        <td className="master-listing-td-sticky w-11 min-w-[2.75rem] max-w-[2.75rem] px-2 py-2.5 text-center">
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
