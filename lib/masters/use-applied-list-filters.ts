"use client";

import { useCallback, useMemo, useState } from "react";
import type { FilterState } from "@/components/listing/types";

/**
 * Separates draft filter UI state from filters sent to the list API.
 * List queries should use `appliedFilters` / `appliedSearch` only.
 * Call `applyFilters()` on explicit user actions (Search, Apply, Clear, Reset).
 */
export function useAppliedListFilters(initial: FilterState = {}) {
  const [draftFilters, setDraftFilters] = useState<FilterState>(initial);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initial);

  const applyFilters = useCallback((next?: FilterState) => {
    const resolved = next ?? draftFilters;
    setAppliedFilters(resolved);
    if (next !== undefined) {
      setDraftFilters(next);
    }
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters({});
    setAppliedFilters({});
  }, []);

  const appliedSearch = useMemo(
    () => String(appliedFilters.search ?? "").trim(),
    [appliedFilters.search],
  );

  const isDirty = useMemo(
    () => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
    [draftFilters, appliedFilters],
  );

  return {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applyFilters,
    resetFilters,
    appliedSearch,
    isDirty,
  };
}

/** @deprecated Use useAppliedListFilters — debounced auto-fetch removed. */
export function useDebouncedFilters(filters: FilterState, _delayMs = 400) {
  const appliedSearch = useMemo(
    () => String(filters.search ?? "").trim(),
    [filters.search],
  );
  return {
    debouncedFilters: filters,
    debouncedSearch: appliedSearch,
    isDebouncing: false,
  };
}
