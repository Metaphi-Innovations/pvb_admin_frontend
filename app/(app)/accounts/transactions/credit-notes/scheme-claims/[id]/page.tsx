import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const SchemeClaimReviewPageClient = lazyAccountsPage(
  () => import("../../../../credit-notes/SchemeClaimReviewPageClient"),
);

type PageProps = { params: { id: string } };

export default function SchemeClaimReviewPage({ params }: PageProps) {
  return <SchemeClaimReviewPageClient entitlementId={decodeURIComponent(params.id)} />;
}
