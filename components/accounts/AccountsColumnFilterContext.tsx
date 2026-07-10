"use client";

import React, { createContext, useContext } from "react";
import { useAccountsColumnFilters, type UseAccountsColumnFiltersOptions } from "./useAccountsColumnFilters";

type ColumnFilterContextValue = ReturnType<typeof useAccountsColumnFilters> | null;

const AccountsColumnFilterContext = createContext<ColumnFilterContextValue>(null);

/** Wrap listing tables — all SortTh / AccountsColumnHeader children auto-wire column filters. */
export function AccountsColumnFilterProvider<T>({
  children,
  ...options
}: UseAccountsColumnFiltersOptions<T> & { children: React.ReactNode }) {
  const value = useAccountsColumnFilters(options);
  return (
    <AccountsColumnFilterContext.Provider value={value}>{children}</AccountsColumnFilterContext.Provider>
  );
}

export function useAccountsColumnFilterContext(): ColumnFilterContextValue {
  return useContext(AccountsColumnFilterContext);
}

/** Filtered + sorted rows from provider — falls back to input rows when no provider. */
export function useAccountsFilteredRows<T>(fallbackRows: T[]): T[] {
  const ctx = useAccountsColumnFilterContext();
  if (ctx) return ctx.filteredRows as T[];
  return fallbackRows;
}
