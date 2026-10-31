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

export type GrnListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export type GrnStockTransferSubTab = "pending" | "received";

export function createDefaultGrnListingState(): GrnListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize: 10,
  };
}

type GrnListingStateContextValue = {
  purchaseListing: GrnListingState;
  setPurchaseListing: Dispatch<SetStateAction<GrnListingState>>;
  salesReturnListing: GrnListingState;
  setSalesReturnListing: Dispatch<SetStateAction<GrnListingState>>;
  sampleReturnListing: GrnListingState;
  setSampleReturnListing: Dispatch<SetStateAction<GrnListingState>>;
  stockTransferSubTab: GrnStockTransferSubTab;
  setStockTransferSubTab: (tab: GrnStockTransferSubTab) => void;
  stockTransferPendingListing: GrnListingState;
  setStockTransferPendingListing: Dispatch<SetStateAction<GrnListingState>>;
  stockTransferReceivedListing: GrnListingState;
  setStockTransferReceivedListing: Dispatch<SetStateAction<GrnListingState>>;
};

const GrnListingStateContext =
  createContext<GrnListingStateContextValue | null>(null);

export function GrnListingStateProvider({ children }: { children: ReactNode }) {
  const [purchaseListing, setPurchaseListing] = useState(
    createDefaultGrnListingState,
  );
  const [salesReturnListing, setSalesReturnListing] = useState(
    createDefaultGrnListingState,
  );
  const [sampleReturnListing, setSampleReturnListing] = useState(
    createDefaultGrnListingState,
  );
  const [stockTransferSubTab, setStockTransferSubTab] =
    useState<GrnStockTransferSubTab>("pending");
  const [stockTransferPendingListing, setStockTransferPendingListing] =
    useState(createDefaultGrnListingState);
  const [stockTransferReceivedListing, setStockTransferReceivedListing] =
    useState(createDefaultGrnListingState);

  const value = useMemo(
    () => ({
      purchaseListing,
      setPurchaseListing,
      salesReturnListing,
      setSalesReturnListing,
      sampleReturnListing,
      setSampleReturnListing,
      stockTransferSubTab,
      setStockTransferSubTab,
      stockTransferPendingListing,
      setStockTransferPendingListing,
      stockTransferReceivedListing,
      setStockTransferReceivedListing,
    }),
    [
      purchaseListing,
      salesReturnListing,
      sampleReturnListing,
      stockTransferSubTab,
      stockTransferPendingListing,
      stockTransferReceivedListing,
    ],
  );

  return (
    <GrnListingStateContext.Provider value={value}>
      {children}
    </GrnListingStateContext.Provider>
  );
}

export function useGrnListingState(): GrnListingStateContextValue {
  const ctx = useContext(GrnListingStateContext);
  if (!ctx) {
    throw new Error(
      "useGrnListingState must be used within GrnListingStateProvider",
    );
  }
  return ctx;
}
