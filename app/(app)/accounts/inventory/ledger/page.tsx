import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InventoryLedgerPageClient = lazyAccountsPage(() => import("./InventoryLedgerPageClient"));

import { Suspense } from "react";

export default function InventoryLedgerPage() {
  return (
    <Suspense fallback={null}>
      <InventoryLedgerPageClient />
    </Suspense>
  );
}
