import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const AccountItemFormClient = lazyAccountsPage(() => import("../../AccountItemFormClient"));

type PageProps = { params: { id: string } };

export default function EditAccountItemPage({ params }: PageProps) {
  return <AccountItemFormClient itemId={Number(params.id)} />;
}
