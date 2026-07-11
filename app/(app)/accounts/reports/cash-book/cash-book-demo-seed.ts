/**
 * Cash Book demo seed — delegates to client-review banking seed (idempotent).
 */

import { ensureClientReviewBankingSeed } from "@/lib/accounts/banking-client-review-seed";
import { scheduleDeferredDemoSeed } from "@/lib/accounts/deferred-demo-seed";

export function ensureCashBookDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;
  ensureClientReviewBankingSeed();
}

export function scheduleCashBookDemoOnPageLoad(): void {
  scheduleDeferredDemoSeed("cash-book-demo", ensureCashBookDemoOnPageLoad);
}
