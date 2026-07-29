import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankReconCompleteReviewPageClient = lazyAccountsPage(() =>
  import("@/app/(app)/accounts/bank-reconciliation/BankReconCompleteReviewPageClient"),
);

interface PageProps {
  params: { accountId: string };
}

export default function BankReconCompleteReviewPage({ params }: PageProps) {
  return <BankReconCompleteReviewPageClient accountId={params.accountId} />;
}
