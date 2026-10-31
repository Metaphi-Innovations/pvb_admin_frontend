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
import type { FilterState, SortState } from "@/components/listing/types";

export type PoModuleTabId = "all" | "draft" | "po_return";
export type PoListTabId = "all" | "draft";

export type PoListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultPoListingState(): PoListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize: 10,
  };
}

type PoListingStateContextValue = {
  /** Last listing tab — restored when returning from detail/edit without ?tab=. */
  activeTab: PoModuleTabId;
  setActiveTab: (tab: PoModuleTabId) => void;
  poListingByTab: Record<PoListTabId, PoListingState>;
  setPoListingByTab: Dispatch<
    SetStateAction<Record<PoListTabId, PoListingState>>
  >;
  returnListing: PoListingState;
  setReturnListing: Dispatch<SetStateAction<PoListingState>>;
};

const PoListingStateContext =
  createContext<PoListingStateContextValue | null>(null);

export function PoListingStateProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<PoModuleTabId>("all");
  const [poListingByTab, setPoListingByTab] = useState<
    Record<PoListTabId, PoListingState>
  >({
    all: createDefaultPoListingState(),
    draft: createDefaultPoListingState(),
  });
  const [returnListing, setReturnListing] = useState<PoListingState>(
    createDefaultPoListingState,
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      poListingByTab,
      setPoListingByTab,
      returnListing,
      setReturnListing,
    }),
    [activeTab, poListingByTab, returnListing],
  );

  return (
    <PoListingStateContext.Provider value={value}>
      {children}
    </PoListingStateContext.Provider>
  );
}

export function usePoListingState(): PoListingStateContextValue {
  const ctx = useContext(PoListingStateContext);
  if (!ctx) {
    throw new Error(
      "usePoListingState must be used within PoListingStateProvider",
    );
  }
  return ctx;
}
