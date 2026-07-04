import DebitNoteFormPageClient from "../../../debit-notes/DebitNoteFormPageClient";

type PageProps = {
  searchParams?: { returnId?: string; mode?: string };
};

export default function NewDebitNotePage({ searchParams }: PageProps) {
  return (
    <DebitNoteFormPageClient
      returnId={searchParams?.returnId ? Number(searchParams.returnId) : undefined}
      mode={searchParams?.mode === "fresh" ? "fresh" : searchParams?.returnId ? "return" : undefined}
    />
  );
}
