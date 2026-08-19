import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CreditNoteViewPageClient = lazyAccountsPage(() => import("../../../credit-notes/CreditNoteViewPageClient"));

type PageProps = { params: { id: string } };

export default function CreditNoteViewPage({ params }: PageProps) {
  const creditNoteId = params.id;
  return <CreditNoteViewPageClient creditNoteId={creditNoteId} />;
}
