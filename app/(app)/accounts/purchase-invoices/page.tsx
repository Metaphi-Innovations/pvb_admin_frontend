import { Suspense } from "react";
import PurchaseInvoiceListClient from "./PurchaseInvoiceListClient";

export default function PurchaseInvoicesPage() {
  return (
    <Suspense>
      <PurchaseInvoiceListClient />
    </Suspense>
  );
}
