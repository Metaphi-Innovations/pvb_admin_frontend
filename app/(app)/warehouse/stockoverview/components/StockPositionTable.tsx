"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Search, Table2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockDateMode, StockLineStatus, StockPositionLine } from "../types/stock-position";
import { filterStockPositionLinesForSearch } from "../lib/stock-position-columns";
import { formatMoney } from "@/lib/accounts/money-format";
import { FilterPopover } from "@/components/listing/FilterPopover";
import type { ColumnConfig, FilterValue } from "@/components/listing/types";

const STATUS_CFG: Record<StockLineStatus, { bg: string; text: string; dot: string }> = {
  Available: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Hold: { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
  "Near Expiry": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  Expired: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
};

function StatusPill({ status }: { status: StockLineStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1 h-1 rounded-full flex-shrink-0", cfg.dot)} />
      {status}
    </span>
  );
}

const PAGE_SIZES = [25, 50, 100] as const;

const STICKY_TH =
  "sticky top-0 z-20 bg-white px-3 py-1.5 text-xs font-semibold text-foreground whitespace-nowrap border-b border-border shadow-[0_1px_0_0_hsl(var(--border))]";

type ColKey =
  | "productCode"
  | "productName"
  | "hsn"
  | "scientificName"
  | "category"
  | "batchNumber"
  | "warehouse"
  | "status";

function applyColumnFilters(lines: StockPositionLine[], colFilters: Partial<Record<ColKey, FilterValue>>) {
  return lines.filter((row) => {
    for (const [key, val] of Object.entries(colFilters) as [ColKey, FilterValue][]) {
      if (val === undefined) continue;
      const cell = String(row[key as keyof StockPositionLine] ?? "");
      if (typeof val === "string") {
        if (!cell.toLowerCase().includes(val.toLowerCase())) return false;
      } else if (Array.isArray(val)) {
        if (val.length > 0 && !val.includes(cell)) return false;
      }
    }
    return true;
  });
}

function FilterTh({
  label,
  align = "left",
  column,
  value,
  onChange,
  className,
}: {
  label: string;
  align?: "left" | "right";
  column?: ColumnConfig;
  value?: FilterValue;
  onChange?: (v: FilterValue | undefined) => void;
  className?: string;
}) {
  return (
    <th className={cn(STICKY_TH, align === "right" ? "text-right" : "text-left", className)}>
      <div className={cn("flex items-center gap-0.5", align === "right" && "justify-end")}>
        <span>{label}</span>
        {column && onChange && (
          <FilterPopover column={column} value={value} onChange={onChange} />
        )}
      </div>
    </th>
  );
}

export function StockPositionTable({
  lines,
  className,
  dateMode = "single",
  onFilteredLinesChange,
}: {
  lines: StockPositionLine[];
  className?: string;
  dateMode?: StockDateMode;
  /** All rows matching table search + column filters (for export). */
  onFilteredLinesChange?: (rows: StockPositionLine[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [colFilters, setColFilters] = useState<Partial<Record<ColKey, FilterValue>>>({});

  const filterOptions = useMemo(() => {
    const categories = [...new Set(lines.map((l) => l.category))].sort();
    const warehouses = [...new Set(lines.map((l) => l.warehouse))].sort();
    const statuses = [...new Set(lines.map((l) => l.status))].sort();
    return { categories, warehouses, statuses };
  }, [lines]);

  const filterColumns: Partial<Record<ColKey, ColumnConfig>> = useMemo(
    () => ({
      productCode: { key: "productCode", header: "Product Code", filterable: true, filterType: "text" },
      productName: { key: "productName", header: "Product Name", filterable: true, filterType: "text" },
      hsn: { key: "hsn", header: "HSN", filterable: true, filterType: "text" },
      scientificName: { key: "scientificName", header: "Scientific Name", filterable: true, filterType: "text" },
      category: {
        key: "category",
        header: "Category",
        filterable: true,
        filterType: "dropdown",
        filterOptions: filterOptions.categories.map((c) => ({ label: c, value: c })),
      },
      batchNumber: { key: "batchNumber", header: "Batch No.", filterable: true, filterType: "text" },
      warehouse: {
        key: "warehouse",
        header: "Warehouse",
        filterable: true,
        filterType: "dropdown",
        filterOptions: filterOptions.warehouses.map((w) => ({ label: w, value: w })),
      },
      status: {
        key: "status",
        header: "Status",
        filterable: true,
        filterType: "dropdown",
        filterOptions: filterOptions.statuses.map((s) => ({ label: s, value: s })),
      },
    }),
    [filterOptions],
  );

  const activeColFilterCount = Object.values(colFilters).filter(
    (v) => (typeof v === "string" && v.trim()) || (Array.isArray(v) && v.length > 0),
  ).length;

  const filtered = useMemo(() => {
    let result = applyColumnFilters(lines, colFilters);
    return filterStockPositionLinesForSearch(result, search);
  }, [lines, colFilters, search]);

  useEffect(() => {
    onFilteredLinesChange?.(filtered);
  }, [filtered, onFilteredLinesChange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const setColFilter = (key: ColKey, val: FilterValue | undefined) => {
    setColFilters((prev) => {
      const next = { ...prev };
      if (val === undefined || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
        delete next[key];
      } else {
        next[key] = val;
      }
      return next;
    });
    setPage(1);
  };

  const clearColFilters = () => {
    setColFilters({});
    setPage(1);
  };

  const tdClass = "px-3 py-1.5 text-xs whitespace-nowrap";
  const inColLabel = dateMode === "single" ? "Day In" : "Period In";
  const outColLabel = dateMode === "single" ? "Day Out" : "Period Out";

  return (
    <div className={cn("border border-border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col min-h-[480px]", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center flex-shrink-0">
            <Table2 className="w-3 h-3 text-navy-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">Stock Lines</p>
            <p className="text-[10px] text-muted-foreground">
              {paged.length} of {filtered.length} lines
              {activeColFilterCount > 0 && (
                <button type="button" onClick={clearColFilters} className="ml-2 text-brand-600 hover:underline font-medium">
                  Clear column filters ({activeColFilterCount})
                </button>
              )}
            </p>
          </div>
        </div>
        <div className="relative w-full sm:max-w-[220px] sm:flex-shrink-0">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Quick search…"
            className="w-full h-8 pl-7 pr-7 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto isolate">
        <table className="w-full min-w-[1400px] border-collapse">
          <thead>
            <tr>
              <FilterTh
                label="Product Code"
                column={filterColumns.productCode}
                value={colFilters.productCode}
                onChange={(v) => setColFilter("productCode", v)}
              />
              <FilterTh
                label="Product Name"
                column={filterColumns.productName}
                value={colFilters.productName}
                onChange={(v) => setColFilter("productName", v)}
                className="min-w-[110px]"
              />
              <FilterTh
                label="HSN"
                column={filterColumns.hsn}
                value={colFilters.hsn}
                onChange={(v) => setColFilter("hsn", v)}
              />
              <FilterTh
                label="Scientific Name"
                column={filterColumns.scientificName}
                value={colFilters.scientificName}
                onChange={(v) => setColFilter("scientificName", v)}
                className="min-w-[100px]"
              />
              <FilterTh
                label="Category"
                column={filterColumns.category}
                value={colFilters.category}
                onChange={(v) => setColFilter("category", v)}
              />
              <th className={cn(STICKY_TH, "text-left w-16")}>Pack Size</th>
              <th className={cn(STICKY_TH, "text-right w-20")}>Opening Qty</th>
              <th className={cn(STICKY_TH, "text-right w-20 text-emerald-700")}>{inColLabel}</th>
              <th className={cn(STICKY_TH, "text-right w-20 text-red-700")}>{outColLabel}</th>
              <th className={cn(STICKY_TH, "text-right w-20")}>Closing Qty</th>
              <th className={cn(STICKY_TH, "text-right w-20")}>Available</th>
              <FilterTh
                label="Batch No."
                column={filterColumns.batchNumber}
                value={colFilters.batchNumber}
                onChange={(v) => setColFilter("batchNumber", v)}
              />
              <th className={cn(STICKY_TH, "text-left w-24")}>Expiry</th>
              <FilterTh
                label="Warehouse"
                column={filterColumns.warehouse}
                value={colFilters.warehouse}
                onChange={(v) => setColFilter("warehouse", v)}
                className="min-w-[100px]"
              />
              <th className={cn(STICKY_TH, "text-right w-16")}>CP</th>
              <th className={cn(STICKY_TH, "text-right w-24")}>Valuation</th>
              <FilterTh
                label="Status"
                column={filterColumns.status}
                value={colFilters.status}
                onChange={(v) => setColFilter("status", v)}
              />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              null
            ) : (
              paged.map((row) => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-muted/25 transition-colors">
                  <td className={cn(tdClass, "font-mono font-semibold text-brand-700")}>{row.productCode}</td>
                  <td className={cn(tdClass, "font-medium text-foreground")}>{row.productName}</td>
                  <td className={cn(tdClass, "font-mono text-muted-foreground")}>{row.hsn}</td>
                  <td className={cn(tdClass, "text-muted-foreground max-w-[120px] truncate")}>{row.scientificName}</td>
                  <td className={cn(tdClass, "text-foreground")}>{row.category}</td>
                  <td className={cn(tdClass, "text-foreground")}>{row.packSize}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{row.openingQty.toLocaleString("en-IN")}</td>
                  <td className={cn(tdClass, "text-right tabular-nums text-emerald-700 font-medium")}>
                    {row.dayIn > 0 ? row.dayIn.toLocaleString("en-IN") : "—"}
                  </td>
                  <td className={cn(tdClass, "text-right tabular-nums text-red-700 font-medium")}>
                    {row.dayOut > 0 ? row.dayOut.toLocaleString("en-IN") : "—"}
                  </td>
                  <td className={cn(tdClass, "text-right tabular-nums font-semibold")}>
                    {row.closingQty.toLocaleString("en-IN")}
                  </td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{row.availableQty.toLocaleString("en-IN")}</td>
                  <td className={cn(tdClass, "font-mono font-semibold text-brand-700")}>{row.batchNumber}</td>
                  <td className={cn(tdClass, "text-muted-foreground")}>{row.expiryDate}</td>
                  <td className={cn(tdClass, "text-foreground")}>{row.warehouse}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{row.cp.toLocaleString("en-IN")}</td>
                  <td className={cn(tdClass, "text-right tabular-nums font-medium")}>{formatMoney(row.stockValuation)}</td>
                  <td className={tdClass}>
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 border-t border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground">Rows</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden bg-white">
            {PAGE_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setPageSize(n);
                  setPage(1);
                }}
                className={cn(
                  "h-7 px-2.5 text-[10px] font-medium transition-colors border-r border-border last:border-r-0",
                  pageSize === n ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-7 px-2.5 text-[10px] font-medium border border-border rounded-md bg-white disabled:opacity-40 hover:bg-muted/50"
          >
            Prev
          </button>
          <span className="text-[10px] text-muted-foreground px-1">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-7 px-2.5 text-[10px] font-medium border border-border rounded-md bg-white disabled:opacity-40 hover:bg-muted/50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
