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
import {
  DEFAULT_MASTER_LIST_SORT,
  type FilterState,
  type SortState,
} from "@/components/listing/types";
import type { PRListStatus } from "@/lib/procurement/pr-status";

export type PrModuleTabId = "all" | PRListStatus;

export type PrListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultPrListingState(): PrListingState {
  return {
    filters: {},
    sort: { ...DEFAULT_MASTER_LIST_SORT },
    page: 1,
    pageSize: 10,
  };
}

/** Tabs that currently appear on the PR listing. */
export const PR_LISTING_TAB_IDS = [
  "all",
  "draft",
  "approved",
  "rejected",
] as const satisfies readonly PrModuleTabId[];

export type PrListingVisibleTabId = (typeof PR_LISTING_TAB_IDS)[number];

type PrListingStateContextValue = {
  /** Last listing tab — restored when returning from detail/edit/new. */
  activeTab: PrListingVisibleTabId;
  setActiveTab: (tab: PrListingVisibleTabId) => void;
  listingByTab: Record<PrListingVisibleTabId, PrListingState>;
  setListingByTab: Dispatch<
    SetStateAction<Record<PrListingVisibleTabId, PrListingState>>
  >;
};

const PrListingStateContext =
  createContext<PrListingStateContextValue | null>(null);

function createInitialListingByTab(): Record<
  PrListingVisibleTabId,
  PrListingState
> {
  return {
    all: createDefaultPrListingState(),
    draft: createDefaultPrListingState(),
    approved: createDefaultPrListingState(),
    rejected: createDefaultPrListingState(),
  };
}

export function PrListingStateProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] =
    useState<PrListingVisibleTabId>("all");
  const [listingByTab, setListingByTab] = useState(createInitialListingByTab);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      listingByTab,
      setListingByTab,
    }),
    [activeTab, listingByTab],
  );

  return (
    <PrListingStateContext.Provider value={value}>
      {children}
    </PrListingStateContext.Provider>
  );
}

export function usePrListingState(): PrListingStateContextValue {
  const ctx = useContext(PrListingStateContext);
  if (!ctx) {
    throw new Error(
      "usePrListingState must be used within PrListingStateProvider",
    );
  }
  return ctx;
}
