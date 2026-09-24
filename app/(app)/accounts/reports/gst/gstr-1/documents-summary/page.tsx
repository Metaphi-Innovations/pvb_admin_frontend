import { redirect } from "next/navigation";

/** Legacy localStorage GSTR-1 documents → API-backed GST Summary. */
export default function LegacyGstr1DocumentsRedirectPage() {
  redirect("/accounts/reports/gst-summary/gstr1/documents-summary");
}
