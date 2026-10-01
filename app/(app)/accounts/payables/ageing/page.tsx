import { redirect } from "next/navigation";

export default function VendorAgeingRedirectPage() {
  redirect("/accounts/payables/outstanding?view=ageing");
}
