"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterState, SortState } from "@/components/listing/types";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import type { GrnTabApiContext } from "@/lib/warehouse/grn-list-config";
import type { BackendGrnSourceType } from "@/lib/warehouse/grn-status";
import {
  buildGrnApiFilters,
  buildGrnOrdering,
  GrnListService,
  type GrnFilterField,
  type GrnFilterOption,
  type GrnListItem,
  GRN_FILTER_COLUMN_MAP,
} from "@/services/grn-list.service";

interface UseGrnListDataParams {
  tabContext: GrnTabApiContext;
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
  destinationWarehouse?: string;
}

export function useGrnListData({
  tabContext,
  filters,
  sort,
  page,
  pageSize,
  destinationWarehouse,
}: UseGrnListDataParams) {
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [items, setItems] = useState<GrnListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiFilters = useMemo(
    () => buildGrnApiFilters(debouncedFilters, tabContext, destinationWarehouse),
    [debouncedFilters, tabContext, destinationWarehouse],
  );

  const ordering = useMemo(
    () => buildGrnOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const result = await GrnListService.list({
          page,
          pageSize,
          search: debouncedSearch,
          ordering,
          tabContext,
          apiFilters,
          signal: controller.signal,
        });

        if (active) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        console.error("Error loading GRN list:", err);
        setError(err instanceof Error ? err.message : "Failed to load GRNs.");
        setItems([]);
        setTotal(0);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    page,
    pageSize,
    debouncedSearch,
    ordering,
    apiFilters,
    tabContext.sourceType,
    tabContext.status,
  ]);

  return {
    items,
    total,
    loading: loading || isDebouncing,
    error,
    debouncedFilters,
  };
}

const filterOptionsCache = new Map<string, GrnFilterOption[]>();
const filterLoadingFields = new Set<string>();

function filterCacheKey(fieldName: GrnFilterField, sourceType?: BackendGrnSourceType) {
  return `${sourceType ?? "ALL"}:${fieldName}`;
}

export function useGrnLazyFilters(sourceType?: BackendGrnSourceType) {
  const [filterOptions, setFilterOptions] = useState<
    Partial<Record<GrnFilterField, GrnFilterOption[]>>
  >({});
  const loadedColumnsRef = useRef<Set<string>>(new Set());

  const handleOpenFilter = useCallback(async (columnKey: string) => {
    if (loadedColumnsRef.current.has(columnKey)) return;

    const fieldName = GRN_FILTER_COLUMN_MAP[columnKey];
    if (!fieldName) return;

    const cacheKey = filterCacheKey(fieldName, sourceType);

    if (filterOptionsCache.has(cacheKey)) {
      loadedColumnsRef.current.add(columnKey);
      setFilterOptions((prev) => ({
        ...prev,
        [fieldName]: filterOptionsCache.get(cacheKey),
      }));
      return;
    }

    if (filterLoadingFields.has(cacheKey)) return;

    filterLoadingFields.add(cacheKey);
    try {
      const options = await GrnListService.getFilterDropdown(fieldName, sourceType);
      filterOptionsCache.set(cacheKey, options);
      loadedColumnsRef.current.add(columnKey);
      setFilterOptions((prev) => ({
        ...prev,
        [fieldName]: options,
      }));
    } catch (err) {
      console.error(`Error loading GRN filter options for ${columnKey}:`, err);
      loadedColumnsRef.current.delete(columnKey);
    } finally {
      filterLoadingFields.delete(cacheKey);
    }
  }, [sourceType]);

  const getFilterOptionsForColumn = useCallback(
    (columnKey: string, staticOptions?: GrnFilterOption[]) => {
      const fieldName = GRN_FILTER_COLUMN_MAP[columnKey];
      if (!fieldName) return staticOptions ?? [];
      return filterOptions[fieldName] ?? staticOptions ?? [];
    },
    [filterOptions],
  );

  return {
    handleOpenFilter,
    getFilterOptionsForColumn,
  };
}
