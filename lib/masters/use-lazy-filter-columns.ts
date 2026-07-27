"use client";

import { useCallback, useState } from "react";

export type FilterDropdownQueryOptions = {
  enabled?: boolean;
};

/** Track which column filters have been opened so dropdown APIs load on demand. */
export function useLazyFilterColumns() {
  const [openedColumns, setOpenedColumns] = useState<Set<string>>(() => new Set());

  const handleOpenFilter = useCallback((columnKey: string) => {
    setOpenedColumns((prev) => {
      if (prev.has(columnKey)) return prev;
      const next = new Set(prev);
      next.add(columnKey);
      return next;
    });
  }, []);

  const isFilterOpen = useCallback(
    (columnKey: string) => openedColumns.has(columnKey),
    [openedColumns],
  );

  return { handleOpenFilter, isFilterOpen };
}
