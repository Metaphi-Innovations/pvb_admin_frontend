import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const VouchersHubPageClient = lazyAccountsPage(
  () => import("@/app/(app)/accounts/vouchers/VouchersHubPageClient"),
  { pathnameHint: "/accounts/vouchers" },
);

import { Suspense } from "react";

export default function VouchersHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <VouchersHubPageClient />
    </Suspense>
  );
}
