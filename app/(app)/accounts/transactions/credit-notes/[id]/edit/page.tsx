import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { Suspense } from "react";

const CreditNoteFormPageClient = lazyAccountsPage(() => import("../../../../credit-notes/CreditNoteFormPageClient"));

type PageProps = { params: { id: string } };

export default function EditCreditNotePage({ params }: PageProps) {
  void params.id;
  return (
    <Suspense fallback={null}>
      <CreditNoteFormPageClient />
    </Suspense>
  );
}
