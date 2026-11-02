"use client";

import { DispatchListingStateProvider } from "./dispatch-listing-state-context";

/**
 * Keeps Normal Sales / Sample / Stock Transfer / Purchase Return dispatch
 * listing filters in memory for the whole warehouse/dispatch route tree
 * (list ↔ create/view/edit). State clears when the user leaves this module.
 */
export default function DispatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DispatchListingStateProvider>{children}</DispatchListingStateProvider>
  );
}
