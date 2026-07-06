import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CreditNoteViewPageClient = lazyAccountsPage(() => import("../../../credit-notes/CreditNoteViewPageClient"));

type PageProps = { params: { id: string } };

export default function CreditNoteViewPage({ params }: PageProps) {
  return <CreditNoteViewPageClient creditNoteId={Number(params.id)} />;
}
