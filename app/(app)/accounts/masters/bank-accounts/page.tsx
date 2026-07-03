import { redirect } from "next/navigation";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

/** Bank ledgers are maintained under Chart of Accounts — no separate Bank Accounts master. */
export default function MastersBankAccountsPage() {
  redirect(CHART_OF_ACCOUNTS_HREF);
}
