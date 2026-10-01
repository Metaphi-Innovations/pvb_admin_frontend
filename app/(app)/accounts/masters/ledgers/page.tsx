import { redirect } from "next/navigation";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

/** Legacy Ledger Master listing — redirects to Chart of Accounts. */
export default function LegacyLedgersRedirect({
  searchParams,
}: {
  searchParams?: { edit?: string };
}) {
  if (searchParams?.edit) {
    redirect(`${CHART_OF_ACCOUNTS_HREF}?edit=${searchParams.edit}`);
  }
  redirect(CHART_OF_ACCOUNTS_HREF);
}
