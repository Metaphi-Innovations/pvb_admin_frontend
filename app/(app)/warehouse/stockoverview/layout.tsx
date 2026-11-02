"use client";

import { StockOverviewListingStateProvider } from "./stock-overview-listing-state-context";

/**
 * Keeps Daily Logs / Batch Movements / Inventory / Sales Return / Sample Return /
 * Rejected listing filters (and the shared warehouse selector) in memory for the
 * whole warehouse/stockoverview route tree (list ↔ view).
 * State clears when the user leaves this module.
 */
export default function StockOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StockOverviewListingStateProvider>
      {children}
    </StockOverviewListingStateProvider>
  );
}
