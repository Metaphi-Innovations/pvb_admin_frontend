"use client";

import { StockOverviewListingStateProvider } from "../stockoverview/stock-overview-listing-state-context";

/**
 * Canonical route is /warehouse/stock-overview (nav). Implementation lives under
 * ../stockoverview; this layout keeps listing filters in memory for list ↔ view.
 */
export default function StockOverviewRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StockOverviewListingStateProvider>{children}</StockOverviewListingStateProvider>
  );
}
