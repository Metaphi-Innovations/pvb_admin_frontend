import { redirect } from "next/navigation";

export default function CustomerAgeingRedirectPage() {
  redirect("/accounts/receivables/outstanding?view=ageing");
}
