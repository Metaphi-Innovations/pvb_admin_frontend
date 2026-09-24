import { redirect } from "next/navigation";

/** Legacy localStorage GSTR-1 B2B → API-backed GST Summary. */
export default function LegacyGstr1B2bRedirectPage() {
  redirect("/accounts/reports/gst-summary/gstr1/b2b");
}
