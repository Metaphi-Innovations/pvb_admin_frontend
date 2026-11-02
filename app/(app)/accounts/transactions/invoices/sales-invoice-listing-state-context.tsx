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
import type { SalesInvoiceListRow, SalesInvoiceTabId } from "./sales-invoice-tab-data";

export type SalesInvoiceTabCache = {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  rows: SalesInvoiceListRow[];
  search: string;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
};

export function createEmptySalesInvoiceTabCache(): SalesInvoiceTabCache {
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
    columnFilters: {},
  };
}

type TabState = Record<SalesInvoiceTabId, SalesInvoiceTabCache>;

function createInitialTabState(): TabState {
  return {
    all: createEmptySalesInvoiceTabCache(),
    sales_order: createEmptySalesInvoiceTabCache(),
    stock_transfer: createEmptySalesInvoiceTabCache(),
    sample_order: createEmptySalesInvoiceTabCache(),
    service: createEmptySalesInvoiceTabCache(),
  };
}

export type SalesInvoiceToolbarState = {
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  branches: string[];
};

function createInitialToolbar(): SalesInvoiceToolbarState {
  const { from, to } = resolveDateRangePreset("this_year");
  return {
    preset: "this_year",
    dateFrom: from,
    dateTo: to,
    financialYearId: "all",
    branches: [],
  };
}

type SalesInvoiceListingStateContextValue = {
  tabState: TabState;
  setTabState: Dispatch<SetStateAction<TabState>>;
  toolbar: SalesInvoiceToolbarState;
  setToolbar: Dispatch<SetStateAction<SalesInvoiceToolbarState>>;
  filterEpoch: number;
  setFilterEpoch: Dispatch<SetStateAction<number>>;
};

const SalesInvoiceListingStateContext =
  createContext<SalesInvoiceListingStateContextValue | null>(null);

export function SalesInvoiceListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [tabState, setTabState] = useState(createInitialTabState);
  const [toolbar, setToolbar] = useState(createInitialToolbar);
  const [filterEpoch, setFilterEpoch] = useState(0);

  const value = useMemo(
    () => ({
      tabState,
      setTabState,
      toolbar,
      setToolbar,
      filterEpoch,
      setFilterEpoch,
    }),
    [tabState, toolbar, filterEpoch],
  );

  return (
    <SalesInvoiceListingStateContext.Provider value={value}>
      {children}
    </SalesInvoiceListingStateContext.Provider>
  );
}

export function useSalesInvoiceListingState(): SalesInvoiceListingStateContextValue {
  const ctx = useContext(SalesInvoiceListingStateContext);
  if (!ctx) {
    throw new Error(
      "useSalesInvoiceListingState must be used within SalesInvoiceListingStateProvider",
    );
  }
  return ctx;
}
