"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  AccountsColumnFilterConfig,
  AccountsColumnFilters,
  AccountsColumnFilterType,
} from "@/lib/accounts/column-filter-types";
import {
  applyAccountsColumnFilters,
  applyAccountsTopN,
  collectUniqueColumnValues,
  countActiveColumnFilters,
  sortAccountsRows,
} from "@/lib/accounts/column-filter-engine";

export interface UseAccountsColumnFiltersOptions<T> {
  rows: T[];
  getCellValue: (row: T, columnKey: string) => unknown;
  columnConfig?: AccountsColumnFilterConfig;
  defaultSortKey?: string | null;
  defaultSortDir?: "asc" | "desc";
  /** Value-only column filters without operator dropdowns. */
  simpleColumnFilters?: boolean;
}

export function useAccountsColumnFilters<T>({
  rows,
  getCellValue,
  columnConfig = {},
  defaultSortKey = null,
  defaultSortDir = "desc",
  simpleColumnFilters = true,
}: UseAccountsColumnFiltersOptions<T>) {
  const [columnFilters, setColumnFilters] = useState<AccountsColumnFilters>({});
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const setColumnFilter = useCallback((key: string, value: AccountsColumnFilters[string]) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (value == null) delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  const clearAllColumnFilters = useCallback(() => setColumnFilters({}), []);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const removeSort = useCallback(() => {
    setSortKey(null);
    setSortDir(defaultSortDir);
  }, [defaultSortDir]);

  const filteredRows = useMemo(() => {
    let result = applyAccountsColumnFilters(rows, columnFilters, getCellValue);

    for (const [key, filter] of Object.entries(columnFilters)) {
      if (filter?.numberOperator === "top10") {
        result = applyAccountsTopN(result, 10, key, getCellValue, true);
      }
    }

    return sortAccountsRows(result, sortKey, sortDir, getCellValue);
  }, [rows, columnFilters, sortKey, sortDir, getCellValue]);

  const activeFilterCount = useMemo(() => countActiveColumnFilters(columnFilters), [columnFilters]);

  const getUniqueValues = useCallback(
    (columnKey: string) => collectUniqueColumnValues(rows, columnKey, getCellValue),
    [rows, getCellValue],
  );

  const resolveFilterType = useCallback(
    (columnKey: string, override?: AccountsColumnFilterType): AccountsColumnFilterType =>
      override ?? columnConfig[columnKey]?.type ?? "text",
    [columnConfig],
  );

  const statusOptionsFor = useCallback(
    (columnKey: string) => columnConfig[columnKey]?.options ?? [],
    [columnConfig],
  );

  const resolveSimpleFilter = useCallback(
    (columnKey: string, override?: boolean): boolean => {
      if (override != null) return override;
      if (columnConfig[columnKey]?.advancedFilters) return false;
      return simpleColumnFilters;
    },
    [columnConfig, simpleColumnFilters],
  );

  const headerProps = useCallback(
    (
      columnKey: string,
      label: string,
      opts?: {
        filterType?: AccountsColumnFilterType;
        align?: "left" | "right" | "center";
        filterable?: boolean;
        sortable?: boolean;
        statusOptions?: string[];
        simpleFilter?: boolean;
      },
    ) => ({
      label,
      colKey: columnKey,
      align: opts?.align ?? "left",
      sortable: opts?.sortable !== false,
      sortKey,
      sortDir,
      onSort: handleSort,
      onRemoveSort: removeSort,
      filterable: opts?.filterable !== false,
      filterType: resolveFilterType(columnKey, opts?.filterType),
      filterValue: columnFilters[columnKey],
      onFilterChange: (v: AccountsColumnFilters[string]) => setColumnFilter(columnKey, v),
      uniqueValues: getUniqueValues(columnKey),
      statusOptions: opts?.statusOptions ?? statusOptionsFor(columnKey),
      simpleFilter: resolveSimpleFilter(columnKey, opts?.simpleFilter),
    }),
    [
      sortKey,
      sortDir,
      handleSort,
      removeSort,
      columnFilters,
      setColumnFilter,
      getUniqueValues,
      resolveFilterType,
      statusOptionsFor,
      resolveSimpleFilter,
    ],
  );

  return {
    columnFilters,
    setColumnFilter,
    clearAllColumnFilters,
    activeFilterCount,
    sortKey: sortKey ?? "",
    sortDir,
    handleSort,
    removeSort,
    filteredRows,
    getUniqueValues,
    resolveFilterType,
    statusOptionsFor: (columnKey: string) => columnConfig[columnKey]?.options ?? [],
    simpleColumnFilters,
    headerProps,
  };
}