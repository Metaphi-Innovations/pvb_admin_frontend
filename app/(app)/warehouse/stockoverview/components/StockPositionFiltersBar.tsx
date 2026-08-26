"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import type { StockPositionFilters } from "../types/stock-position";
import {
  applyCustomStockDates,
  buildStockDatePresetOptions,
  resolveStockDatePreset,
} from "../lib/stock-position-date-presets";
import { useFY } from "@/lib/fy-store";
import { masterToday } from "@/lib/masters/common";
import { SlidersHorizontal, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockPositionFiltersBarProps {
  filters: StockPositionFilters;
  onChange: (patch: Partial<StockPositionFilters>) => void;
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
    () => buildStockDatePresetOptions(selectedFY, today, allFYs),
    [selectedFY, today, allFYs],
  );

  const handlePeriodChange = (presetId: string) => {
    const resolved = resolveStockDatePreset(presetId, today, selectedFY, allFYs);
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
        </div>

        {!isCustom && (
          <p className="text-[11px] text-muted-foreground">
            From / To dates are set by the selected period. Choose <span className="font-medium text-foreground">Custom Date</span> to pick your own range.
          </p>
        )}
      </div>
    </div>
  );
}
