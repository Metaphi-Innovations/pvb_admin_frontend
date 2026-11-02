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
import type { PackingSourceTab, PackingStatusTab } from "./lib/packing-list-nav";

export type PackingListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultPackingListingState(): PackingListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize: 10,
  };
}

type SourceListingByStatus = Record<PackingStatusTab, PackingListingState>;
type ListingBySource = Record<PackingSourceTab, SourceListingByStatus>;
type StatusBySource = Record<PackingSourceTab, PackingStatusTab>;

function createSourceListing(): SourceListingByStatus {
  return {
    "ready-for-packing": createDefaultPackingListingState(),
    "packing-done": createDefaultPackingListingState(),
  };
}

function createInitialListingBySource(): ListingBySource {
  return {
    sales: createSourceListing(),
    sample: createSourceListing(),
    stock_transfer: createSourceListing(),
    purchase_return: createSourceListing(),
  };
}

function createInitialStatusBySource(): StatusBySource {
  return {
    sales: "ready-for-packing",
    sample: "ready-for-packing",
    stock_transfer: "ready-for-packing",
    purchase_return: "ready-for-packing",
  };
}

type PackingListingStateContextValue = {
  getListing: (
    source: PackingSourceTab,
    status: PackingStatusTab,
  ) => PackingListingState;
  setListing: (
    source: PackingSourceTab,
    status: PackingStatusTab,
    updater: SetStateAction<PackingListingState>,
  ) => void;
  /** Ready / Packing Done selection scoped to each source tab. */
  getStatusForSource: (source: PackingSourceTab) => PackingStatusTab;
  setStatusForSource: (source: PackingSourceTab, status: PackingStatusTab) => void;
};

const PackingListingStateContext =
  createContext<PackingListingStateContextValue | null>(null);

export function PackingListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [listingBySource, setListingBySource] = useState(
    createInitialListingBySource,
  );
  const [statusBySource, setStatusBySource] = useState(
    createInitialStatusBySource,
  );

  const getListing = useCallback(
    (source: PackingSourceTab, status: PackingStatusTab) =>
      listingBySource[source][status],
    [listingBySource],
  );

  const setListing = useCallback(
    (
      source: PackingSourceTab,
      status: PackingStatusTab,
      updater: SetStateAction<PackingListingState>,
    ) => {
      setListingBySource((prev) => {
        const current = prev[source][status];
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (next === current) return prev;
        return {
          ...prev,
          [source]: {
            ...prev[source],
            [status]: next,
          },
        };
      });
    },
    [],
  );

  const getStatusForSource = useCallback(
    (source: PackingSourceTab) => statusBySource[source],
    [statusBySource],
  );

  const setStatusForSource = useCallback(
    (source: PackingSourceTab, status: PackingStatusTab) => {
      setStatusBySource((prev) =>
        prev[source] === status ? prev : { ...prev, [source]: status },
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      getListing,
      setListing,
      getStatusForSource,
      setStatusForSource,
    }),
    [getListing, setListing, getStatusForSource, setStatusForSource],
  );

  return (
    <PackingListingStateContext.Provider value={value}>
      {children}
    </PackingListingStateContext.Provider>
  );
}

export function usePackingListingState(): PackingListingStateContextValue {
  const ctx = useContext(PackingListingStateContext);
  if (!ctx) {
    throw new Error(
      "usePackingListingState must be used within PackingListingStateProvider",
    );
  }
  return ctx;
}
