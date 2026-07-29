import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PurchaseInvoiceFormPageClient = lazyAccountsPage(() => import("../PurchaseInvoiceFormPageClient"));

import { Suspense } from "react";

export default function NewPurchaseInvoicePage() {
  return (
    <Suspense>
      <PurchaseInvoiceFormPageClient />
    </Suspense>
  );
}
