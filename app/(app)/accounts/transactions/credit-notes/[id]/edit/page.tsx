import CreditNoteFormPageClient from "../../../../credit-notes/CreditNoteFormPageClient";

type PageProps = { params: { id: string } };

export default function EditCreditNotePage({ params }: PageProps) {
  return <CreditNoteFormPageClient creditNoteId={Number(params.id)} />;
}
