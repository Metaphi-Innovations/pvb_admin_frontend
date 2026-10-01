import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankAccountDetailClient = lazyAccountsPage(() => import("../BankAccountDetailClient"));

export default async function BankAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BankAccountDetailClient accountId={Number(id)} />;
}
