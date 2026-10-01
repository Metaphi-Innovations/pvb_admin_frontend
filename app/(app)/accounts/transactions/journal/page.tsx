import { redirect } from "next/navigation";
import { JOURNAL_VOUCHER_HREF } from "@/lib/accounts/accounts-nav";

export default function LegacyJournalPage() {
  redirect(JOURNAL_VOUCHER_HREF);
}
