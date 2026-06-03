import { redirect } from "next/navigation";

export default function LegacyVouchersRedirect() {
  redirect("/accounts/transactions/journal");
}
