import { redirect } from "next/navigation";

export default function PayablesRedirect() {
  redirect("/accounts/reports");
}
