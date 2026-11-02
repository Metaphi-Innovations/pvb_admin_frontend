"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { resolveDateRangePreset, type DateRangePresetId } from "@/lib/accounts/report-date-presets";
import type { PendingInvoiceListRow, PendingInvoiceTabId } from "./pending-invoice-tab-data";

export type PendingInvoiceTabCache = {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  rows: PendingInvoiceListRow[];
  search: string;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  total: number;
  columnFilters: Record<string, unknown>;
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  branches: string[];
};

export function createEmptyPendingInvoiceTabCache(): PendingInvoiceTabCache {
  const { from, to } = resolveDateRangePreset("this_year");
  return {
    loaded: false,
    loading: false,
    error: null,
    rows: [],
    search: "",
    page: 1,
    pageSize: 25,
    sortKey: "",
    sortDir: "desc",
    total: 0,
    columnFilters: {},
    preset: "this_year",
    dateFrom: from,
    dateTo: to,
    financialYearId: "all",
    branches: [],
  };
}

type TabState = Record<PendingInvoiceTabId, PendingInvoiceTabCache>;

function createInitialTabState(): TabState {
  return {
    sales_order: createEmptyPendingInvoiceTabCache(),
    stock_transfer: createEmptyPendingInvoiceTabCache(),
  };
}

type PendingInvoiceListingStateContextValue = {
  tabState: TabState;
  setTabState: Dispatch<SetStateAction<TabState>>;
  filterEpoch: number;
  setFilterEpoch: Dispatch<SetStateAction<number>>;
};

const PendingInvoiceListingStateContext =
  createContext<PendingInvoiceListingStateContextValue | null>(null);

export function PendingInvoiceListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [tabState, setTabState] = useState(createInitialTabState);
  const [filterEpoch, setFilterEpoch] = useState(0);

  const value = useMemo(
    () => ({ tabState, setTabState, filterEpoch, setFilterEpoch }),
    [tabState, filterEpoch],
  );

  return (
    <PendingInvoiceListingStateContext.Provider value={value}>
      {children}
    </PendingInvoiceListingStateContext.Provider>
  );
}

export function usePendingInvoiceListingState(): PendingInvoiceListingStateContextValue {
  const ctx = useContext(PendingInvoiceListingStateContext);
  if (!ctx) {
    throw new Error(
      "usePendingInvoiceListingState must be used within PendingInvoiceListingStateProvider",
    );
  }
  return ctx;
}
