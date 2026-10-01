import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PurchaseInvoiceFormPageClient = lazyAccountsPage(() => import("../../PurchaseInvoiceFormPageClient"));

import { Suspense } from "react";

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
