"use client";

import PurchaseRegisterApiPageClient from "./PurchaseRegisterApiPageClient";

/**
 * Production Purchase Register — server-backed report (PR-3).
 * Does not use localStorage / buildPurchaseRegisterRows / client GSTR-2B builder.
 */
export default function PurchaseRegisterPageClient() {
  return <PurchaseRegisterApiPageClient />;
}
