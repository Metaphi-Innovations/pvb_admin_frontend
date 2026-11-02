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
import type { QcListSource, QcStatusTab } from "./shared/qc-list-nav";

export type QcListingState = {
  filters: FilterState;
  sort: SortState;
  page: number;
  pageSize: number;
};

export function createDefaultQcListingState(): QcListingState {
  return {
    filters: {},
    sort: { key: "", direction: "none" },
    page: 1,
    pageSize: 10,
  };
}

type SourceListingByStatus = Record<QcStatusTab, QcListingState>;
type ListingBySource = Record<QcListSource, SourceListingByStatus>;
type StatusBySource = Record<QcListSource, QcStatusTab>;

function createSourceListing(): SourceListingByStatus {
  return {
    pending: createDefaultQcListingState(),
    completed: createDefaultQcListingState(),
  };
}

function createInitialListingBySource(): ListingBySource {
  return {
    purchase: createSourceListing(),
    "stock-transfer": createSourceListing(),
    "sales-return": createSourceListing(),
    "sample-return": createSourceListing(),
  };
}

function createInitialStatusBySource(): StatusBySource {
  return {
    purchase: "pending",
    "stock-transfer": "pending",
    "sales-return": "pending",
    "sample-return": "pending",
  };
}

type QcListingStateContextValue = {
  getListing: (source: QcListSource, status: QcStatusTab) => QcListingState;
  setListing: (
    source: QcListSource,
    status: QcStatusTab,
    updater: SetStateAction<QcListingState>,
  ) => void;
  /** Pending/Completed selection scoped to each source tab. */
  getStatusForSource: (source: QcListSource) => QcStatusTab;
  setStatusForSource: (source: QcListSource, status: QcStatusTab) => void;
};

const QcListingStateContext =
  createContext<QcListingStateContextValue | null>(null);

export function QcListingStateProvider({ children }: { children: ReactNode }) {
  const [listingBySource, setListingBySource] = useState(
    createInitialListingBySource,
  );
  const [statusBySource, setStatusBySource] = useState(
    createInitialStatusBySource,
  );

  const getListing = useCallback(
    (source: QcListSource, status: QcStatusTab) =>
      listingBySource[source][status],
    [listingBySource],
  );

  const setListing = useCallback(
    (
      source: QcListSource,
      status: QcStatusTab,
      updater: SetStateAction<QcListingState>,
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
    (source: QcListSource) => statusBySource[source],
    [statusBySource],
  );

  const setStatusForSource = useCallback(
    (source: QcListSource, status: QcStatusTab) => {
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
    <QcListingStateContext.Provider value={value}>
      {children}
    </QcListingStateContext.Provider>
  );
}

export function useQcListingState(): QcListingStateContextValue {
  const ctx = useContext(QcListingStateContext);
  if (!ctx) {
    throw new Error(
      "useQcListingState must be used within QcListingStateProvider",
    );
  }
  return ctx;
}
