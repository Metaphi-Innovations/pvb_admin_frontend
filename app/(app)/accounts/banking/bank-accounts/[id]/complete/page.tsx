import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankAccountFormClient = lazyAccountsPage(() => import("../../BankAccountFormClient"));

export default async function CompleteBankAccountDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BankAccountFormClient mode="complete" ledgerId={id} />;
}
