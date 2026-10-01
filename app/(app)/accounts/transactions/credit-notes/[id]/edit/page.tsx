import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CreditNoteFormPageClient = lazyAccountsPage(() => import("../../../../credit-notes/CreditNoteFormPageClient"));

import { Suspense } from "react";

type PageProps = { params: { id: string } };

export default function EditCreditNotePage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading credit note form…</div>}>
      <CreditNoteFormPageClient creditNoteId={Number(params.id)} />
    </Suspense>
  );
}
