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

export type SampleModuleTabId =
  | "all"
  | "draft"
  | "pending_approval"
  | "rejected"
  | "sales_return";

export type SampleListTabId = "all" | "draft" | "pending_approval" | "rejected";

export type SampleListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultSampleListingState(): SampleListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize: 25,
  };
}

type SampleListingStateContextValue = {
  activeTab: SampleModuleTabId;
  setActiveTab: (tab: SampleModuleTabId) => void;
  listingByTab: Record<SampleListTabId, SampleListingState>;
  setListingByTab: Dispatch<
    SetStateAction<Record<SampleListTabId, SampleListingState>>
  >;
  returnListing: SampleListingState;
  setReturnListing: Dispatch<SetStateAction<SampleListingState>>;
};

const SampleListingStateContext =
  createContext<SampleListingStateContextValue | null>(null);

function createInitialListingByTab(): Record<SampleListTabId, SampleListingState> {
  return {
    all: createDefaultSampleListingState(),
    draft: createDefaultSampleListingState(),
    pending_approval: createDefaultSampleListingState(),
    rejected: createDefaultSampleListingState(),
  };
}

export function SampleListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<SampleModuleTabId>("all");
  const [listingByTab, setListingByTab] = useState(createInitialListingByTab);
  const [returnListing, setReturnListing] = useState<SampleListingState>(
    createDefaultSampleListingState,
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      listingByTab,
      setListingByTab,
      returnListing,
      setReturnListing,
    }),
    [activeTab, listingByTab, returnListing],
  );

  return (
    <SampleListingStateContext.Provider value={value}>
      {children}
    </SampleListingStateContext.Provider>
  );
}

export function useSampleListingState(): SampleListingStateContextValue {
  const ctx = useContext(SampleListingStateContext);
  if (!ctx) {
    throw new Error(
      "useSampleListingState must be used within SampleListingStateProvider",
    );
  }
  return ctx;
}

/** Normalize URL ?tab= values (including legacy `approval`). */
export function parseSampleListTabParam(
  value: string | null | undefined,
): SampleModuleTabId | null {
  if (!value) return null;
  if (value === "approval") return "pending_approval";
  if (
    value === "all" ||
    value === "draft" ||
    value === "pending_approval" ||
    value === "rejected" ||
    value === "sales_return"
  ) {
    return value;
  }
  return null;
}
