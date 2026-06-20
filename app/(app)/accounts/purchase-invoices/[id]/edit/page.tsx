import { Suspense } from "react";
import PurchaseInvoiceFormPageClient from "../../PurchaseInvoiceFormPageClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPurchaseInvoicePage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense>
      <PurchaseInvoiceFormPageClient invoiceId={Number(id)} />
    </Suspense>
  );
}
