import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PurchaseInvoiceViewClient = lazyAccountsPage(() => import("./PurchaseInvoiceViewClient"));

import { Suspense } from "react";

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
