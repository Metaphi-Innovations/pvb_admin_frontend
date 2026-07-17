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
  /** When false, skip fetching (e.g. inactive sub-tab). Default true. */
  enabled?: boolean;
}

export function useGrnListData({
  tabContext,
  filters,
  sort,
  page,
  pageSize,
  destinationWarehouse,
  enabled = true,
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
    if (!enabled) return;

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
    enabled,
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
    loading: enabled && (loading || isDebouncing),
    error,
    debouncedFilters,
  };
}

export function useGrnLazyFilters(sourceType?: BackendGrnSourceType) {
  const [filterOptions, setFilterOptions] = useState<
    Partial<Record<GrnFilterField, GrnFilterOption[]>>
  >({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const handleOpenFilter = useCallback(async (columnKey: string) => {
    const fieldName = GRN_FILTER_COLUMN_MAP[columnKey];
    if (!fieldName) return;

    const requestKey = `${sourceType ?? "ALL"}:${fieldName}`;
    // Avoid stacking identical in-flight requests from a double onOpen
    if (inFlightRef.current.has(requestKey)) return;
    inFlightRef.current.add(requestKey);

    // Clear so popover shows loading until fresh data arrives
    setFilterOptions((prev) => ({
      ...prev,
      [fieldName]: [],
    }));

    try {
      const options = await GrnListService.getFilterDropdown(fieldName, sourceType);
      setFilterOptions((prev) => ({
        ...prev,
        [fieldName]: options,
      }));
    } catch (err) {
      console.error(`Error loading GRN filter options for ${columnKey}:`, err);
      setFilterOptions((prev) => ({
        ...prev,
        [fieldName]: [],
      }));
    } finally {
      inFlightRef.current.delete(requestKey);
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
