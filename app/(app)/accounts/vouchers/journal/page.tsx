import { redirect } from "next/navigation";

/** Dedicated journal list URL redirects to the vouchers hub Journal tab (API-backed). */
export default function JournalVoucherPage() {
  redirect("/accounts/vouchers?tab=journal");
}
