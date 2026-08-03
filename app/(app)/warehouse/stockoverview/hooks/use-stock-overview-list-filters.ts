"use client";

import { useCallback, useState } from "react";
import type { FilterState, SortState } from "@/components/listing/types";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";

const DEFAULT_SORT: SortState = { key: "", direction: "none" };

/**
 * Stock Overview list filter helpers:
 * - Draft UI state vs applied request state
 * - Clear All resets filters/search/sort/page and forces list reload
 */
export function useStockOverviewListFilters() {
  const {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applyFilters,
    resetFilters,
  } = useAppliedListFilters();

  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listNonce, setListNonce] = useState(0);

  const handleFilterChange = useCallback(
    (next: FilterState) => {
      const cleared = Object.keys(next).length === 0;
      if (cleared) {
        resetFilters();
        setSort(DEFAULT_SORT);
        setPage(1);
        setListNonce((n) => n + 1);
        return;
      }
      setDraftFilters(next);
      applyFilters(next);
      setPage(1);
    },
    [applyFilters, resetFilters, setDraftFilters],
  );

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applyFilters,
    resetFilters,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    handlePageSizeChange,
    handleFilterChange,
    listNonce,
    bumpListNonce: () => setListNonce((n) => n + 1),
  };
}
