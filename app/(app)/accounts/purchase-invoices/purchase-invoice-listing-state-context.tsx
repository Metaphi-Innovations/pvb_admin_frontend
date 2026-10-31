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
import { resolveDateRangePreset, type DateRangePresetId } from "@/lib/accounts/report-date-presets";
import type { PurchaseInvoiceListTabId } from "./purchase-invoice-nav";
import type { PurchaseNature, PurchaseSourceType } from "./purchase-invoice-types";

export type PurchaseSourceTypeFilter = "all" | PurchaseSourceType;
export type PurchaseNatureFilter = "all" | "inventory" | PurchaseNature;

export type PurchaseInvoicesTabState = {
  search: string;
  sourceTypeFilter: PurchaseSourceTypeFilter;
  purchaseNatureFilter: PurchaseNatureFilter;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
};

export type PurchaseGrnPendingTabState = {
  search: string;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
};

const LISTING_DEFAULT_PRESET: DateRangePresetId = "this_year";

export function createDefaultPurchaseInvoicesTabState(
  fyDates?: { from?: string; to?: string } | null,
): PurchaseInvoicesTabState {
  const presetDates = resolveDateRangePreset(LISTING_DEFAULT_PRESET);
  return {
    search: "",
    sourceTypeFilter: "all",
    purchaseNatureFilter: "all",
    page: 1,
    pageSize: 25,
    sortKey: "",
    sortDir: "asc",
    columnFilters: {},
    preset: LISTING_DEFAULT_PRESET,
    dateFrom: fyDates?.from || presetDates.from,
    dateTo: fyDates?.to || presetDates.to,
  };
}

export function createDefaultPurchaseGrnPendingTabState(): PurchaseGrnPendingTabState {
  return {
    search: "",
    page: 1,
    pageSize: 25,
    sortKey: "",
    sortDir: "asc",
    columnFilters: {},
  };
}

type PurchaseInvoiceListingStateContextValue = {
  activeTab: PurchaseInvoiceListTabId;
  setActiveTab: (tab: PurchaseInvoiceListTabId) => void;
  invoicesTab: PurchaseInvoicesTabState;
  setInvoicesTab: Dispatch<SetStateAction<PurchaseInvoicesTabState>>;
  grnTab: PurchaseGrnPendingTabState;
  setGrnTab: Dispatch<SetStateAction<PurchaseGrnPendingTabState>>;
};

const PurchaseInvoiceListingStateContext =
  createContext<PurchaseInvoiceListingStateContextValue | null>(null);

export function PurchaseInvoiceListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeTab, setActiveTabState] =
    useState<PurchaseInvoiceListTabId>("invoices");
  const [invoicesTab, setInvoicesTab] = useState(createDefaultPurchaseInvoicesTabState);
  const [grnTab, setGrnTab] = useState(createDefaultPurchaseGrnPendingTabState);

  const setActiveTab = (tab: PurchaseInvoiceListTabId) => {
    setActiveTabState((prev) => (prev === tab ? prev : tab));
  };

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      invoicesTab,
      setInvoicesTab,
      grnTab,
      setGrnTab,
    }),
    [activeTab, invoicesTab, grnTab],
  );

  return (
    <PurchaseInvoiceListingStateContext.Provider value={value}>
      {children}
    </PurchaseInvoiceListingStateContext.Provider>
  );
}

export function usePurchaseInvoiceListingState(): PurchaseInvoiceListingStateContextValue {
  const ctx = useContext(PurchaseInvoiceListingStateContext);
  if (!ctx) {
    throw new Error(
      "usePurchaseInvoiceListingState must be used within PurchaseInvoiceListingStateProvider",
    );
  }
  return ctx;
}
