"use client";

import { createLazyClientPage } from "@/lib/createLazyClientPage";
import type { TxnType } from "./data";

const LazyTxn = createLazyClientPage(() => import("./components/TransactionPageClient"));

export function createTxnPage(txnType: TxnType, title: string, partyLabel: string) {
  return function TxnRoutePage() {
    return <LazyTxn txnType={txnType} title={title} partyLabel={partyLabel} />;
  };
}
