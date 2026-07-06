import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const HrClaimsAccountsClient = lazyAccountsPage(() => import("../purchases/hr-claims/HrClaimsAccountsClient"));

import { Suspense } from "react";

export default function ClaimsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading claims…</div>}>
      <HrClaimsAccountsClient />
    </Suspense>
  );
}
