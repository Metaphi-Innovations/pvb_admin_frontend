import { redirect } from "next/navigation";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

/** Legacy Ledger Master detail — redirects to Chart of Accounts with ledger selected. */
export default function LegacyLedgerDetailRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`${CHART_OF_ACCOUNTS_HREF}?node=${params.id}`);
}
