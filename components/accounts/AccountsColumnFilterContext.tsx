"use client";

import React, { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAccountsColumnFilters, type UseAccountsColumnFiltersOptions } from "./useAccountsColumnFilters";

/** Routes where column filters must keep legacy operator UI (locked / approved screens). */
const ADVANCED_COLUMN_FILTER_ROUTE_PREFIXES = [
  "/accounts/receivables/ageing",
  "/accounts/payables/ageing",
  "/accounts/banking/reconciliation",
];

function useLockedAdvancedColumnFilters(): boolean {
  const pathname = usePathname();
  return ADVANCED_COLUMN_FILTER_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

type ColumnFilterContextValue = ReturnType<typeof useAccountsColumnFilters> | null;

const AccountsColumnFilterContext = createContext<ColumnFilterContextValue>(null);

export type AccountsColumnFilterProviderProps<T> = UseAccountsColumnFiltersOptions<T> & {
  children: React.ReactNode;
  /** When true, column filters use value-only UI (no operator dropdowns). Default: true except locked routes. */
  simpleColumnFilters?: boolean;
};

/** Wrap listing tables — all SortTh / AccountsColumnHeader children auto-wire column filters. */
export function AccountsColumnFilterProvider<T>({
  children,
  simpleColumnFilters: simpleColumnFiltersProp,
  ...options
}: AccountsColumnFilterProviderProps<T>) {
  const lockedAdvanced = useLockedAdvancedColumnFilters();
  const simpleColumnFilters = useMemo(() => {
    if (simpleColumnFiltersProp != null) return simpleColumnFiltersProp;
    return !lockedAdvanced;
  }, [simpleColumnFiltersProp, lockedAdvanced]);

  const value = useAccountsColumnFilters({ ...options, simpleColumnFilters });
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
