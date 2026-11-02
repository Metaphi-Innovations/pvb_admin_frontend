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
import { ALL_WAREHOUSE_FILTER_VALUE } from "./constants";

export type ReorderListTab = "warehouse-wise" | "product-overview";

export type ReorderListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultReorderListingState(): ReorderListingState {
  return {
    filters: {},
    sort: { key: "updatedDate", direction: "desc" },
    page: 1,
    pageSize: 10,
  };
}

type ListingByTab = Record<ReorderListTab, ReorderListingState>;

function createInitialListingByTab(): ListingByTab {
  return {
    "warehouse-wise": createDefaultReorderListingState(),
    "product-overview": createDefaultReorderListingState(),
  };
}

type ReorderListingStateContextValue = {
  activeTab: ReorderListTab;
  setActiveTab: (tab: ReorderListTab) => void;
  selectedWarehouse: string;
  setSelectedWarehouse: (warehouseId: SetStateAction<string>) => void;
  getListing: (tab: ReorderListTab) => ReorderListingState;
  setListing: (
    tab: ReorderListTab,
    updater: SetStateAction<ReorderListingState>,
  ) => void;
};

const ReorderListingStateContext =
  createContext<ReorderListingStateContextValue | null>(null);

function isReorderListTab(value: string): value is ReorderListTab {
  return value === "warehouse-wise" || value === "product-overview";
}

export function ReorderListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [listingByTab, setListingByTab] = useState(createInitialListingByTab);
  const [activeTab, setActiveTabState] =
    useState<ReorderListTab>("warehouse-wise");
  const [selectedWarehouse, setSelectedWarehouseState] = useState(
    ALL_WAREHOUSE_FILTER_VALUE,
  );

  const getListing = useCallback(
    (tab: ReorderListTab) => listingByTab[tab],
    [listingByTab],
  );

  const setListing = useCallback(
    (tab: ReorderListTab, updater: SetStateAction<ReorderListingState>) => {
      setListingByTab((prev) => {
        const current = prev[tab];
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (next === current) return prev;
        return { ...prev, [tab]: next };
      });
    },
    [],
  );

  const setActiveTab = useCallback((tab: ReorderListTab) => {
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
      getListing,
      setListing,
    }),
    [
      activeTab,
      setActiveTab,
      selectedWarehouse,
      setSelectedWarehouse,
      getListing,
      setListing,
    ],
  );

  return (
    <ReorderListingStateContext.Provider value={value}>
      {children}
    </ReorderListingStateContext.Provider>
  );
}

export function useReorderListingState(): ReorderListingStateContextValue {
  const ctx = useContext(ReorderListingStateContext);
  if (!ctx) {
    throw new Error(
      "useReorderListingState must be used within ReorderListingStateProvider",
    );
  }
  return ctx;
}

export { isReorderListTab };
