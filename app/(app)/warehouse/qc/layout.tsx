"use client";

import { QcListingStateProvider } from "./qc-listing-state-context";

/**
 * Keeps Purchase / Stock Transfer / Sales Return / Sample Return QC listing
 * filters (including Pending / Completed) in memory for the whole warehouse/qc
 * route tree (list ↔ create/view). State clears when the user leaves this module.
 */
export default function QcLayout({ children }: { children: React.ReactNode }) {
  return <QcListingStateProvider>{children}</QcListingStateProvider>;
}
