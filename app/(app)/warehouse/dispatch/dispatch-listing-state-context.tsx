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
import type { DispatchSourceTab } from "./services";

export type DispatchListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultDispatchListingState(): DispatchListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize: 10,
  };
}

type ListingBySource = Record<DispatchSourceTab, DispatchListingState>;

function createInitialListingBySource(): ListingBySource {
  return {
    sales_order: createDefaultDispatchListingState(),
    sample: createDefaultDispatchListingState(),
    stock_transfer: createDefaultDispatchListingState(),
    purchase_return: createDefaultDispatchListingState(),
  };
}

type DispatchListingStateContextValue = {
  activeSubTab: DispatchSourceTab;
  setActiveSubTab: (tab: DispatchSourceTab) => void;
  getListing: (source: DispatchSourceTab) => DispatchListingState;
  setListing: (
    source: DispatchSourceTab,
    updater: SetStateAction<DispatchListingState>,
  ) => void;
};

const DispatchListingStateContext =
  createContext<DispatchListingStateContextValue | null>(null);

export function DispatchListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [listingBySource, setListingBySource] = useState(
    createInitialListingBySource,
  );
  const [activeSubTab, setActiveSubTabState] =
    useState<DispatchSourceTab>("sales_order");

  const getListing = useCallback(
    (source: DispatchSourceTab) => listingBySource[source],
    [listingBySource],
  );

  const setListing = useCallback(
    (
      source: DispatchSourceTab,
      updater: SetStateAction<DispatchListingState>,
    ) => {
      setListingBySource((prev) => {
        const current = prev[source];
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (next === current) return prev;
        return { ...prev, [source]: next };
      });
    },
    [],
  );

  const setActiveSubTab = useCallback((tab: DispatchSourceTab) => {
    setActiveSubTabState((prev) => (prev === tab ? prev : tab));
  }, []);

  const value = useMemo(
    () => ({
      activeSubTab,
      setActiveSubTab,
      getListing,
      setListing,
    }),
    [activeSubTab, setActiveSubTab, getListing, setListing],
  );

  return (
    <DispatchListingStateContext.Provider value={value}>
      {children}
    </DispatchListingStateContext.Provider>
  );
}

export function useDispatchListingState(): DispatchListingStateContextValue {
  const ctx = useContext(DispatchListingStateContext);
  if (!ctx) {
    throw new Error(
      "useDispatchListingState must be used within DispatchListingStateProvider",
    );
  }
  return ctx;
}
