import { Suspense } from "react";
import CreditNoteFormPageClient from "../../../../credit-notes/CreditNoteFormPageClient";

type PageProps = { params: { id: string } };

export default function EditCreditNotePage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading credit note form…</div>}>
      <CreditNoteFormPageClient creditNoteId={Number(params.id)} />
    </Suspense>
  );
}
