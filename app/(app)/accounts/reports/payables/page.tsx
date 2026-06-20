import { redirect } from "next/navigation";

export default function VendorOutstandingReportRedirect() {
  redirect("/accounts/payables/outstanding");
}
