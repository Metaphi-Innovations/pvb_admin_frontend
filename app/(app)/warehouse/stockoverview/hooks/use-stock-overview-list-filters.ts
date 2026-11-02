"use client";

import { useCallback, useState } from "react";
import type { FilterState, SortState } from "@/components/listing/types";
import {
  createDefaultSimpleListingState,
  useStockOverviewListingState,
  type StockOverviewSimpleTab,
} from "../stock-overview-listing-state-context";

const DEFAULT_SORT: SortState = { key: "", direction: "none" };

/**
 * Stock Overview list filter helpers backed by module listing context:
 * - Persists filters/sort/page across tabs and view until leaving the module
 * - Clear All resets filters/search/sort/page and forces list reload
 */
export function useStockOverviewListFilters(tab: StockOverviewSimpleTab) {
  const { getSimpleListing, setSimpleListing } = useStockOverviewListingState();
  const { filters, sort, page, pageSize } = getSimpleListing(tab);
  const [listNonce, setListNonce] = useState(0);

  const setSort = useCallback(
    (next: SortState) => {
      setSimpleListing(tab, (prev) => ({ ...prev, sort: next, page: 1 }));
    },
    [setSimpleListing, tab],
  );

  const setPage = useCallback(
    (next: number) => {
      setSimpleListing(tab, (prev) => ({ ...prev, page: next }));
    },
    [setSimpleListing, tab],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setSimpleListing(tab, (prev) => ({
        ...prev,
        pageSize: size,
        page: 1,
      }));
    },
    [setSimpleListing, tab],
  );

  const handleFilterChange = useCallback(
    (next: FilterState) => {
      const cleared = Object.keys(next).length === 0;
      if (cleared) {
        const defaults = createDefaultSimpleListingState(pageSize);
        setSimpleListing(tab, {
          ...defaults,
          pageSize,
          sort: DEFAULT_SORT,
        });
        setListNonce((n) => n + 1);
        return;
      }
      setSimpleListing(tab, (prev) => ({
        ...prev,
        filters: next,
        page: 1,
      }));
    },
    [pageSize, setSimpleListing, tab],
  );

  const resetFilters = useCallback(() => {
    setSimpleListing(tab, (prev) => ({
      ...prev,
      filters: {},
      page: 1,
    }));
  }, [setSimpleListing, tab]);

  return {
    draftFilters: filters,
    setDraftFilters: (next: FilterState) => {
      setSimpleListing(tab, (prev) => ({ ...prev, filters: next }));
    },
    appliedFilters: filters,
    applyFilters: (next?: FilterState) => {
      if (next === undefined) return;
      setSimpleListing(tab, (prev) => ({
        ...prev,
        filters: next,
        page: 1,
      }));
    },
    resetFilters,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    handlePageSizeChange,
    handleFilterChange,
    listNonce,
    bumpListNonce: () => setListNonce((n) => n + 1),
  };
}
