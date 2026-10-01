import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const DebitNoteFormPageClient = lazyAccountsPage(() => import("../../../debit-notes/DebitNoteFormPageClient"));

type PageProps = {
  searchParams?: { returnId?: string; mode?: string; purchaseInvoiceId?: string };
};

export default function NewDebitNotePage({ searchParams }: PageProps) {
  const purchaseInvoiceId = searchParams?.purchaseInvoiceId
    ? Number(searchParams.purchaseInvoiceId)
    : undefined;

  return (
    <DebitNoteFormPageClient
      returnId={searchParams?.returnId ? Number(searchParams.returnId) : undefined}
      purchaseInvoiceId={Number.isFinite(purchaseInvoiceId) ? purchaseInvoiceId : undefined}
      mode={
        searchParams?.mode === "fresh"
          ? "fresh"
          : searchParams?.purchaseInvoiceId
            ? "purchase_invoice"
            : searchParams?.returnId
              ? "return"
              : undefined
      }
    />
  );
}
