import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankAccountFormClient = lazyAccountsPage(() => import("../../BankAccountFormClient"));

export default async function EditBankAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BankAccountFormClient accountId={Number(id)} />;
}
