import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ExpenseViewPageClient = lazyAccountsPage(() => import("../../../expenses/ExpenseViewPageClient"));

type PageProps = { params: { id: string } };

export default function ExpenseViewPage({ params }: PageProps) {
  return <ExpenseViewPageClient paymentId={Number(params.id)} />;
}
