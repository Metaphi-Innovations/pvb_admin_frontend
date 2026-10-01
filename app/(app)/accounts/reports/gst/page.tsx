import { redirect } from "next/navigation";

export default function LegacyGstSummaryRedirectPage() {
  redirect("/accounts/reports/gst-summary");
}
