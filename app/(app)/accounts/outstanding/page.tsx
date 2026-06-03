import { redirect } from "next/navigation";

export default function LegacyOutstandingRedirect() {
  redirect("/accounts/reports/trial-balance");
}
