"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { masterToday } from "@/lib/masters/common";
import { DEFAULT_STOCK_POSITION_FILTERS, type StockPositionFilters, type StockPositionLine } from "../types/stock-position";
import { computeStockPosition, getStockFilterOptions } from "../lib/stock-position-data";
import { exportStockPositionCsv } from "../lib/stock-position-export";
import { StockPositionFiltersBar } from "./StockPositionFiltersBar";
import { StockPositionKpiRow } from "./StockPositionKpiRow";
import { StockPositionTable } from "./StockPositionTable";

const EMPTY_KPIS = {
  openingStockQty: 0,
  dayInQty: 0,
  dayOutQty: 0,
  closingStockQty: 0,
  closingStockValue: 0,
};

export function DailyLogsTab() {
  const [today, setToday] = useState("");
  const [filters, setFilters] = useState<StockPositionFilters>(DEFAULT_STOCK_POSITION_FILTERS);

  useEffect(() => {
    const t = masterToday();
    setToday(t);
    setFilters((prev) => ({
      ...prev,
      datePreset: "today",
      asOnDate: t,
      fromDate: t,
      toDate: t,
    }));
  }, []);

  const filterOptions = useMemo(
    () => (today ? getStockFilterOptions(today) : { products: [] }),
    [today],
  );

  const { lines, kpis, dateLabel } = useMemo(() => {
    if (!filters.asOnDate && filters.dateMode === "single") {
      return { lines: [], kpis: EMPTY_KPIS, dateLabel: "" };
    }
    if (filters.dateMode === "range" && !filters.fromDate && !filters.toDate) {
      return { lines: [], kpis: EMPTY_KPIS, dateLabel: "" };
    }
    return computeStockPosition(filters, today || masterToday());
  }, [filters, today]);

  const handleFilterChange = (patch: Partial<StockPositionFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const [exportLines, setExportLines] = useState<StockPositionLine[]>([]);

  const handleExport = useCallback(() => {
    const rows = exportLines.length > 0 ? exportLines : lines;
    if (rows.length === 0) return;
    exportStockPositionCsv(rows, filters, today || masterToday());
  }, [exportLines, lines, filters, today]);

  const canExport =
    (exportLines.length > 0 || lines.length > 0) &&
    (filters.dateMode === "single" ? Boolean(filters.asOnDate) : Boolean(filters.fromDate && filters.toDate));

  return (
    <div className="flex flex-col gap-2.5 min-h-[calc(100vh-220px)]">
      <StockPositionFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        products={filterOptions.products}
        onExport={handleExport}
        exportDisabled={!canExport}
        dateLabel={dateLabel}
        today={today}
      />

      <StockPositionKpiRow kpis={kpis} dateMode={filters.dateMode} />

      <div className="flex-1 min-h-0">
        <StockPositionTable
          lines={lines}
          className="h-full"
          dateMode={filters.dateMode}
          onFilteredLinesChange={setExportLines}
        />
      </div>
    </div>
  );
}
