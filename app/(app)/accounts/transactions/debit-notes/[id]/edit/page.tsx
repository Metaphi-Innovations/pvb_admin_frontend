import DebitNoteFormPageClient from "../../../../debit-notes/DebitNoteFormPageClient";

type PageProps = { params: { id: string } };

export default function EditDebitNotePage({ params }: PageProps) {
  return <DebitNoteFormPageClient debitNoteId={Number(params.id)} />;
}
