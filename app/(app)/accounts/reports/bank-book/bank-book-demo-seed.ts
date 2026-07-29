/**
 * Bank Book demo seed — delegates to client-review banking seed (idempotent).
 */

import { ensureClientReviewBankingSeed } from "@/lib/accounts/banking-client-review-seed";
import { scheduleDeferredDemoSeed } from "@/lib/accounts/deferred-demo-seed";

export function ensureBankBookDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;
  ensureClientReviewBankingSeed();
}

export function scheduleBankBookDemoOnPageLoad(): void {
  scheduleDeferredDemoSeed("bank-book-demo", ensureBankBookDemoOnPageLoad);
}
