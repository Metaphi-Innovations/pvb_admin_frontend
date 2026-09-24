import { redirect } from "next/navigation";

/** Legacy localStorage GSTR-1 credit/debit notes → API-backed GST Summary. */
export default function LegacyGstr1CreditDebitRedirectPage() {
  redirect("/accounts/reports/gst-summary/gstr1/credit-debit-notes");
}
