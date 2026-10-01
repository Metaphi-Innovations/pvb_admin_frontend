"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HrDensity } from "./HrListingToolbar";
import { HrEmptyState, HrLoadingRows, HrNoResultsState } from "./HrEmptyState";

export interface HrDataGridColumn<T> {
  id: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
}

export interface HrDataGridProps<T extends { id: number | string }> {
  rows: T[];
  columns: HrDataGridColumn<T>[];
  visibleColumnIds: string[];
  density?: HrDensity;
  loading?: boolean;
  /** True when the underlying store has zero records (before filters). */
  isEmptyStore?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onClearFilters?: () => void;
  selectedIds: Array<T["id"]>;
  onSelectedIdsChange: (ids: Array<T["id"]>) => void;
  getRowId?: (row: T) => T["id"];
  pageSize?: number;
}

type SortDir = "asc" | "desc";

function SortTh({
  label,
  active,
  dir,
  onSort,
  align,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onSort?: () => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      onClick={onSort}
      className={cn(
        "px-4 text-xs font-semibold whitespace-nowrap sticky top-0 z-[1] bg-muted/95 backdrop-blur-sm border-b border-border",
        onSort && "cursor-pointer select-none group",
        active && "bg-brand-50/80",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align !== "right" && align !== "center" && "text-left",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 py-2.5",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
        )}
      >
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {onSort &&
          (active ? (
            <ChevronDown
              className={cn(
                "w-3 h-3 text-brand-600 transition-transform",
                dir === "desc" && "rotate-180",
              )}
            />
          ) : (
            <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
          ))}
      </div>
    </th>
  );
}

export function HrDataGrid<T extends { id: number | string }>({
  rows,
  columns,
  visibleColumnIds,
  density = "compact",
  loading,
  isEmptyStore,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onClearFilters,
  selectedIds,
  onSelectedIdsChange,
  getRowId = (row) => row.id,
  pageSize = 10,
}: HrDataGridProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const visibleCols = useMemo(
    () => columns.filter((c) => visibleColumnIds.includes(c.id)),
    [columns, visibleColumnIds],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.id === sortKey);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selectedIds.includes(getRowId(r)));

  const toggleAllPage = () => {
    if (allPageSelected) {
      const pageIds = new Set(pageRows.map(getRowId));
      onSelectedIdsChange(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      const merged = new Set(selectedIds);
      pageRows.forEach((r) => merged.add(getRowId(r)));
      onSelectedIdsChange(Array.from(merged));
    }
  };

  const toggleRow = (id: T["id"]) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  };

  const handleSort = (colId: string) => {
    if (sortKey === colId) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(colId);
      setSortDir("asc");
    }
  };

  const cellPad = density === "compact" ? "py-2" : "py-3";
  const colCount = visibleCols.length + 2; // checkbox + actions spacer handled in columns

  return (
    <div className="bg-white border border-border rounded-[12px] shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="w-10 px-3 sticky top-0 z-[1] bg-muted/95 backdrop-blur-sm border-b border-border">
                <input
                  type="checkbox"
                  className="rounded accent-brand-600"
                  checked={allPageSelected}
                  onChange={toggleAllPage}
                  aria-label="Select all on page"
                  disabled={loading || pageRows.length === 0}
                />
              </th>
              {visibleCols.map((col) => (
                <SortTh
                  key={col.id}
                  label={col.label}
                  active={sortKey === col.id}
                  dir={sortDir}
                  onSort={col.sortable ? () => handleSort(col.id) : undefined}
                  align={col.align}
                  className={col.headerClassName}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <HrLoadingRows cols={colCount} />}
            {!loading && isEmptyStore && (
              <tr>
                <td colSpan={colCount}>
                  <HrEmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                  />
                </td>
              </tr>
            )}
            {!loading && !isEmptyStore && sorted.length === 0 && (
              <tr>
                <td colSpan={colCount}>
                  <HrNoResultsState
                    onClear={() => {
                      setPage(1);
                      onClearFilters?.();
                    }}
                  />
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((row) => {
                const id = getRowId(row);
                const checked = selectedIds.includes(id);
                return (
                  <tr
                    key={String(id)}
                    className={cn(
                      "border-b border-border/60 hover:bg-muted/20 transition-colors group",
                      checked && "bg-brand-50/40",
                    )}
                  >
                    <td className={cn("px-3", cellPad)}>
                      <input
                        type="checkbox"
                        className="rounded accent-brand-600"
                        checked={checked}
                        onChange={() => toggleRow(id)}
                        aria-label="Select row"
                      />
                    </td>
                    {visibleCols.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "px-4 text-xs",
                          cellPad,
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.className,
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && sorted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)}
            </span>{" "}
            of <span className="font-medium text-foreground">{sorted.length}</span> records
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 text-[11px] font-medium border border-border rounded-lg disabled:opacity-40 hover:bg-muted"
            >
              Prev
            </button>
            <span className="text-[11px] text-muted-foreground px-1">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 text-[11px] font-medium border border-border rounded-lg disabled:opacity-40 hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** CSV export helper for org masters */
export function exportOrgCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
