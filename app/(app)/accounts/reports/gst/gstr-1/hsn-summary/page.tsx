import { redirect } from "next/navigation";

/** Legacy localStorage GSTR-1 HSN → API-backed GST Summary. */
export default function LegacyGstr1HsnRedirectPage() {
  redirect("/accounts/reports/gst-summary/gstr1/hsn-summary");
}
