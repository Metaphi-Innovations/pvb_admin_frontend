"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { FilterState, SortState } from "@/components/listing/types";
import { masterToday } from "@/lib/masters/common";
import {
  DEFAULT_STOCK_POSITION_FILTERS,
  type StockPositionFilters,
} from "./types/stock-position";

export type StockOverviewListTab =
  | "daily-logs"
  | "batch-movements"
  | "inventory"
  | "sales-return"
  | "sample-return"
  | "rejected";

export type StockOverviewSimpleTab =
  | "inventory"
  | "sales-return"
  | "sample-return"
  | "rejected";

export type StockOverviewPeriodTab = "daily-logs" | "batch-movements";

export type StockOverviewListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export type StockOverviewPeriodListingState = StockOverviewListingState & {
  draftTopFilters: StockPositionFilters;
  appliedTopFilters: StockPositionFilters;
};

export function isStockOverviewListTab(
  value: string,
): value is StockOverviewListTab {
  return (
    value === "daily-logs" ||
    value === "batch-movements" ||
    value === "inventory" ||
    value === "sales-return" ||
    value === "sample-return" ||
    value === "rejected"
  );
}

function createTodayTopFilters(today: string): StockPositionFilters {
  return {
    ...DEFAULT_STOCK_POSITION_FILTERS,
    datePreset: "today",
    dateMode: "single",
    asOnDate: today,
    fromDate: today,
    toDate: today,
  };
}

export function createDefaultSimpleListingState(
  pageSize = 10,
): StockOverviewListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize,
  };
}

export function createDefaultPeriodListingState(
  tab: StockOverviewPeriodTab,
  today: string,
): StockOverviewPeriodListingState {
  const top = createTodayTopFilters(today);
  return {
    filters: {},
    sort:
      tab === "batch-movements"
        ? { key: "movement_at", direction: "desc" }
        : { key: "", direction: "none" },
    page: 1,
    pageSize: 25,
    draftTopFilters: top,
    appliedTopFilters: top,
  };
}

type SimpleListingByTab = Record<
  StockOverviewSimpleTab,
  StockOverviewListingState
>;
type PeriodListingByTab = Record<
  StockOverviewPeriodTab,
  StockOverviewPeriodListingState
>;

function createInitialSimpleListings(): SimpleListingByTab {
  return {
    inventory: createDefaultSimpleListingState(10),
    "sales-return": createDefaultSimpleListingState(10),
    "sample-return": createDefaultSimpleListingState(10),
    rejected: createDefaultSimpleListingState(10),
  };
}

function createInitialPeriodListings(
  today: string,
): PeriodListingByTab {
  return {
    "daily-logs": createDefaultPeriodListingState("daily-logs", today),
    "batch-movements": createDefaultPeriodListingState(
      "batch-movements",
      today,
    ),
  };
}

type StockOverviewListingStateContextValue = {
  activeTab: StockOverviewListTab;
  setActiveTab: (tab: StockOverviewListTab) => void;
  selectedWarehouse: string;
  setSelectedWarehouse: (warehouseId: SetStateAction<string>) => void;
  getSimpleListing: (tab: StockOverviewSimpleTab) => StockOverviewListingState;
  setSimpleListing: (
    tab: StockOverviewSimpleTab,
    updater: SetStateAction<StockOverviewListingState>,
  ) => void;
  getPeriodListing: (
    tab: StockOverviewPeriodTab,
  ) => StockOverviewPeriodListingState;
  setPeriodListing: (
    tab: StockOverviewPeriodTab,
    updater: SetStateAction<StockOverviewPeriodListingState>,
  ) => void;
  /** Stable "today" string used to seed / reset period tabs. */
  today: string;
};

const StockOverviewListingStateContext =
  createContext<StockOverviewListingStateContextValue | null>(null);

export function StockOverviewListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [today] = useState(() => masterToday());
  const [simpleByTab, setSimpleByTab] = useState(createInitialSimpleListings);
  const [periodByTab, setPeriodByTab] = useState(() =>
    createInitialPeriodListings(today),
  );
  const [activeTab, setActiveTabState] =
    useState<StockOverviewListTab>("daily-logs");
  const [selectedWarehouse, setSelectedWarehouseState] = useState("");

  const getSimpleListing = useCallback(
    (tab: StockOverviewSimpleTab) => simpleByTab[tab],
    [simpleByTab],
  );

  const setSimpleListing = useCallback(
    (
      tab: StockOverviewSimpleTab,
      updater: SetStateAction<StockOverviewListingState>,
    ) => {
      setSimpleByTab((prev) => {
        const current = prev[tab];
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (next === current) return prev;
        return { ...prev, [tab]: next };
      });
    },
    [],
  );

  const getPeriodListing = useCallback(
    (tab: StockOverviewPeriodTab) => periodByTab[tab],
    [periodByTab],
  );

  const setPeriodListing = useCallback(
    (
      tab: StockOverviewPeriodTab,
      updater: SetStateAction<StockOverviewPeriodListingState>,
    ) => {
      setPeriodByTab((prev) => {
        const current = prev[tab];
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (next === current) return prev;
        return { ...prev, [tab]: next };
      });
    },
    [],
  );

  const setActiveTab = useCallback((tab: StockOverviewListTab) => {
    setActiveTabState((prev) => (prev === tab ? prev : tab));
  }, []);

  const setSelectedWarehouse = useCallback(
    (warehouseId: SetStateAction<string>) => {
      setSelectedWarehouseState((prev) => {
        const next =
          typeof warehouseId === "function" ? warehouseId(prev) : warehouseId;
        return prev === next ? prev : next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      selectedWarehouse,
      setSelectedWarehouse,
      getSimpleListing,
      setSimpleListing,
      getPeriodListing,
      setPeriodListing,
      today,
    }),
    [
      activeTab,
      setActiveTab,
      selectedWarehouse,
      setSelectedWarehouse,
      getSimpleListing,
      setSimpleListing,
      getPeriodListing,
      setPeriodListing,
      today,
    ],
  );

  return (
    <StockOverviewListingStateContext.Provider value={value}>
      {children}
    </StockOverviewListingStateContext.Provider>
  );
}

export function useStockOverviewListingState(): StockOverviewListingStateContextValue {
  const ctx = useContext(StockOverviewListingStateContext);
  if (!ctx) {
    throw new Error(
      "useStockOverviewListingState must be used within StockOverviewListingStateProvider",
    );
  }
  return ctx;
}
