"use client";

import { useEffect, useMemo, useState } from "react";
import type { FilterState } from "@/components/listing/types";

export function useDebouncedFilters(filters: FilterState, delayMs = 400) {
  const [debouncedFilters, setDebouncedFilters] = useState<FilterState>(filters);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedFilters(filters), delayMs);
    return () => window.clearTimeout(timer);
  }, [filters, delayMs]);

  const isDebouncing = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(debouncedFilters),
    [filters, debouncedFilters],
  );

  const debouncedSearch = useMemo(
    () => String(debouncedFilters.search ?? "").trim(),
    [debouncedFilters.search],
  );

  return { debouncedFilters, debouncedSearch, isDebouncing };
}
