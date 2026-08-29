import PurchaseInvoiceListClient from "./PurchaseInvoiceListClient";

import { Suspense } from "react";

export default function PurchaseInvoicesPage() {
  return (
    <Suspense>
      <PurchaseInvoiceListClient />
    </Suspense>
  );
}
