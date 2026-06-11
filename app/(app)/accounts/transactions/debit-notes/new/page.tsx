import { redirect } from "next/navigation";

export default function LegacyRedirect() {
  redirect("/accounts/vouchers?tab=debit-note&mode=new");
}
