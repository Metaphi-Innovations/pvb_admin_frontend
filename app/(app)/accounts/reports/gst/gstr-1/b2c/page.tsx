import { redirect } from "next/navigation";

/** Legacy localStorage GSTR-1 B2C → API-backed GST Summary. */
export default function LegacyGstr1B2cRedirectPage() {
  redirect("/accounts/reports/gst-summary/gstr1/b2c");
}
