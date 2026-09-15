import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { Suspense } from "react";

const DebitNoteFormPageClient = lazyAccountsPage(() => import("../../../../debit-notes/DebitNoteFormPageClient"));

type PageProps = { params: { id: string } };

export default function EditDebitNotePage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <DebitNoteFormPageClient debitNoteId={params.id as any} />
    </Suspense>
  );
}
