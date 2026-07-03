import { redirect } from "next/navigation";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

/** Ledger maintenance lives in Chart of Accounts — no separate Ledger Master. */
export default function LedgersRedirectPage() {
  redirect(CHART_OF_ACCOUNTS_HREF);
}
