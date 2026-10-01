import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PurchaseInvoiceListClient = lazyAccountsPage(() => import("./PurchaseInvoiceListClient"));

import { Suspense } from "react";

export default function PurchaseInvoicesPage() {
  return (
    <Suspense>
      <PurchaseInvoiceListClient />
    </Suspense>
  );
}
