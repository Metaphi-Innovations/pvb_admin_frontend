import { Suspense } from "react";
import PurchaseInvoiceFormPageClient from "../PurchaseInvoiceFormPageClient";

export default function NewPurchaseInvoicePage() {
  return (
    <Suspense>
      <PurchaseInvoiceFormPageClient />
    </Suspense>
  );
}
