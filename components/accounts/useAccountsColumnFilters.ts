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
  /** User-applied sort only. Null = default listing order (no column chevron). */
  const [sortKey, setSortKey] = useState<string | null>(null);
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
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
        return;
      }
      if (sortDir === "asc") {
        setSortDir("desc");
        return;
      }
      setSortKey(null);
      setSortDir(defaultSortDir);
    },
    [sortKey, sortDir, defaultSortDir],
  );

  const removeSort = useCallback(() => {
    setSortKey(null);
    setSortDir(defaultSortDir);
  }, [defaultSortDir]);

  const filteredRows = useMemo(() => {
    const result = applyAccountsColumnFilters(rows, columnFilters, getCellValue, getFilterValue);
    const activeKey = sortKey ?? defaultSortKey;
    const activeDir = sortKey ? sortDir : defaultSortDir;
    return sortAccountsRows(result, activeKey, activeDir, getCellValue);
  }, [rows, columnFilters, sortKey, sortDir, defaultSortKey, defaultSortDir, getCellValue, getFilterValue]);

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

  const isAmountColumn = useCallback(
    (columnKey: string, override?: AccountsColumnFilterType): boolean =>
      resolveFilterType(columnKey, override) === "amount",
    [resolveFilterType],
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
      sortKey: sortKey ?? undefined,
      sortDir,
      onSort: handleSort,
      onRemoveSort: removeSort,
      filterable: opts?.filterable !== false && !isAmountColumn(columnKey, opts?.filterType),
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
      isAmountColumn,
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
    isAmountColumn,
    statusOptionsFor: (columnKey: string) => columnConfig[columnKey]?.options ?? [],
    optionLabelsFor,
    headerProps,
  };
}
