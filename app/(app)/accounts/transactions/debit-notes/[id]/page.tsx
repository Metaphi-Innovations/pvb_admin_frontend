import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const DebitNoteViewPageClient = lazyAccountsPage(() => import("../../../debit-notes/DebitNoteViewPageClient"));

type PageProps = { params: { id: string } };

export default function DebitNoteViewPage({ params }: PageProps) {
  return <DebitNoteViewPageClient debitNoteId={Number(params.id)} />;
}
