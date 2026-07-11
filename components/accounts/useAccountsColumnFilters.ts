"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  AccountsColumnFilterConfig,
  AccountsColumnFilters,
  AccountsColumnFilterType,
  ColumnValueOption,
} from "@/lib/accounts/column-filter-types";
import {
  applyAccountsColumnFilters,
  applyAccountsTopN,
  collectColumnValueCounts,
  countActiveColumnFilters,
  sortAccountsRows,
} from "@/lib/accounts/column-filter-engine";

export interface UseAccountsColumnFiltersOptions<T> {
  rows: T[];
  getCellValue: (row: T, columnKey: string) => unknown;
  /** Values shown in Excel-style filter lists and used for text/status/select matching. Defaults to getCellValue. */
  getFilterValue?: (row: T, columnKey: string) => unknown;
  columnConfig?: AccountsColumnFilterConfig;
  defaultSortKey?: string | null;
  defaultSortDir?: "asc" | "desc";
}

export function useAccountsColumnFilters<T>({
  rows,
  getCellValue,
  getFilterValue,
  columnConfig = {},
  defaultSortKey = null,
  defaultSortDir = "desc",
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
    let result = applyAccountsColumnFilters(rows, columnFilters, getCellValue, getFilterValue);

    for (const [key, filter] of Object.entries(columnFilters)) {
      if (filter?.numberOperator === "top10") {
        result = applyAccountsTopN(result, 10, key, getCellValue, true);
      }
    }

    return sortAccountsRows(result, sortKey, sortDir, getCellValue);
  }, [rows, columnFilters, sortKey, sortDir, getCellValue, getFilterValue]);

  const activeFilterCount = useMemo(() => countActiveColumnFilters(columnFilters), [columnFilters]);

  const getValueCounts = useCallback(
    (columnKey: string): ColumnValueOption[] =>
      collectColumnValueCounts(rows, columnKey, getCellValue, 200, getFilterValue),
    [rows, getCellValue, getFilterValue],
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

  const optionLabelsFor = useCallback(
    (columnKey: string) => columnConfig[columnKey]?.optionLabels ?? {},
    [columnConfig],
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
      valueOptions: getValueCounts(columnKey),
      statusOptions: opts?.statusOptions ?? statusOptionsFor(columnKey),
      optionLabels: optionLabelsFor(columnKey),
    }),
    [
      sortKey,
      sortDir,
      handleSort,
      removeSort,
      columnFilters,
      setColumnFilter,
      getValueCounts,
      resolveFilterType,
      statusOptionsFor,
      optionLabelsFor,
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
    getValueCounts,
    resolveFilterType,
    statusOptionsFor: (columnKey: string) => columnConfig[columnKey]?.options ?? [],
    headerProps,
  };
}
