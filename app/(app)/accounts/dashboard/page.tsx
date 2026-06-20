import { redirect } from "next/navigation";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

export default function AccountsDashboardPage() {
  redirect(CHART_OF_ACCOUNTS_HREF);
}
