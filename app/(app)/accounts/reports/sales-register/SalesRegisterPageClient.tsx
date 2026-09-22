"use client";

import SalesRegisterApiPageClient from "./SalesRegisterApiPageClient";

/**
 * Production Sales Register — server-backed report.
 * Does not use localStorage / buildSalesRegisterDemoRows.
 */
export default function SalesRegisterPageClient() {
  return <SalesRegisterApiPageClient />;
}
