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

export type SoModuleTabId =
  | "all"
  | "draft"
  | "pending_approval"
  | "rejected"
  | "sales_return";

export type SoListTabId = "all" | "draft" | "pending_approval" | "rejected";

export type SoListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultSoListingState(): SoListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize: 25,
  };
}

export const SO_LIST_TAB_IDS = [
  "all",
  "draft",
  "pending_approval",
  "rejected",
] as const satisfies readonly SoListTabId[];

type SoListingStateContextValue = {
  /** Last listing tab — restored when returning from detail/edit/new without ?tab=. */
  activeTab: SoModuleTabId;
  setActiveTab: (tab: SoModuleTabId) => void;
  soListingByTab: Record<SoListTabId, SoListingState>;
  setSoListingByTab: Dispatch<
    SetStateAction<Record<SoListTabId, SoListingState>>
  >;
  returnListing: SoListingState;
  setReturnListing: Dispatch<SetStateAction<SoListingState>>;
};

const SoListingStateContext =
  createContext<SoListingStateContextValue | null>(null);

function createInitialSoListingByTab(): Record<SoListTabId, SoListingState> {
  return {
    all: createDefaultSoListingState(),
    draft: createDefaultSoListingState(),
    pending_approval: createDefaultSoListingState(),
    rejected: createDefaultSoListingState(),
  };
}

export function SoListingStateProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<SoModuleTabId>("all");
  const [soListingByTab, setSoListingByTab] = useState(createInitialSoListingByTab);
  const [returnListing, setReturnListing] = useState<SoListingState>(
    createDefaultSoListingState,
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      soListingByTab,
      setSoListingByTab,
      returnListing,
      setReturnListing,
    }),
    [activeTab, soListingByTab, returnListing],
  );

  return (
    <SoListingStateContext.Provider value={value}>
      {children}
    </SoListingStateContext.Provider>
  );
}

export function useSoListingState(): SoListingStateContextValue {
  const ctx = useContext(SoListingStateContext);
  if (!ctx) {
    throw new Error(
      "useSoListingState must be used within SoListingStateProvider",
    );
  }
  return ctx;
}

/** Normalize URL ?tab= values (including legacy `approval`). */
export function parseSoListTabParam(
  value: string | null | undefined,
): SoModuleTabId | null {
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
