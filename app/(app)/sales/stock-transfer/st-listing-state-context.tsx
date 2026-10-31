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

export type StModuleTabId =
  | "all"
  | "draft"
  | "pending"
  | "approved"
  | "rejected";

export type StListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultStListingState(): StListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize: 25,
  };
}

export const ST_LISTING_TAB_IDS = [
  "all",
  "draft",
  "pending",
  "approved",
  "rejected",
] as const satisfies readonly StModuleTabId[];

type StListingStateContextValue = {
  activeTab: StModuleTabId;
  setActiveTab: (tab: StModuleTabId) => void;
  listingByTab: Record<StModuleTabId, StListingState>;
  setListingByTab: Dispatch<
    SetStateAction<Record<StModuleTabId, StListingState>>
  >;
};

const StListingStateContext =
  createContext<StListingStateContextValue | null>(null);

function createInitialListingByTab(): Record<StModuleTabId, StListingState> {
  return {
    all: createDefaultStListingState(),
    draft: createDefaultStListingState(),
    pending: createDefaultStListingState(),
    approved: createDefaultStListingState(),
    rejected: createDefaultStListingState(),
  };
}

export function StListingStateProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<StModuleTabId>("all");
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
    <StListingStateContext.Provider value={value}>
      {children}
    </StListingStateContext.Provider>
  );
}

export function useStListingState(): StListingStateContextValue {
  const ctx = useContext(StListingStateContext);
  if (!ctx) {
    throw new Error(
      "useStListingState must be used within StListingStateProvider",
    );
  }
  return ctx;
}

export function parseStListTabParam(
  value: string | null | undefined,
): StModuleTabId | null {
  if (!value) return null;
  if (
    value === "all" ||
    value === "draft" ||
    value === "pending" ||
    value === "approved" ||
    value === "rejected"
  ) {
    return value;
  }
  return null;
}
