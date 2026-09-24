import { redirect } from "next/navigation";

/** Legacy localStorage GSTR-1 nil-rated → API-backed GST Summary. */
export default function LegacyGstr1NilRatedRedirectPage() {
  redirect("/accounts/reports/gst-summary/gstr1/nil-rated-exempt");
}
