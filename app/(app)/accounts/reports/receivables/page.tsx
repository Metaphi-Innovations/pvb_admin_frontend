import { redirect } from "next/navigation";

export default function CustomerOutstandingReportRedirect() {
  redirect("/accounts/receivables/outstanding");
}
