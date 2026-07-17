"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { WAREHOUSE_OPTIONS } from "../constants";
import type { StockPositionFilters } from "../types/stock-position";
import {
  applyCustomStockDates,
  buildStockDatePresetOptions,
  resolveStockDatePreset,
} from "../lib/stock-position-date-presets";
import { useFY } from "@/lib/fy-store";
import { masterToday } from "@/lib/masters/common";
import { SlidersHorizontal, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockPositionFiltersBarProps {
  filters: StockPositionFilters;
  onChange: (patch: Partial<StockPositionFilters>) => void;
  warehouses?: { value: string; label: string }[];
  products: { value: string; label: string }[];
  onApply?: () => void;
  onReset?: () => void;
  onExport: () => void;
  exportDisabled?: boolean;
  dateLabel?: string;
  today?: string;
}

const fieldClass =
  "h-9 text-sm rounded-lg border-border bg-white focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400";

export function StockPositionFiltersBar({
  filters,
  onChange,
  warehouses = WAREHOUSE_OPTIONS,
  products,
  onApply,
  onReset,
  onExport,
  exportDisabled,
  dateLabel,
  today = masterToday(),
}: StockPositionFiltersBarProps) {
  const { selectedFY, allFYs } = useFY();
  const isCustom = filters.datePreset === "custom";

  const periodOptions = useMemo(
    () => buildStockDatePresetOptions(selectedFY.id, today, allFYs),
    [selectedFY.id, today, allFYs],
  );

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];

  if (filters.warehouse !== "All") {
    activeFilters.push({
      key: "warehouse",
      label: filters.warehouse,
      clear: () => onChange({ warehouse: "All" }),
    });
  }
  if (filters.product) {
    const productLabel = products.find((p) => p.value === filters.product)?.label ?? filters.product;
    activeFilters.push({
      key: "product",
      label: productLabel,
      clear: () => onChange({ product: "" }),
    });
  }

  const handlePeriodChange = (presetId: string) => {
    const resolved = resolveStockDatePreset(presetId, today, selectedFY.id, allFYs);
    if (resolved) {
      onChange({ datePreset: presetId, ...resolved });
    } else {
      onChange({ datePreset: "custom" });
    }
  };

  const handleFromChange = (fromDate: string) => {
    onChange(applyCustomStockDates(fromDate, filters.toDate || fromDate));
  };

  const handleToChange = (toDate: string) => {
    onChange(applyCustomStockDates(filters.fromDate || toDate, toDate));
  };

  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden flex-shrink-0">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">Stock Position Filters</p>
            {dateLabel && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{dateLabel}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeFilters.length > 0 && (
            <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              {activeFilters.length} active
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onExport}
            disabled={exportDisabled}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          {onReset ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onReset}>
              Reset
            </Button>
          ) : null}
          {onApply ? (
            <Button type="button" size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={onApply}>
              Apply
            </Button>
          ) : null}
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[220px] flex-1 max-w-sm">
            <label className="text-xs font-medium text-foreground">Period</label>
            <AutocompleteSelect
              options={periodOptions}
              value={filters.datePreset}
              onChange={handlePeriodChange}
              placeholder="Today's Position"
              searchPlaceholder="Search period…"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">From Date</label>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFromChange(e.target.value)}
              disabled={!isCustom}
              className={cn(fieldClass, "w-[160px]", !isCustom && "bg-muted/30 text-muted-foreground")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">To Date</label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleToChange(e.target.value)}
              disabled={!isCustom}
              className={cn(fieldClass, "w-[160px]", !isCustom && "bg-muted/30 text-muted-foreground")}
            />
          </div>

          <div className="space-y-1 min-w-[160px] flex-1">
            <label className="text-xs font-medium text-foreground">Warehouse</label>
            <AutocompleteSelect
              options={[{ value: "All", label: "All Warehouses" }, ...warehouses]}
              value={filters.warehouse}
              onChange={(v) => onChange({ warehouse: v })}
              placeholder="All Warehouses"
              searchPlaceholder="Search…"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1 min-w-[160px] flex-1">
            <label className="text-xs font-medium text-foreground">Product</label>
            <AutocompleteSelect
              options={[{ value: "", label: "All Products" }, ...products]}
              value={filters.product}
              onChange={(v) => onChange({ product: v })}
              placeholder="All Products"
              searchPlaceholder="Search…"
              className={fieldClass}
            />
          </div>
        </div>

        {!isCustom && (
          <p className="text-[11px] text-muted-foreground">
            From / To dates are set by the selected period. Choose <span className="font-medium text-foreground">Custom Date</span> to pick your own range.
          </p>
        )}

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
              >
                {f.label}
                <button type="button" onClick={f.clear} className="hover:text-brand-900 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                if (onReset) onReset();
                else onChange({ warehouse: "All", product: "" });
              }}
              className={cn("text-xs text-brand-600 hover:underline font-medium ml-1")}
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
