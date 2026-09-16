import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { Suspense } from "react";

const DebitNoteViewPageClient = lazyAccountsPage(() => import("../../../debit-notes/DebitNoteViewPageClient"));

type PageProps = { params: { id: string } };

export default function DebitNoteViewPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <DebitNoteViewPageClient debitNoteId={params.id} />
    </Suspense>
  );
}
