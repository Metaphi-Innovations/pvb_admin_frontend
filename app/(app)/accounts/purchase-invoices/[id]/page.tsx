import { Suspense } from "react";
import PurchaseInvoiceViewClient from "./PurchaseInvoiceViewClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PurchaseInvoiceViewPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense>
      <PurchaseInvoiceViewClient invoiceId={Number(id)} />
    </Suspense>
  );
}
