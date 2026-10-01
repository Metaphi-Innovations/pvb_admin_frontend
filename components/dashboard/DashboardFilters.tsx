"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DashboardFilterOptions,
  DashboardFiltersState,
} from "@/components/dashboard/mock-data";

interface DashboardFilterBarProps {
  options: DashboardFilterOptions;
  value: DashboardFiltersState;
  onChange: (next: DashboardFiltersState) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

const controlClass = cn(
  "h-8 px-2 text-xs rounded-lg border border-border bg-background",
  "focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400",
);

/** Global filters only: Warehouse + Refresh */
export function DashboardFilterBar({
  options,
  value,
  onChange,
  onRefresh,
  refreshing,
}: DashboardFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white shadow-sm px-3 py-2">
      <label className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Warehouse</span>
        <select
          value={value.warehouseId}
          onChange={(e) => {
            const warehouseId = e.target.value;
            onChange({ warehouseId, warehouse: warehouseId });
          }}
          className={cn(controlClass, "min-w-[9rem]")}
          aria-label="Warehouse"
        >
          {options.warehouses.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className={cn(
          "ml-auto h-8 px-2.5 text-xs font-medium rounded-lg border border-border inline-flex items-center gap-1.5",
          "text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60",
        )}
      >
        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
        Refresh
      </button>
    </div>
  );
}
