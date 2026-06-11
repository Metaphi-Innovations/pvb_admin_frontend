import { redirect } from "next/navigation";
import { ACCOUNTS_HOME_HREF } from "@/lib/accounts/accounts-nav";

export default function SettingsRedirect() {
  redirect(ACCOUNTS_HOME_HREF);
}
